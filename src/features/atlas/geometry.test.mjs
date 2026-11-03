import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORLD_VIEW, project, geometryToPath, geometryBounds, clampView, zoomView, fitBounds } from './geometry.mjs';

const world = JSON.parse(readFileSync(new URL('../../../public/maps/world-110m.json', import.meta.url)));
assert.deepEqual(project([0, 0]), [540, 270]);
assert.deepEqual(project([-180, 90]), [0, 0]);
assert.equal(world.features.length, 177);
assert.equal(new Set(world.features.map((feature) => feature.properties.code)).size, 177);
assert(world.features.some((feature) => feature.properties.code === 'CHN'));
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
assert.equal(zoomView(WORLD_VIEW, 1000).width, 60);
const country = fitBounds([540, 100, 550, 130]);
assert(country.width >= 60 && country.x >= 0 && country.y >= 0);
assert(country.x + country.width <= 1080 && country.y + country.height <= 540);
console.log('Atlas checks passed: real country data, projection, bounds, zoom and clamping.');
