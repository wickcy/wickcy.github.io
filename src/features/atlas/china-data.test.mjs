import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { geometryBounds, geometryToPath } from './geometry.mjs';

const load = (file) => JSON.parse(readFileSync(new URL('../../../public/maps/' + file, import.meta.url)));
const provinces = load('china-provinces.json').features;
const cityGroups = provinces.map(({ properties: { code } }) => ({
  code, features: load('china-cities/' + code + '.json').features
}));
const cities = cityGroups.flatMap(({ features }) => features);

test('China has 34 distinct province-level regions and a city file for each', () => {
  const codes = new Set(provinces.map(({ properties }) => properties.code));
  assert.equal(provinces.length, 34);
  assert.equal(codes.size, 34);
  for (const code of codes) assert.match(code, /^\d{6}$/);
  for (const code of ['710000', '810000', '820000']) assert(codes.has(code));
  for (const group of cityGroups) {
    assert(group.features.length > 0, group.code + ' has no city/region geometry');
    for (const { properties } of group.features) {
      assert.equal(properties.regionCode, group.code);
      assert.match(properties.code, /^\d{6}$/);
    }
  }
  assert.equal(new Set(cities.map(({ properties }) => properties.code)).size, cities.length);
});

test('Province and city geometry has valid rings and renders finite SVG paths and bounds', () => {
  for (const { properties, geometry } of [...provinces, ...cities]) {
    assert(['Polygon', 'MultiPolygon'].includes(geometry.type), properties.code);
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    assert(polygons.length > 0, properties.code);
    for (const polygon of polygons) {
      assert(polygon.length > 0, properties.code);
      for (const ring of polygon) {
        assert(ring.length >= 4, properties.code);
        assert.deepEqual(ring[0], ring.at(-1), properties.code + ' has an open ring');
        assert(new Set(ring.map((point) => point.join(','))).size >= 3, properties.code);
        for (const [lng, lat] of ring) {
          assert(Number.isFinite(lng) && lng >= -180 && lng <= 180, properties.code);
          assert(Number.isFinite(lat) && lat >= -90 && lat <= 90, properties.code);
        }
      }
    }
    assert(properties.label.length === 2 && properties.label.every(Number.isFinite));
    const path = geometryToPath(geometry);
    assert(path.startsWith('M') && path.endsWith('Z'), properties.code);
    assert(!/NaN|Infinity/.test(path), properties.code);
    const bounds = geometryBounds(geometry);
    assert(bounds.length === 4 && bounds.every(Number.isFinite), properties.code);
    assert(bounds[0] < bounds[2] && bounds[1] < bounds[3], properties.code);
  }
});

test('Existing travel cities retain correct region codes and Jinan includes former Laiwu', () => {
  for (const [code, regionCode] of [
    ['110000', '110000'], ['370100', '370000'], ['370900', '370000'], ['330600', '330000']
  ]) assert.equal(cities.find(({ properties }) => properties.code === code)?.properties.regionCode, regionCode);
  const jinan = cities.find(({ properties }) => properties.code === '370100');
  assert(jinan.properties.sourceId.split(',').includes('CN037070'));
  assert(jinan.properties.sourceId.split(',').includes('CN037050'));
  assert(!cities.some(({ properties }) => properties.code === '371200'));
});
