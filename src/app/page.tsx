// src/app/page.tsx
'use client'

import dynamic from 'next/dynamic'

const TimeDistortionMap = dynamic(
  () => import('@/components/Map/TimeDistortionMap'),
  { ssr: false } // Leaflet requires browser APIs
)

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Time Distortion Map</h1>
      <div className="h-[800px] w-full">
        <TimeDistortionMap />
      </div>
    </main>
  )
}