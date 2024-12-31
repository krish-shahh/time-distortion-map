// src/utils/statistical.ts
import * as turf from '@turf/turf';
import * as d3 from 'd3';

interface GridPoint {
  id: string;
  coordinates: [number, number];
  travelTime?: number;
}

export function calculateTimeDistortion(
  points: GridPoint[],
  distortedPoints: GridPoint[]
): number[] {
  return points.map((point, i) => {
    const originalPoint = turf.point(point.coordinates);
    const distortedPoint = turf.point(distortedPoints[i].coordinates);
    return turf.distance(originalPoint, distortedPoint, { units: 'miles' });
  });
}

export function calculateAverageTime(points: GridPoint[]): number {
  const times = points.map(p => p.travelTime || 0);
  return times.reduce((a, b) => a + b, 0) / times.length;
}

export function calculateMaxDistortion(
  points: GridPoint[],
  distortedPoints: GridPoint[]
): number {
  const distortions = calculateTimeDistortion(points, distortedPoints);
  return Math.max(...distortions);
}

export function generateHeatmapData(points: GridPoint[]): Array<{
  coordinates: [number, number];
  intensity: number;
}> {
  const maxTime = Math.max(...points.map(p => p.travelTime || 0));
  const minTime = Math.min(...points.map(p => p.travelTime || 0));
  
  return points.map(point => ({
    coordinates: point.coordinates,
    intensity: ((point.travelTime || 0) - minTime) / (maxTime - minTime)
  }));
}

export function calculateIsochrones(
  points: GridPoint[],
  timeThresholds: number[]
): Array<{
  threshold: number;
  coordinates: [number, number][];
}> {
  return timeThresholds.map(threshold => {
    const accessiblePoints = points
      .filter(point => (point.travelTime || 0) <= threshold)
      .map(point => point.coordinates);

    if (accessiblePoints.length < 3) {
      return {
        threshold,
        coordinates: []
      };
    }

    try {
      const pointsCollection = turf.points(accessiblePoints);
      const hull = turf.convex(pointsCollection);
      
      if (!hull) return { threshold, coordinates: [] };
      
      const buffer = turf.buffer(hull, 0.1, { units: 'miles' });
      if (!buffer) return { threshold, coordinates: [] };

      const coords = buffer.geometry.coordinates[0];
      return {
        threshold,
        coordinates: coords.map(coord => [coord[0], coord[1]] as [number, number])
      };
    } catch (e) {
      console.error('Error generating isochrone:', e);
      return { threshold, coordinates: [] };
    }
  });
}

export function calculateConnectivity(
  points: GridPoint[],
  timeThreshold: number = 20
): number[] {
  return points.map((point, i) => {
    return points.filter((p, j) => {
      if (i === j) return false;
      const time = p.travelTime || 0;
      return time < timeThreshold;
    }).length;
  });
}

export function findCentralPoints(
  points: GridPoint[],
  timeThreshold: number = 20
): number[] {
  const connectivity = calculateConnectivity(points, timeThreshold);
  const maxConnectivity = Math.max(...connectivity);
  
  return points.map((_, i) => 
    connectivity[i] / maxConnectivity
  );
}

export function calculateAreaCoverage(
  points: GridPoint[],
  timeThreshold: number
): number {
  const accessiblePoints = points.filter(p => (p.travelTime || 0) <= timeThreshold);
  if (accessiblePoints.length < 3) return 0;

  try {
    const pointsCollection = turf.points(accessiblePoints.map(p => p.coordinates));
    const hull = turf.convex(pointsCollection);
    if (!hull) return 0;
    
    return turf.area(hull) * 3.861e-7; // Convert square meters to square miles
  } catch (e) {
    console.error('Error calculating area coverage:', e);
    return 0;
  }
}