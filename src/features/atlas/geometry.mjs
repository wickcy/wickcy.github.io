export const WORLD_VIEW = Object.freeze({ x: 0, y: 0, width: 1080, height: 540 });

export function project([lng, lat]) {
  return [(lng + 180) * 3, (90 - lat) * 3];
}

export function geometryToPath(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.map((ring) =>
    ring.map((coordinate, index) => {
      const [x, y] = project(coordinate);
      return (index ? 'L' : 'M') + x.toFixed(2) + ',' + y.toFixed(2);
    }).join('') + 'Z'
  )).join('');
}

export function geometryBounds(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  // Focus the largest landmass so overseas islands do not zoom a country out to the whole world.
  const ring = polygons.map((polygon) => polygon[0]).sort((a, b) => ringArea(b) - ringArea(a))[0];
  const points = ring.map(project);
  return [
    Math.min(...points.map(([x]) => x)), Math.min(...points.map(([, y]) => y)),
    Math.max(...points.map(([x]) => x)), Math.max(...points.map(([, y]) => y))
  ];
}

function ringArea(ring) {
  return Math.abs(ring.reduce((sum, point, index) => {
    const next = ring[(index + 1) % ring.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0));
}

export function clampView(view) {
  const width = Math.max(60, Math.min(WORLD_VIEW.width, view.width));
  const height = width / 2;
  return {
    x: Math.max(0, Math.min(WORLD_VIEW.width - width, view.x)),
    y: Math.max(0, Math.min(WORLD_VIEW.height - height, view.y)),
    width,
    height
  };
}

export function zoomView(view, factor, anchor = [0.5, 0.5]) {
  const width = Math.max(60, Math.min(WORLD_VIEW.width, view.width / factor));
  const height = width / 2;
  return clampView({
    x: view.x + (view.width - width) * anchor[0],
    y: view.y + (view.height - height) * anchor[1],
    width,
    height
  });
}

export function fitBounds([left, top, right, bottom]) {
  const width = Math.max(70, (right - left) * 1.3, (bottom - top) * 2.6);
  return clampView({
    x: (left + right - width) / 2,
    y: (top + bottom - width / 2) / 2,
    width
  });
}
