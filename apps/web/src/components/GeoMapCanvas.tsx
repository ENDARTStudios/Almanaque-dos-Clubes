'use client';
/**
 * WS-C-3 FASE 3 (local/off) — Canvas Leaflet do mapa interno.
 * Base = GeoJSON Natural Earth LOCAL (domínio público) — SEM tiles externos.
 * O mapa é ACESSÓRIO (aria-hidden): o caminho principal é a lista em `GeoMapInternal`.
 */
import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    // Interação explícita: pan por drag/touch, zoom por roda/botões/duplo-clique
    // e pan por teclado (setas) quando o mapa recebe foco. Sem flags explícitas,
    // o mapa parece "travado": a roda não zooma e as setas não panneam.
    const map = L.map(ref.current, {
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      keyboard: true,
      worldCopyJump: true,
      attributionControl: false,
    }).setView([20, 0], 2);
    mapRef.current = map;
    // BUG "mapa invisível/travado": se o mapa inicializa antes do layout
    // estabilizar (fontes/CSS pendentes), o renderer projeta TODOS os paths
    // para "M0 0" (bounds degenerados de container 0×0) e nada é pintado —
    // só os botões de zoom funcionam. invalidateSize no primeiro frame +
    // ResizeObserver garante re-projeção quando o layout assenta.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(ref.current);
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
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
        // re-projeção explícita após os dados chegarem (o renderer pode ter
        // projetado com bounds inválidos se o mapa montou antes do layout)
        map.invalidateSize();
        layer.invoke('redraw');
      })
      .catch(() => {
        /* base indisponível localmente — sem inventar */
      });
    return () => {
      cancelled = true;
      layer.remove();
    };
  }, [clusters]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Mapa (acessório). A lista abaixo é o caminho principal."
      className="h-[55vh] w-full rounded-2xl overflow-hidden border border-border bg-muted/30"
    />
  );
}
