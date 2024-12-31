# Time-Space Distortion Mapping

## Overview
The **Time-Space Distortion Mapping** project reimagines geographic visualization by warping spatial maps based on travel time instead of physical distance. By combining advanced geospatial techniques with modern web technologies, the project aims to provide an intuitive representation of accessibility for applications in urban planning, transportation, and GIS analysis.

## Link to the Application
Explore the final product here: [Time-Space Distortion Mapping](https://time-distortion.vercel.app)

## Features
- **Time-Space Warping**: Adjust geographic positions based on travel times using distortion functions.
- **Isochrone Mapping**: Generate regions representing equal travel time from a point of origin.
- **Interactive Visualizations**: Explore network connectivity, heatmaps, and accessibility zones dynamically.
- **Network Analysis**: Evaluate transportation networks using graph theory metrics like shortest paths and centrality.

## Technical Stack
- **Frontend**: React, TypeScript
- **Mapping Libraries**: Leaflet, Turf.js
- **Visualization Tools**: D3.js for advanced graphics rendering

## Code Snippets

### Distortion Function
This function distorts geographic points based on average travel times and angular direction:
```typescript
export function distortPoints(points: GridPoint[], timeMatrix: number[][]): GridPoint[] {
  return points.map((point, i) => {
    const avgTime = timeMatrix[i].reduce((a, b) => a + b, 0) / points.length;
    const distortionFactor = avgTime / 60;
    const direction = Math.atan2(
      point.coordinates[1] - points[0].coordinates[1],
      point.coordinates[0] - points[0].coordinates[0]
    );

    return {
      ...point,
      coordinates: [
        point.coordinates[0] + Math.cos(direction) * distortionFactor,
        point.coordinates[1] + Math.sin(direction) * distortionFactor,
      ],
    };
  });
}
```

### Network Analysis Layer
This layer visualizes connectivity within a transportation network:
```typescript
export function NetworkLayer({ points, distortedPoints }: LayerProps) {
  const networkData = useMemo(() => {
    return points.map((point, i) => {
      const nearbyPoints = distortedPoints.filter((_, j) => {
        if (i === j) return false;
        const time = distortedPoints[i].travelTime || 0;
        return time < 20; // Connected if less than 20 minutes away
      }).length;

      return {
        coordinates: point.coordinates,
        size: 50 + nearbyPoints * 10,
        connections: nearbyPoints,
      };
    });
  }, [points, distortedPoints]);

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
            weight: 2,
          }}
        />
      ))}
    </LayerGroup>
  );
}
```

## Mathematical Framework
### Accessibility Score
Defines the ease of reaching destinations:
\[
A = \sum_{i=1}^{n} \frac{P_i}{T_i^\beta},
\]
where \(P_i\) is the population, \(T_i\) is travel time, and \(\beta\) is a decay factor.

### Distortion Logic
Utilizes multidimensional scaling (MDS) for travel time-based distortion:
\[
D_{ij} = \sqrt{T_{ij}},
\]
\[
B = -\frac{1}{2} H D^2 H,
\]
where \(H\) is the centering matrix, and \(B\) represents transformed coordinates.

## Applications
1. **Urban Planning**: Optimize infrastructure and evaluate public transport efficiency.
2. **Transportation**: Improve routing and accessibility analysis for platforms like Uber.
3. **GIS Analysis**: Provide dynamic mapping solutions for companies like ESRI or Carto.
4. **Academia**: Research urban mobility and accessibility.

## Getting Started
### Prerequisites
- Node.js
- Yarn or npm
- React.js and TypeScript knowledge

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/krish-shahh/time-distortion-map.git
   ```
2. Install dependencies:
   ```bash
   cd time-distortion-map
   npm install
   ```

### Run the Application
```bash
npm run dev
```

## Future Work
- Integration with real-time traffic data.
- Support for multi-modal transportation systems.
- Augmented Reality (AR) for accessibility visualization.

## License
This project is licensed under the MIT License.