'use client';
/**
 * WS-C-3 FASE 3/4 — Canvas Leaflet do mapa interno.
 * Base = GeoJSON Natural Earth LOCAL (domínio público) — SEM tiles externos.
 * Interação (despacho do Operador 10-04): clicar em um PAÍS seleciona o país
 * (fecha o zoom nele) e revela os clubes; cada CLUBE é um ponto clicável com
 * nome + link para o perfil. O mapa é ACESSÓRIO (role="img"): a lista em
 * `GeoMapInternal` segue sendo o caminho principal.
 */
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface CanvasClubPoint {
  id: string;
  name: string;
  subtitle: string | null;
  lat: number;
  lng: number;
}

/** ISO-2 confiável a partir das propriedades Natural Earth (France/Norway têm ISO_A2="-99"). */
function isoFromProps(props: Record<string, unknown>): string | null {
  const cand = [props.ISO_A2_EH, props.ISO_A2, props.WB_A2]
    .map((v) => (typeof v === 'string' ? v.trim().toUpperCase() : ''))
    .find((v) => /^[A-Z]{2}$/.test(v));
  return cand ?? null;
}

const BASE_STYLE: L.PathOptions = {
  color: '#94a3b8',
  weight: 0.5,
  fillColor: '#e5e7eb',
  fillOpacity: 0.6,
};

const SELECTED_STYLE: L.PathOptions = {
  color: '#0f766e',
  weight: 1.5,
  fillColor: '#99f6e4',
  fillOpacity: 0.45,
};

export default function GeoMapCanvas({
  points,
  selectedCountry,
  onCountrySelect,
}: {
  points: CanvasClubPoint[];
  selectedCountry?: string | null;
  onCountrySelect?: (iso2: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const countryLayersRef = useRef<Map<string, L.GeoJSON>>(new Map());
  const onCountrySelectRef = useRef(onCountrySelect);
  onCountrySelectRef.current = onCountrySelect;
  const selectedCountryRef = useRef(selectedCountry);
  selectedCountryRef.current = selectedCountry;
  const [mapReady, setMapReady] = useState(false);

  // Destaca o polígono do país selecionado e fecha o zoom nele. Aplicado por
  // COMPARAÇÃO sobre toda a base e com try/catch por layer: um layer em estado
  // inválido (mapa em teardown) não pode abortar o resto — a mesma função é
  // reexecutada quando a base (re)carrega, então o highlight se auto-cura.
  const applySelection = (): void => {
    const map = mapRef.current;
    if (!map) return;
    const target = selectedCountryRef.current ? selectedCountryRef.current.toUpperCase() : null;
    let didFit = false;
    for (const [iso, layer] of countryLayersRef.current) {
      try {
        if (target && iso === target) {
          layer.setStyle(SELECTED_STYLE);
          if (!didFit) {
            const bounds = layer.getBounds?.();
            if (bounds?.isValid()) {
              map.fitBounds(bounds, { padding: [24, 24], maxZoom: 6 });
              didFit = true;
            }
          }
        } else {
          layer.setStyle(BASE_STYLE);
        }
      } catch {
        /* layer em teardown — o próximo render corrige */
      }
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    // BUG "mapa invisível": L.map() lê o tamanho do container UMA única vez; se
    // o layout ainda não assentou (chunk/CSS dinâmico no mesmo tick), o renderer
    // nasce com bounds degenerados e TODOS os paths são projetados para "M0 0".
    // invalidateSize NÃO corrige depois (é no-op quando o tamanho não muda) —
    // então o mapa só é criado quando o container tem dimensão real.
    const tryInit = (): void => {
      if (cancelled || mapRef.current || !ref.current) return;
      const { width, height } = ref.current.getBoundingClientRect();
      if (width < 50 || height < 50) return;
      // Interação explícita: pan por drag/touch, zoom por roda/botões/duplo-
      // clique/pinch e pan por teclado (setas) quando o mapa recebe foco.
      const map = L.map(ref.current, {
        // Zoom por roda (despacho do Operador 10-04): roda sobre o mapa
        // aproxima/afasta; fora do mapa a roda continua rolando a página.
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        keyboard: true,
        worldCopyJump: true,
        attributionControl: false,
      }).setView([20, 0], 2);
      mapRef.current = map;
      // Guard: após teardown, um RO órfão não pode invalidateSize num mapa morto
      // (estourava "_leaflet_pos" de undefined e derrubava o subtree).
      const roPost = new ResizeObserver(() => {
        if (mapRef.current === map) map.invalidateSize();
      });
      roPost.observe(ref.current);
      requestAnimationFrame(() => {
        if (mapRef.current === map) map.invalidateSize();
      });
      setMapReady(true);
      ro?.disconnect();
    };
    tryInit();
    if (!mapRef.current) {
      ro = new ResizeObserver(() => tryInit());
      ro.observe(el);
      requestAnimationFrame(() => tryInit());
    }
    return () => {
      cancelled = true;
      ro?.disconnect();
      markersRef.current = null;
      countryLayersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Base dos países: clicar em um país seleciona (callback) — o efeito de
  // seleção abaixo fecha o zoom nele.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    fetch('/geo/ne_110m_admin_0_countries.geojson')
      .then((r) => r.json())
      .then((geo: unknown) => {
        if (cancelled || !mapRef.current) return;
        const layer = L.geoJSON(geo as never, {
          style: BASE_STYLE,
          onEachFeature: (feature, fLayer) => {
            const props = (feature?.properties ?? {}) as Record<string, unknown>;
            const iso = isoFromProps(props);
            if (!iso) return;
            countryLayersRef.current.set(iso, fLayer as L.GeoJSON);
            (fLayer as L.Path).on('click', () => onCountrySelectRef.current?.(iso));
          },
        }).addTo(map);
        // Se um país já estava selecionado quando a base (re)carregou — remount,
        // troca de país rápida — o highlight é aplicado aqui (self-healing).
        // eslint-disable-next-line react-hooks/exhaustive-deps -- idem
        applySelection();
      })
      .catch(() => {
        /* base indisponível localmente — sem inventar */
      });
    return () => {
      cancelled = true;
      countryLayersRef.current.clear();
    };
  }, [mapReady]);

  // Pontos de clube: um marcador por clube, popup com nome + link do perfil
  // (conteúdo montado via textContent — nunca innerHTML com dado do acervo).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    markersRef.current = group;
    for (const p of points) {
      const el = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = p.name;
      el.appendChild(name);
      if (p.subtitle) {
        const sub = document.createElement('div');
        sub.textContent = p.subtitle;
        sub.style.fontSize = '12px';
        sub.style.color = '#64748b';
        el.appendChild(sub);
      }
      const a = document.createElement('a');
      a.href = `/clubs/${p.id}`;
      a.textContent = 'Ver clube →';
      a.style.display = 'inline-block';
      a.style.marginTop = '4px';
      el.appendChild(a);
      L.circleMarker([p.lat, p.lng], {
        radius: 5,
        color: '#0f766e',
        weight: 1,
        fillColor: '#2dd4bf',
        fillOpacity: 0.85,
      })
        .bindPopup(el)
        .addTo(group);
    }
  }, [points, mapReady]);

  // País selecionado (via select ou clique no mapa).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- applySelection só lê refs
  useEffect(() => {
    applySelection();
  }, [selectedCountry, mapReady]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Mapa (acessório). A lista abaixo é o caminho principal."
      className="h-[55vh] w-full rounded-2xl overflow-hidden border border-border bg-muted/30"
    />
  );
}
