'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  id: string;
  name: string;
  country?: string | null;
  latitude: number;
  longitude: number;
}

export default function WorldMap({ clubs }: { clubs: MapPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { worldCopyJump: true, scrollWheelZoom: false }).setView(
      [20, 0],
      2,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const bounds: L.LatLngExpression[] = [];
    for (const c of clubs) {
      if (c.latitude && c.longitude) {
        const p: L.LatLngExpression = [c.latitude, c.longitude];
        bounds.push(p);
        L.circleMarker(p, {
          radius: 4,
          color: '#0f766e',
          fillColor: '#0f766e',
          fillOpacity: 0.7,
          weight: 1,
        })
          .bindPopup(
            `<b>${c.name}</b>${c.country ? '<br/>' + c.country : ''}<br/><a href="/clubs/${c.id}">Ver perfil &rarr;</a>`,
          )
          .addTo(map);
      }
    }
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
    return () => {
      map.remove();
    };
  }, [clubs]);

  return (
    <div
      ref={ref}
      className="h-[70vh] w-full rounded-2xl border border-border/50 overflow-hidden"
    />
  );
}
