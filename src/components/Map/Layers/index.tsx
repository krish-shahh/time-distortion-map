// src/components/Map/Layers.tsx
import { useMemo } from 'react'
import { Circle, Polygon, LayerGroup } from 'react-leaflet'
import * as turf from '@turf/turf'
//import L from 'leaflet'

interface LayerProps {
  points: {
    id: string
    coordinates: [number, number]
    travelTime?: number
  }[]
  distortedPoints: {
    id: string
    coordinates: [number, number]
    travelTime?: number
  }[]
}

export function HeatmapLayer({ points, distortedPoints }: LayerProps) {
  const heatmapData = useMemo(() => {
    const maxTime = Math.max(...distortedPoints.map(p => p.travelTime || 0))
    const minTime = Math.min(...distortedPoints.map(p => p.travelTime || 0))
    
    return points.map((point, i) => {
      const time = distortedPoints[i].travelTime || 0
      const normalizedTime = (time - minTime) / (maxTime - minTime)
      return {
        coordinates: point.coordinates,
        color: `hsl(${240 - (normalizedTime * 240)}, 70%, 50%)`
      }
    })
  }, [points, distortedPoints])

  return (
    <LayerGroup>
      {heatmapData.map((point, index) => (
        <Circle
          key={`heat-${index}`}
          center={[point.coordinates[1], point.coordinates[0]]}
          radius={75}
          pathOptions={{
            fillColor: point.color,
            fillOpacity: 0.6,
            color: point.color,
            weight: 1
          }}
        />
      ))}
    </LayerGroup>
  )
}

export function NetworkLayer({ points, distortedPoints }: LayerProps) {
  const networkData = useMemo(() => {
    return points.map((point, i) => {
      const nearbyPoints = distortedPoints.filter((_, j) => {
        if (i === j) return false
        const time = distortedPoints[i].travelTime || 0
        return time < 20 // Connected if less than 20 minutes away
      }).length

      return {
        coordinates: point.coordinates,
        size: 50 + (nearbyPoints * 10),
        connections: nearbyPoints
      }
    })
  }, [points, distortedPoints])

  return (
    <LayerGroup>
      {networkData.map((point, index) => (
        <Circle
          key={`network-${index}`}
          center={[point.coordinates[1], point.coordinates[0]]}
          radius={point.size}
          pathOptions={{
            fillColor: '#4CAF50',
            fillOpacity: 0.6,
            color: '#2E7D32',
            weight: 2
          }}
        />
      ))}
    </LayerGroup>
  )
}

export function IsochroneLayer({ points, distortedPoints }: LayerProps) {
  const isochroneData = useMemo(() => {
    const timeIntervals = [5, 10, 15, 20, 25] // minutes
    
    return timeIntervals.map(interval => {
      const accessiblePoints = points.filter((_, i) => 
        (distortedPoints[i].travelTime || 0) <= interval
      )

      if (accessiblePoints.length < 3) return null

      try {
        const pointFeatures = accessiblePoints.map(p => ({
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'Point' as const,
            coordinates: p.coordinates
          }
        }))

        const collection = {
          type: 'FeatureCollection' as const,
          features: pointFeatures
        }

        const buffer = turf.buffer(collection, 0.2, { units: 'miles' })
        if (!buffer) return null

        return {
          interval,
          coordinates: turf.coordAll(buffer).map(coord => 
            [coord[1], coord[0]] as [number, number]
          )
        }
      } catch (e) {
        console.error('Error generating isochrone:', e)
        return null
      }
    }).filter(Boolean)
  }, [points, distortedPoints])

  return (
    <LayerGroup>
      {isochroneData.map((iso, index) => (
        <Polygon
          key={`iso-${index}`}
          positions={iso!.coordinates}
          pathOptions={{
            fillColor: `hsl(${240 - (index * 40)}, 70%, 50%)`,
            fillOpacity: 0.3,
            color: `hsl(${240 - (index * 40)}, 70%, 40%)`,
            weight: 1
          }}
        />
      ))}
    </LayerGroup>
  )
}