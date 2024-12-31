// src/components/Map/utils/distortion.ts
import * as turf from '@turf/turf'
import { matrix, multiply } from 'mathjs'

export interface GridPoint {
  id: string
  coordinates: [number, number] // [lng, lat]
  originalCoordinates?: [number, number]
}

export function generateGrid(
  center: [number, number],
  radius: number,
  pointCount: number
): GridPoint[] {
  const points: GridPoint[] = []
  const circle = turf.circle(center, radius, { steps: 64 })
  const bbox = turf.bbox(circle)
  
  // Create a grid of points within the circle
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

export function distortPoints(
  points: GridPoint[],
  timeMatrix: number[][]
): GridPoint[] {
  // Convert time matrix to distance matrix (assuming time in minutes)
  const distanceMatrix = timeMatrix.map(row => 
    row.map(time => Math.sqrt(time))
  )

  // Classical MDS implementation
  const n = points.length
  const H = matrix(Array(n).fill(0).map(() => Array(n).fill(1)))
  for (let i = 0; i < n; i++) {
    H.set([i, i], H.get([i, i]) - 1/n)
  }

  //const B = multiply(multiply(multiply(-0.5, H), distanceMatrix), H)
  //const eigenvalues = []  // Would use proper eigendecomposition library here
  //const eigenvectors = [] // Placeholder for actual computation

  // For now, using a simpler distortion method
  return points.map((point, i) => {
    const avgTime = timeMatrix[i].reduce((a, b) => a + b, 0) / points.length
    const distortionFactor = avgTime / 60 // Scale based on average time in hours
    
    const direction = Math.atan2(
      point.coordinates[1] - points[0].coordinates[1],
      point.coordinates[0] - points[0].coordinates[0]
    )
    
    return {
      ...point,
      coordinates: [
        point.coordinates[0] + Math.cos(direction) * distortionFactor,
        point.coordinates[1] + Math.sin(direction) * distortionFactor
      ]
    }
  })
}