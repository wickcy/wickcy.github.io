import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { calculateBudget, getPlanCase, planText, roadDistance, safeURL } from './plan-model.mjs';

const data = JSON.parse(fs.readFileSync(new URL('../../../content/trips/autumn-meet-2026/plans.json', import.meta.url), 'utf8'));

test('迁移保留双卧铺默认预算及双方分摊', () => {
  const result = calculateBudget(data.initial, getPlanCase(data, data.initial).defaults);
  assert.equal(Math.round(result.total), 3615);
  assert.equal(Math.round(result.beijing), 1643);
  assert.equal(Math.round(result.shanghai), 1971);
  assert.equal(result.nights, 2);
});

test('前晚入住与额外清晨房费分别计晚数，金额无效时不产生合计', () => {
  const state = { dest: 'shaoxing', days: 3, arrival: 'night' };
  const values = getPlanCase(data, state).defaults;
  assert.equal(calculateBudget(state, values).nights, 3);
  assert.equal(calculateBudget(data.initial, { ...getPlanCase(data, data.initial).defaults, early: true }).nights, 3);
  assert.equal(calculateBudget(state, { ...values, nightly: '' }).valid, false);
  assert.equal(calculateBudget(state, { ...values, rooms: 1.5 }).valid, false);
  assert.equal(calculateBudget(state, { ...values, food: -1 }).valid, false);
});

test('十二种组合可查，未成立的组合不产生预算或推荐行程', () => {
  assert.equal(Object.keys(data.cases).length, 12);
  for (const days of [2, 3]) for (const arrival of ['day', 'sleeper']) {
    const state = { dest: 'shaoxing', days, arrival };
    const plan = getPlanCase(data, state);
    assert.equal(plan.meeting.ok, false);
    assert.equal(plan.days.length, 0);
    assert.equal(calculateBudget(state, plan.defaults, plan.meeting.ok).valid, false);
  }
});

test('公开数据和文本导出均不含原出发日期或具体酒店', () => {
  const forbidden = /(?:出发日期|出行日期|入住日期|返程日期)[：:\s]*20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}|全季|亚朵|"(?:departureDate|hotelAddress|hotelName)"\s*:/;
  assert.doesNotMatch(JSON.stringify(data), forbidden);
  for (const [key, plan] of Object.entries(data.cases)) {
    const [dest, dayCount, arrival] = key.split('|');
    assert.doesNotMatch(planText(data, { dest, days: Number(dayCount), arrival }, plan.defaults), forbidden);
  }
  assert.equal(roadDistance(data, 'taian', 'stayDai', 'dai'), null);
  assert.ok(roadDistance(data, 'shaoxing', 'lu', 'shen', 'foot').km > 0);
  assert.equal(safeURL('javascript:alert(1)'), '#');
});

test('交互章节保留全部入口，HTML ID 无重复且景点不伪装成个人照片', () => {
  const ids = [...data.markup.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const id of ['compare', 'sights', 'planner', 'map', 'budget', 'trains', 'prepare', 'meeting-summary', 'plan-context', 'itinerary', 'plan-sidebar', 'budget-controls', 'budget-inputs', 'budget-result', 'trip-map', 'map-status', 'map-points', 'hotel-options', 'route-tabs', 'route-legs', 'place-panel', 'train-list', 'train-date', 'train-footnote', 'city-filter', 'copy-plan', 'download-plan', 'checklist', 'check-progress', 'toast']) assert.ok(ids.includes(id), id);
  assert.equal([...data.markup.matchAll(/<article class="sight-card">/g)].length, 8);
  assert.equal(data.photos, undefined);
});
