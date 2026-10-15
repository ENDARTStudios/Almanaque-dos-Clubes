'use client';
/**
 * WS-C-3 FASE 3/4 — Canvas Leaflet do mapa interno.
 * Base cartográfica = tiles OpenStreetMap (estados/cidades visíveis — despacho
 * do Operador 10-05; CSP já autoriza os subdomínios a/b/c do OSM e a
 * atribuição ODbL está na seção "Fontes deste mapa"). O GeoJSON Natural Earth
 * LOCAL (domínio público) fica numa pane PRÓPRIA abaixo dos marcadores e serve
 * de camada de clique/seleção de país.
 * Interação: clicar em um PAÍS seleciona (fecha o zoom nele) e revela os
 * clubes; cada CLUBE é um ponto clicável com nome + link para o perfil.
 * O mapa é ACESSÓRIO (role="img"): a lista em `GeoMapInternal` segue sendo o
 * caminho principal.
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

// Sobre os tiles OSM o preenchimento é quase transparente — o detalhe
// (estados/cidades) tem que aparecer; a borda é o que guia o clique.
const BASE_STYLE: L.PathOptions = {
  color: '#64748b',
  weight: 0.7,
  fillColor: '#94a3b8',
  fillOpacity: 0.08,
};

const SELECTED_STYLE: L.PathOptions = {
  color: '#0f766e',
  weight: 1.8,
  fillColor: '#2dd4bf',
  fillOpacity: 0.18,
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
  /* Os "latest refs" de callback e seleção. A escrita saiu do CORPO do componente para um
     efeito: `ref.current = prop` durante o render é mutação em render, que o React Compiler
     proíbe (`react-hooks/refs`) — e o lint do `apps/web` só passou a rodar no CI agora, então
     isso nunca tinha sido apontado.
     Mover é seguro porque os DOIS pontos de leitura acontecem depois do commit: um dentro de
     outro efeito (`applySelection`) e outro no handler de clique do Leaflet, que só dispara
     por interação. Nenhum dos dois lê durante o render. */
  const onCountrySelectRef = useRef(onCountrySelect);
  const selectedCountryRef = useRef(selectedCountry);
  useEffect(() => {
    onCountrySelectRef.current = onCountrySelect;
    selectedCountryRef.current = selectedCountry;
  }, [onCountrySelect, selectedCountry]);
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
    // Capturado no corpo do efeito, e não lido no cleanup. A regra `react-hooks/exhaustive-deps`
    // avisa que `ref.current` pode ter mudado quando a limpeza roda — aqui o objeto é ESTÁVEL
    // (o `useRef` é criado uma vez e o Map nunca é trocado), então a leitura seria segura; mas
    // capturar é a forma que não depende de raciocínio sobre estabilidade, e o custo é zero.
    const countryLayers = countryLayersRef.current;
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
      // Tiles OSM = base cartográfica detalhada (estados, cidades, vias).
      // Atribuição exigida pela ODbL exibida na seção "Fontes deste mapa".
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
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
      countryLayers.clear();
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
    const countryLayers = countryLayersRef.current;
    fetch('/geo/ne_110m_admin_0_countries.geojson')
      .then((r) => r.json())
      .then((geo: unknown) => {
        if (cancelled || !mapRef.current) return;
        // Pane própria ABAIXO da overlayPane (z 350 < 400): os países ficam
        // sempre DEBAIXO dos marcadores independente da ordem de chegada dos
        // fetches — antes, se a base terminava depois dos pontos, ela pintava
        // por cima e bloqueava os cliques das bolinhas.
        if (!map.getPane('countries')) {
          const pane = map.createPane('countries');
          pane.style.zIndex = '350';
          pane.style.pointerEvents = 'auto';
        }
        // Sem vincular a uma variável: `countryLayersRef` já guarda CADA camada de país, e a
        // limpeza acontece por `countryLayersRef.current.clear()` mais o `map.remove()` do
        // efeito de montagem. O binding não era lido em lugar nenhum — quem apontou foi o lint
        // do `apps/web`, que até então não rodava no CI.
        L.geoJSON(geo as never, {
          pane: 'countries',
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
         
        applySelection();
      })
      .catch(() => {
        /* base indisponível localmente — sem inventar */
      });
    return () => {
      cancelled = true;
      countryLayers.clear();
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
   
  useEffect(() => {
    applySelection();
  }, [selectedCountry, mapReady]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Mapa (acessório). A lista abaixo é o caminho principal."
      className="h-[55vh] w-full overflow-hidden rounded-2xl border border-border bg-muted"
    />
  );
}
