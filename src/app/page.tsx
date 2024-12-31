// src/app/page.tsx
'use client'

import dynamic from 'next/dynamic'
import { FileText } from 'lucide-react' // Import icon for the PDF button
import { Button } from '@/components/ui/button'

const TimeDistortionMap = dynamic(
  () => import('@/components/Map/TimeDistortionMap'),
  { ssr: false } // Leaflet requires browser APIs
)

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Time Distortion Map</h1>
        <Button 
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => window.open('/Time_Distortion.pdf', '_blank')}
        >
          <FileText className="h-4 w-4" />
          View Report
        </Button>
      </div>
      <div className="h-[800px] w-full">
        <TimeDistortionMap />
      </div>
    </main>
  )
}