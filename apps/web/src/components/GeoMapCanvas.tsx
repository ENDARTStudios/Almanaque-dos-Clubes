'use client';
/**
 * WS-C-3 FASE 3 (local/off) — Canvas Leaflet do mapa interno.
 * Base = GeoJSON Natural Earth LOCAL (domínio público) — SEM tiles externos.
 * O mapa é ACESSÓRIO (role="img"): o caminho principal é a lista em `GeoMapInternal`.
 */
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface CanvasCluster {
  key: string;
  lat: number;
  lng: number;
  count: number;
}

export default function GeoMapCanvas({ clusters }: { clusters: CanvasCluster[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

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
      // Interação explícita: pan por drag/touch, zoom por botões/duplo-clique/
      // pinch e pan por teclado (setas) quando o mapa recebe foco.
      const map = L.map(ref.current, {
        scrollWheelZoom: false, // roda sobre o mapa rola a página (UX WS-C-3)
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        keyboard: true,
        worldCopyJump: true,
        attributionControl: false,
      }).setView([20, 0], 2);
      mapRef.current = map;
      const roPost = new ResizeObserver(() => map.invalidateSize());
      roPost.observe(ref.current);
      requestAnimationFrame(() => map.invalidateSize());
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
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    let cancelled = false;
    fetch('/geo/ne_110m_admin_0_countries.geojson')
      .then((r) => r.json())
      .then((geo: unknown) => {
        if (cancelled) return;
        L.geoJSON(geo as never, {
          style: { color: '#94a3b8', weight: 0.5, fillColor: '#e5e7eb', fillOpacity: 0.6 },
        }).addTo(layer);
        for (const c of clusters) {
          L.circleMarker([c.lat, c.lng], {
            radius: Math.min(24, 3 + Math.log2(c.count + 1) * 2),
            color: '#0f766e',
            fillColor: '#2dd4bf',
            fillOpacity: 0.8,
          })
            .addTo(layer)
            .bindTooltip(String(c.count));
        }
        // Re-projeção HARD após os dados: invalidateSize é no-op quando o
        // tamanho não muda, e redraw() só repinta as partes já projetadas —
        // nenhum dos dois corrige uma projeção degenerada. setView(center,
        // zoom) dispara viewreset INCONDICIONALMENTE, re-projetando todas as
        // camadas mesmo sem mudar nada na vista.
        map.invalidateSize();
        map.setView(map.getCenter(), map.getZoom(), { animate: false });
        layer.invoke('redraw');
      })
      .catch(() => {
        /* base indisponível localmente — sem inventar */
      });
    return () => {
      cancelled = true;
      layer.remove();
    };
  }, [clusters, mapReady]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Mapa (acessório). A lista abaixo é o caminho principal."
      className="h-[55vh] w-full rounded-2xl overflow-hidden border border-border bg-muted/30"
    />
  );
}
