//TimeDistortionMap.tsx

'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, useMap, Circle, Polyline, LayerGroup } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from "@/components/ui/checkbox"
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import * as turf from '@turf/turf'
import { HeatmapLayer, NetworkLayer, IsochroneLayer } from './Layers'
import { InfoTooltip } from '@/components/InfoTooltip'
import { Target } from 'lucide-react'

// Fix Leaflet icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
})

const DEFAULT_CENTER: [number, number] = [40.777627, -73.970464]
const DEFAULT_ZOOM = 15

type AnalysisMode = 'basic' | 'heatmap' | 'network' | 'isochrone'

interface GridPoint {
  id: string
  coordinates: [number, number]
  originalCoordinates?: [number, number]
  travelTime?: number
  animationProgress?: number
}

interface MapControllerProps {
  points: GridPoint[]
  distortedPoints: GridPoint[]
  showDistortion: boolean
  circleRadius: number
  animationProgress: number
  analysisMode: AnalysisMode
  onMapReady: (map: L.Map) => void
}

function MapController({
  points,
  distortedPoints,
  showDistortion,
  circleRadius,
  animationProgress,
  analysisMode,
  onMapReady
}: MapControllerProps) {
  const map = useMap()
  
  useEffect(() => {
    onMapReady(map)
  }, [map, onMapReady])

  const originalPoints = useMemo(() => (
    <LayerGroup>
      {points.map((point) => (
        <Circle
          key={point.id}
          center={[point.coordinates[1], point.coordinates[0]]}
          radius={circleRadius}
          pathOptions={{ color: 'blue', fillOpacity: 0.5 }}
          eventHandlers={{
            click: () => {
              const time = point.travelTime
              if (time) {
                L.popup()
                  .setLatLng([point.coordinates[1], point.coordinates[0]])
                  .setContent(`Travel time: ${Math.round(time)} minutes`)
                  .openOn(map)
              }
            }
          }}
        />
      ))}
    </LayerGroup>
  ), [points, circleRadius, map])

  const getCurrentPosition = useCallback((original: [number, number], distorted: [number, number]): [number, number] => {
    return [
      original[0] + (distorted[0] - original[0]) * animationProgress,
      original[1] + (distorted[1] - original[1]) * animationProgress
    ]
  }, [animationProgress])

  const getAnalysisLayer = useCallback(() => {
    switch (analysisMode) {
      case 'heatmap':
        return <HeatmapLayer points={points} distortedPoints={distortedPoints} />;
      case 'network':
        return <NetworkLayer points={points} distortedPoints={distortedPoints} />;
      case 'isochrone':
        return <IsochroneLayer points={points} distortedPoints={distortedPoints} />;
      default:
        return null;
    }
  }, [analysisMode, points, distortedPoints]);

  const distortionVisualization = useMemo(() => (
    showDistortion ? (
      <LayerGroup>
        {distortedPoints.map((point, index) => (
          <Circle
            key={`${point.id}-distorted`}
            center={[
              getCurrentPosition(
                [points[index].coordinates[1], points[index].coordinates[0]],
                [point.coordinates[1], point.coordinates[0]]
              )[0],
              getCurrentPosition(
                [points[index].coordinates[1], points[index].coordinates[0]],
                [point.coordinates[1], point.coordinates[0]]
              )[1]
            ]}
            radius={circleRadius}
            pathOptions={{ color: 'red', fillOpacity: 0.5 }}
          />
        ))}
        {points.map((point, index) => (
          <Polyline
            key={`line-${point.id}`}
            positions={[
              [point.coordinates[1], point.coordinates[0]],
              [distortedPoints[index].coordinates[1], distortedPoints[index].coordinates[0]]
            ]}
            pathOptions={{ color: 'gray', dashArray: '5, 5' }}
          />
        ))}
      </LayerGroup>
    ) : null
  ), [distortedPoints, points, showDistortion, circleRadius, getCurrentPosition])

  return (
    <>
      {originalPoints}
      {distortionVisualization}
      {getAnalysisLayer()}
    </>
  )
}

