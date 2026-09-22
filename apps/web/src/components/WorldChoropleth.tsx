'use client';
/**
 * T467 — Choropleth de países (Leaflet + GeoJSON Natural Earth, domínio público).
 * Núcleo = contagem por região (derivada do T466); pino NÃO é o núcleo.
 * O mapa é acessório: a navegação por teclado/leitor de tela é feita na LISTA
 * de regiões do MapExplorer (o div do mapa é aria-hidden, role=img com label).
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type GeoFeature = { properties: Record<string, unknown> };

interface Props {
  countsByIso2: Record<string, number>;
  activeCountry: string | null;
  fitTo: string[] | null;
  onSelectCountry: (iso2: string) => void;
}

const isoOf = (f: GeoFeature): string => {
  const p = f.properties;
  const eh = p['ISO_A2_EH'] as string | undefined;
  const a2 = p['ISO_A2'] as string | undefined;
  return eh && eh !== '-99' ? eh : (a2 ?? '');
};

export default function WorldChoropleth({
  countsByIso2,
  activeCountry,
  fitTo,
  onSelectCountry,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  // refs para o estilo ler o estado atual sem recriar o mapa
  const countsRef = useRef(countsByIso2);
  const activeRef = useRef(activeCountry);
  countsRef.current = countsByIso2;
  activeRef.current = activeCountry;

  function styleFor(f: GeoFeature): L.PathOptions {
    const iso = isoOf(f);
    const n = countsRef.current[iso] ?? 0;
    const active = activeRef.current === iso;
    const fill = n === 0 ? '#e5e7eb' : n < 50 ? '#99f6e4' : n < 200 ? '#5eead4' : n < 500 ? '#2dd4bf' : '#0f766e';
    return { color: active ? '#0f172a' : '#94a3b8', weight: active ? 2.5 : 0.5, fillColor: fill, fillOpacity: 0.85 };
  }

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: false }).setView(
      [20, 0],
      2,
    );
    mapRef.current = map;
    let cancelled = false;
    fetch('/geo/ne_110m_admin_0_countries.geojson')
      .then((r) => r.json())
      .then((geo: { features: GeoFeature[] }) => {
        if (cancelled) return;
        layerRef.current = L.geoJSON(geo as never, {
          style: (f) => styleFor(f as GeoFeature),
          onEachFeature: (f, lyr) => {
            const feat = f as GeoFeature;
            const iso = isoOf(feat);
            const n = countsRef.current[iso] ?? 0;
            lyr.bindTooltip(`${String(feat.properties['NAME'] ?? iso)} — ${n}`);
            lyr.on('mouseover', () => (lyr as L.Path).setStyle({ weight: 2, color: '#0f766e' }));
            lyr.on('mouseout', () => (lyr as L.Path).setStyle(styleFor(feat)));
            lyr.on('click', () => {
              if (n > 0) onSelectCountry(iso);
            });
          },
        }).addTo(map);
      })
      .catch(() => {
        /* asset ausente => mapa vazio; a lista de regiões continua navegável */
      });
    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    layerRef.current?.eachLayer((l) => {
      const feat = (l as { feature?: GeoFeature }).feature;
      if (feat) (l as L.Path).setStyle(styleFor(feat));
    });
  }, [countsByIso2, activeCountry]);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current || !fitTo?.length) return;
    const b = L.latLngBounds([]);
    layerRef.current.eachLayer((l) => {
      const feat = (l as { feature?: GeoFeature }).feature;
      if (feat && fitTo.includes(isoOf(feat))) b.extend((l as L.Polygon).getBounds());
    });
    if (b.isValid()) mapRef.current.fitBounds(b, { padding: [20, 20] });
  }, [fitTo]);

  return (
    // Mapa DECORATIVO: aria-hidden. A navegação acessível é a lista de regiões
    // (aria-live/breadcrumb) com contagem — o mapa não é a única forma de navegar.
    <div
      ref={ref}
      aria-hidden="true"
      className="h-[55vh] sm:h-[60vh] w-full rounded-2xl border border-border/50 bg-slate-50"
    />
  );
}
