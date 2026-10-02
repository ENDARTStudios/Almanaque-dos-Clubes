'use client';

import dynamic from 'next/dynamic';
import type { MapPoint } from './WorldMap';

const WorldMap = dynamic(() => import('./WorldMap'), {
  ssr: false,
  loading: () => <div className="h-[70vh] w-full bg-gray-100 rounded-2xl animate-pulse" />,
});

export default function MapSection({ clubs }: { clubs: MapPoint[] }) {
  return <WorldMap clubs={clubs} />;
}
