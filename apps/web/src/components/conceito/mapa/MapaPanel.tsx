'use client';
/**
 * O canvas do mapa, isolado num componente próprio por DUAS razões:
 *
 * 1. O Leaflet é carregado só no cliente (next/dynamic ssr:false) — a composição da ficha pode
 *    renderizar no servidor sem puxar 150 kB de mapa para o HTML inicial.
 * 2. O teste unitário da tela troca ESTE módulo por um dublê; o mapa de verdade continua sendo
 *    o mesmo componente que a página já usava (components/GeoMapCanvas), com clique no país,
 *    zoom, teclado e atribuição ODbL preservados — nada foi reimplementado aqui.
 *
 * O GeoMapCanvas tem raio próprio (rounded-2xl) e borda de 1 px. O invólucro força o raio de 2 px
 * do conceito no filho (variant [&>div]) e recorta o canvas — sem tocar no componente compartilhado
 * e sem duplicar a borda (a de 1 px do canvas continua sendo a única).
 */
import dynamic from 'next/dynamic';
import type { CanvasClubPoint } from '@/components/GeoMapCanvas';

const GeoMapCanvas = dynamic(() => import('@/components/GeoMapCanvas'), {
  ssr: false,
  loading: () => (
    <div
      className="h-[55vh] w-full animate-pulse bg-surface-2"
      aria-hidden="true"
      data-testid="mapa-canvas-loading"
    />
  ),
});

export interface MapaPanelProps {
  points: CanvasClubPoint[];
  selectedCountry: string;
  onCountrySelect: (iso2: string) => void;
}

export default function MapaPanel({ points, selectedCountry, onCountrySelect }: MapaPanelProps) {
  return (
    <div className="overflow-hidden rounded-[2px] [&>div]:rounded-[2px]" data-testid="mapa-canvas">
      <GeoMapCanvas
        points={points}
        selectedCountry={selectedCountry}
        onCountrySelect={onCountrySelect}
      />
    </div>
  );
}
