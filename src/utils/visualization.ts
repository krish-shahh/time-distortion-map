// src/utils/visualization.ts
import * as d3 from 'd3';

interface Point {
  x: number;
  y: number;
}

interface VectorField {
  x: number;
  y: number;
}

export function createHeatmapData(data: Array<{ point: [number, number]; value: number }>) {
  const colorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain([
      Math.min(...data.map(d => d.value)),
      Math.max(...data.map(d => d.value))
    ]);

  return data.map(d => ({
    ...d,
    color: colorScale(d.value)
  }));
}

export function generateVoronoi(
  points: [number, number][],
  width: number,
  height: number
): Array<[number, number][]> {
  const delaunay = d3.Delaunay.from(points);
  const voronoi = delaunay.voronoi([0, 0, width, height]);
  
  return Array.from({ length: points.length }, (_, i) => {
    const cell = voronoi.cellPolygon(i);
    return cell ? cell.map(p => [p[0], p[1]] as [number, number]) : [];
  }).filter(cell => cell.length > 0);
}

interface StreamlineOptions {
  stepSize?: number;
  maxSteps?: number;
  lineLength?: number;
}

export function createStreamlines(
  vectorField: VectorField[][],
  bounds: [number, number, number, number],
  options: StreamlineOptions = {}
): Array<Point[]> {
  const {
    stepSize = 0.1,
    maxSteps = 1000,
    lineLength = 10
  } = options;

  const streamlines: Point[][] = [];
  const width = vectorField.length;
  const height = vectorField[0].length;

  function interpolateVector(x: number, y: number): Point {
    const i = Math.floor((x - bounds[0]) / (bounds[2] - bounds[0]) * (width - 1));
    const j = Math.floor((y - bounds[1]) / (bounds[3] - bounds[1]) * (height - 1));
    
    if (i < 0 || i >= width - 1 || j < 0 || j >= height - 1) {
      return { x: 0, y: 0 };
    }

    return vectorField[i][j];
  }

  function integrateLine(startX: number, startY: number): Point[] {
    const line: Point[] = [{ x: startX, y: startY }];
    let x = startX;
    let y = startY;

    for (let step = 0; step < maxSteps; step++) {
      const vector = interpolateVector(x, y);
      if (!vector) break;

      const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
      if (magnitude < 1e-6) break;

      x += (vector.x / magnitude) * stepSize;
      y += (vector.y / magnitude) * stepSize;

      if (x < bounds[0] || x > bounds[2] || y < bounds[1] || y > bounds[3]) break;

      line.push({ x, y });

      if (line.length * stepSize > lineLength) break;
    }

    return line;
  }

  // Generate seed points
  const seedPoints: Point[] = [];
  const seedDensity = 10;
  for (let i = 0; i < seedDensity; i++) {
    for (let j = 0; j < seedDensity; j++) {
      seedPoints.push({
        x: bounds[0] + (bounds[2] - bounds[0]) * (i + 0.5) / seedDensity,
        y: bounds[1] + (bounds[3] - bounds[1]) * (j + 0.5) / seedDensity
      });
    }
  }

  // Generate streamlines from seed points
  seedPoints.forEach(seed => {
    const line = integrateLine(seed.x, seed.y);
    if (line.length > 1) {
      streamlines.push(line);
    }
  });

  return streamlines;
}

export function generateTensorField(
  points: [number, number][],
  distortions: [number, number][]
): VectorField[][] {
  const gridSize = 20;
  const field: VectorField[][] = Array(gridSize).fill(0).map(() =>
    Array(gridSize).fill(0).map(() => ({ x: 0, y: 0 }))
  );

  // Calculate field vectors
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      let sumX = 0;
      let sumY = 0;
      let weightSum = 0;

      points.forEach((point, idx) => {
        const dx = (i / gridSize) - point[0];
        const dy = (j / gridSize) - point[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const weight = 1 / (distance * distance);
          sumX += distortions[idx][0] * weight;
          sumY += distortions[idx][1] * weight;
          weightSum += weight;
        }
      });

      if (weightSum > 0) {
        field[i][j] = {
          x: sumX / weightSum,
          y: sumY / weightSum
        };
      }
    }
  }

  return field;
}