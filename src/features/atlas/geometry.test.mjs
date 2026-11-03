import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORLD_VIEW, MIN_VIEW_WIDTH, project, geometryToPath, geometryBounds, clampView, zoomView, fitBounds } from './geometry.mjs';

const world = JSON.parse(readFileSync(new URL('../../../public/maps/world-110m.json', import.meta.url)));
assert.deepEqual(project([0, 0]), [540, 270]);
assert.deepEqual(project([-180, 90]), [0, 0]);
assert.equal(world.features.length, 176);
assert.equal(new Set(world.features.map((feature) => feature.properties.code)).size, 176);
const china = world.features.find((feature) => feature.properties.code === 'CHN');
assert.equal(china.properties.name, '中国');
assert.equal(china.geometry.type, 'MultiPolygon');
assert.equal(china.geometry.coordinates.length, 3);
assert(china.geometry.coordinates.some((polygon) => polygon[0].some(([lng, lat]) => lng > 120 && lng < 122 && lat > 22 && lat < 26)));
assert(!world.features.some((feature) => feature.properties.code === 'TWN' || feature.properties.name === '中华民国'));
for (const feature of world.features) {
  const path = geometryToPath(feature.geometry);
  assert(path.startsWith('M') && path.endsWith('Z'));
  assert(!path.includes('NaN'));
  assert(geometryBounds(feature.geometry).every(Number.isFinite));
}
assert.deepEqual(clampView({ x: -50, y: -40, width: 9999 }), WORLD_VIEW);
const zoomed = zoomView(WORLD_VIEW, 2);
assert.deepEqual(zoomed, { x: 270, y: 135, width: 540, height: 270 });
assert.deepEqual(zoomView(zoomed, 0.5), WORLD_VIEW);
assert.equal(zoomView(WORLD_VIEW, 1000).width, MIN_VIEW_WIDTH);
assert.deepEqual(clampView({ x: 2000, y: 2000, width: 0 }), { x: 1077, y: 538.5, width: 3, height: 1.5 });
const city = fitBounds([889, 160, 890, 161]);
assert.deepEqual(city, { x: 887.5, y: 159.5, width: 4, height: 2 });
assert.equal(zoomView(city, 2).width, MIN_VIEW_WIDTH);
assert(geometryToPath({ type: 'Polygon', coordinates: [[[0.0004, 0.0004], [0.0008, 0.0008], [0.0004, 0.0004]]] }).startsWith('M540.001,269.999L540.002,269.998'));
const country = fitBounds([540, 100, 550, 130]);
assert(country.width >= MIN_VIEW_WIDTH && country.x >= 0 && country.y >= 0);
assert(country.x + country.width <= 1080 && country.y + country.height <= 540);
console.log('Atlas checks passed: real country data, projection, bounds, zoom and clamping.');

// Portrait and wide canvases use the same units for horizontal and vertical gestures.
for (const aspect of [0.8, 1, 2.4]) {
  const detail = fitBounds([880, 145, 900, 165], aspect);
  assert.equal(detail.width / detail.height, aspect);
  assert(detail.x <= 880 && detail.x + detail.width >= 900);
  assert(detail.y <= 145 && detail.y + detail.height >= 165);
  const closer = zoomView(detail, 2, [0.25, 0.75], aspect);
  assert.equal(closer.width / closer.height, aspect);
  assert(Math.abs((detail.x + detail.width * .25) - (closer.x + closer.width * .25)) < 1e-9);
  assert(Math.abs((detail.y + detail.height * .75) - (closer.y + closer.height * .75)) < 1e-9);
  const globe = clampView(WORLD_VIEW, aspect);
  assert.equal(globe.width, 1080);
  assert.equal(globe.width / globe.height, aspect);
}
