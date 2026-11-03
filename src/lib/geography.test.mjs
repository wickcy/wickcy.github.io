import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCityCountry } from './geography.mjs';

test('中国及台湾、香港、澳门的城市统一归属中国，国家统计去重', () => {
  const cities = ['CHN', 'TWN', 'HKG', 'MAC'].map((countryCode, index) =>
    Object.freeze({ id: String(index), countryCode, countryName: '原始名称', regionCode: '710000' }));
  const normalized = cities.map(normalizeCityCountry);
  assert.deepEqual([...new Set(normalized.map(city => city.countryCode))], ['CHN']);
  for (const [index, city] of normalized.entries()) {
    assert.equal(city.countryName, '中国');
    assert.equal(city.id, cities[index].id);
    assert.equal(city.regionCode, cities[index].regionCode);
    assert.equal(cities[index].countryName, '原始名称');
  }
  assert.deepEqual(cities.map(city => city.countryCode), ['CHN', 'TWN', 'HKG', 'MAC']);
});

test('其他国家的城市归属与资料保持原样', () => {
  const city = Object.freeze({ id: 'tokyo', countryCode: 'JPN', countryName: '日本', lat: 35.68 });
  assert.deepEqual(normalizeCityCountry(city), city);
  assert.equal(normalizeCityCountry(city).countryCode, 'JPN');
});
