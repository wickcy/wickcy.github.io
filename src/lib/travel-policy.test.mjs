import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedTrips, visitedCities, tripsForCity, publicAsset, displayCityIds } from './travel-policy.js';

const cities = [{id:'a',countryCode:'CHN'}, {id:'b',countryCode:'CHN'}, {id:'c',countryCode:'JPN'}];
const trip = (id, status, cityIds, visitedCityIds, published=true) => ({id,data:{published,status,cityIds,visitedCityIds,updatedAt:'2026-11-03'}});

test('候选、过期计划和未发布旅行不产生足迹', () => {
  assert.deepEqual(visitedCities([trip('plan','planning',['a','b'],[]),trip('draft','completed',['c'],['c'],false)], cities), []);
});
test('一次跨城与重复到访共享城市档案，城市统计去重', () => {
  const trips = [trip('first','completed',['a','b'],['a','b']),trip('second','completed',['a'],['a'])];
  assert.deepEqual(visitedCities(trips,cities).map(c=>c.id),['a','b']);
  assert.equal(tripsForCity(trips,'a').length,2);
});
test('未发布旅行不进入派生列表，精确到访独立于候选方案', () => {
  const trips = [trip('public','completed',['a','b'],['a']),trip('private','completed',['b'],['b'],false)];
  assert.equal(publishedTrips(trips).length,1);
  assert.deepEqual(visitedCities(trips,cities).map(c=>c.id),['a']);
});
test('照片地址限制为站内路径或 HTTPS', () => {
  for (const value of ['/images/a.jpg','https://example.com/a.webp']) assert.equal(publicAsset(value),true);
  for (const value of ['javascript:alert(1)','//evil.example/a.jpg','/\\evil.example/a.jpg','data:text/html,x','http://example.com/a.jpg']) assert.equal(publicAsset(value),false);
});
test('已完成旅行展示实际到访，也支持只补录实际城市的历史记录',()=>{
  assert.deepEqual(displayCityIds(trip('history','completed',[],['a'])),['a']);
  assert.deepEqual(displayCityIds(trip('selected','completed',['a','b'],['a'])),['a']);
  assert.deepEqual(displayCityIds(trip('plan','planning',['a','b'],[])),['a','b']);
});