function generateGrid(
  center: [number, number],
  radius: number,
  pointCount: number
): GridPoint[] {
  const points: GridPoint[] = []
  const circle = turf.circle(center, radius, { steps: 64 })
  const bbox = turf.bbox(circle)
  
  const cellSize = (radius * 2) / Math.sqrt(pointCount)
  const grid = turf.pointGrid(bbox, cellSize, { mask: circle })
  
  grid.features.forEach((point, index) => {
    points.push({
      id: `point-${index}`,
      coordinates: point.geometry.coordinates as [number, number],
      originalCoordinates: point.geometry.coordinates as [number, number]
    })
  })
  
  return points
}

function distortPoints(
  points: GridPoint[],
  timeMatrix: number[][],
  distortionFactor: number = 1
): GridPoint[] {
  return points.map((point, i) => {
    const avgTime = timeMatrix[i].reduce((a, b) => a + b, 0) / points.length
    const scaleFactor = (avgTime / 60) * distortionFactor
    
    const centerPoint = points[0]
    const direction = Math.atan2(
      point.coordinates[1] - centerPoint.coordinates[1],
      point.coordinates[0] - centerPoint.coordinates[0]
    )
    
    return {
      ...point,
      coordinates: [
        point.coordinates[0] + Math.cos(direction) * scaleFactor,
        point.coordinates[1] + Math.sin(direction) * scaleFactor
      ],
      travelTime: avgTime
    }
  })
}

function generateTimeMatrix(points: GridPoint[]): number[][] {
  return points.map((point1) => 
    points.map((point2) => {
      const distance = turf.distance(
        point1.coordinates,
        point2.coordinates,
        { units: 'miles' }
      )
      // Simulate travel time: assume average speed of 30 mph
      return (distance / 30) * 60 // Convert to minutes
    })
  )
}

function useAnimationFrame(callback: (deltaTime: number) => void) {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  
  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== null) {
        const deltaTime = time - previousTimeRef.current
        callback(deltaTime)
      }
      previousTimeRef.current = time
      requestRef.current = requestAnimationFrame(animate)
    }
    
    requestRef.current = requestAnimationFrame(animate)
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [callback])
}

export default function TimeDistortionMap() {
  const [points, setPoints] = useState<GridPoint[]>([])
  const [distortedPoints, setDistortedPoints] = useState<GridPoint[]>([])
  const [map, setMap] = useState<L.Map | null>(null)
  const [showDistortion, setShowDistortion] = useState(true)
  const [gridDensity, setGridDensity] = useState(25)
  const [distortionFactor, setDistortionFactor] = useState(1)
  const [radius, setRadius] = useState(0.5)
  const [circleRadius, _setCircleRadius] = useState(50)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showControls, _setShowControls] = useState(false)
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('basic')

  useAnimationFrame(deltaTime => {
    if (isAnimating) {
      setAnimationProgress(prev => {
        const next = prev + (deltaTime * 0.001)
        if (next >= 1) {
          setIsAnimating(false)
          return 1
        }
        return next
      })
    }
  })

  const handleMapReady = useCallback((map: L.Map) => {
    setMap(map)
  }, [])

  const updateGrid = useCallback(() => {
    if (!map) return

    const center = map.getCenter()
    const gridPoints = generateGrid(
      [center.lng, center.lat],
      radius,
      gridDensity
    )
    setPoints(gridPoints)

    const timeMatrix = generateTimeMatrix(gridPoints)
    const distorted = distortPoints(gridPoints, timeMatrix, distortionFactor)
    setDistortedPoints(distorted)
  }, [map, radius, gridDensity, distortionFactor])

  useEffect(() => {
    updateGrid()
  }, [updateGrid])

  function MapControls({ map }: { map: L.Map | null }) {
    const handleCenter = useCallback(() => {
      if (!map) return;
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }, [map]);
  
    return (
      <div className="absolute right-4 top-4 z-[1000]">
        <Button
          variant="outline"
          size="icon"
          className="bg-white shadow-lg"
          onClick={handleCenter}
          title="Return to default center"
        >
          <Target className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Main Map Container */}
      <div className="h-full">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController
            points={points}
            distortedPoints={distortedPoints}
            showDistortion={showDistortion}
            circleRadius={circleRadius}
            animationProgress={animationProgress}
            analysisMode={analysisMode}
            onMapReady={handleMapReady}
          />
        </MapContainer>
        <MapControls map={map} />
      </div>

      {/* Controls Panel */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-white shadow-lg z-[1000] transition-all duration-300 ease-in-out ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Controls Column */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Controls</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm mb-2">
                    Grid Density: <span className="font-mono">{gridDensity}</span>
                  </label>
                  <Slider
                    value={[gridDensity]}
                    onValueChange={(value) => setGridDensity(value[0])}
                    min={9}
                    max={100}
                    step={1}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    Distortion Factor: <span className="font-mono">{distortionFactor.toFixed(1)}x</span>
                  </label>
                  <Slider
                    value={[distortionFactor]}
                    onValueChange={(value) => setDistortionFactor(value[0])}
                    min={0}
                    max={5}
                    step={0.1}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Higher values emphasize travel time differences
                  </p>
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    Radius: <span className="font-mono">{radius.toFixed(1)} mi</span>
                  </label>
                  <Slider
                    value={[radius]}
                    onValueChange={(value) => setRadius(value[0])}
                    min={0.1}
                    max={2}
                    step={0.1}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Area covered: {(Math.PI * radius * radius).toFixed(2)} sq mi
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Legend</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 opacity-50 mr-2" />
                      <span className="text-sm">Geographic Location</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 opacity-50 mr-2" />
                      <span className="text-sm">Time-Adjusted Location</span>
                    </div>
                    {analysisMode === 'heatmap' && (
                      <div className="mt-2">
                        <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-red-500 rounded" />
                        <div className="flex justify-between text-xs mt-1">
                          <span>Shorter Time</span>
                          <span>Longer Time</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Visualization Controls */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Display</h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Analysis Mode</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="heatmap"
                        checked={analysisMode === 'heatmap'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAnalysisMode('heatmap')
                          } else {
                            setAnalysisMode('basic')
                          }
                        }}
                      />
                      <label
                        htmlFor="heatmap"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Travel Time Heatmap
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="network"
                        checked={analysisMode === 'network'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAnalysisMode('network')
                          } else {
                            setAnalysisMode('basic')
                          }
                        }}
                      />
                      <label
                        htmlFor="network"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Network Analysis
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isochrone"
                        checked={analysisMode === 'isochrone'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAnalysisMode('isochrone')
                          } else {
                            setAnalysisMode('basic')
                          }
                        }}
                      />
                      <label
                        htmlFor="isochrone"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Isochrone Map
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      setShowDistortion(!showDistortion)
                      if (!showDistortion) {
                        setAnimationProgress(0)
                        setIsAnimating(true)
                      }
                    }}
                    variant={showDistortion ? "outline" : "default"}
                    className="w-full"
                  >
                    {showDistortion ? 'Hide' : 'Show'} Distortion
                  </Button>
                  
                  {showDistortion && (
                    <Button
                      onClick={() => {
                        setAnimationProgress(0)
                        setIsAnimating(true)
                      }}
                      className="w-full"
                    >
                      Replay Animation
                    </Button>
                  )}
                </div>

                {analysisMode !== 'basic' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Analysis Description:</h4>
                    <p className="text-sm text-gray-600">
                      {analysisMode === 'heatmap' && 'Shows areas of high and low accessibility based on travel times.'}
                      {analysisMode === 'network' && 'Identifies key points and routes in the transportation network.'}
                      {analysisMode === 'isochrone' && 'Displays areas reachable within specific time intervals.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Column */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Analysis</h3>
              <div className="space-y-4">
                {/* Basic Statistics */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Key Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-medium text-sm">Average Travel Time</span>
                      </div>
                      <span className="font-mono text-sm">
                        {distortedPoints.length > 0
                          ? Math.round(
                              distortedPoints.reduce((sum, point) => sum + (point.travelTime || 0), 0) /
                              distortedPoints.length
                            )
                          : 0}{" "}
                        min
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-medium text-sm">Max Distortion</span>
                      </div>
                      <span className="font-mono text-sm">
                        {points.length > 0 && distortedPoints.length > 0
                          ? Math.round(
                              Math.max(
                                ...points.map((p, i) =>
                                  turf.distance(
                                    p.coordinates,
                                    distortedPoints[i].coordinates,
                                    { units: 'miles' }
                                  )
                                )
                              ) * 100
                            ) / 100
                          : 0}{" "}
                        mi
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-medium text-sm">Coverage Area</span>
                      </div>
                      <span className="font-mono text-sm">
                        {(Math.PI * radius * radius).toFixed(2)} sq mi
                      </span>
                    </div>

                    {analysisMode === 'network' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="font-medium text-sm">Connected Points</span>
                        </div>
                        <span className="font-mono text-sm">
                          {points.length > 0
                            ? points.filter((_, i) => 
                                distortedPoints[i].travelTime && 
                                distortedPoints[i].travelTime! < 20
                              ).length
                            : 0}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mode-Specific Analysis */}
                {analysisMode !== 'basic' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">
                      {analysisMode === 'heatmap' && 'Heatmap Analysis'}
                      {analysisMode === 'network' && 'Network Analysis'}
                      {analysisMode === 'isochrone' && 'Isochrone Analysis'}
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      {analysisMode === 'heatmap' && (
                        <>
                          <p>• Blue areas indicate better accessibility</p>
                          <p>• Red areas show locations with longer travel times</p>
                          <p>• Color intensity shows relative travel time differences</p>
                        </>
                      )}
                      {analysisMode === 'network' && (
                        <>
                          <p>• Larger circles indicate better-connected locations</p>
                          <p>• Size is proportional to number of accessible points</p>
                          <p>• Consider areas with large circles as mobility hubs</p>
                        </>
                      )}
                      {analysisMode === 'isochrone' && (
                        <>
                          <p>• Each zone shows area reachable within a time interval</p>
                          <p>• Darker colors indicate shorter travel times</p>
                          <p>• Zone boundaries represent travel time thresholds</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* How to Read Guide */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">How to Read This Map</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Blue dots show actual geographic locations</li>
                    <li>• Red dots show where locations "&quot;feel&quot;" based on travel time</li>
                    <li>• Longer gray lines mean bigger differences between physical and time distance</li>
                    <li>• Click any blue dot to see exact travel time</li>
                    {analysisMode !== 'basic' && (
                      <li className="mt-2 text-sm font-medium text-gray-700">
                        Use this visualization to identify:
                        {analysisMode === 'heatmap' && (
                          <ul className="mt-1 ml-2 space-y-1">
                            <li>→ Areas with good accessibility</li>
                            <li>→ Regions that take longer to reach</li>
                            <li>→ Travel time patterns</li>
                          </ul>
                        )}
                        {analysisMode === 'network' && (
                          <ul className="mt-1 ml-2 space-y-1">
                            <li>→ Well-connected locations</li>
                            <li>→ Potential transportation hubs</li>
                            <li>→ Isolated areas</li>
                          </ul>
                        )}
                        {analysisMode === 'isochrone' && (
                          <ul className="mt-1 ml-2 space-y-1">
                            <li>→ Travel time boundaries</li>
                            <li>→ Service area coverage</li>
                            <li>→ Accessibility zones</li>
                          </ul>
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}