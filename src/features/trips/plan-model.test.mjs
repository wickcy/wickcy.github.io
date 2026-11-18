import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { calculateBudget, getPlanCase, planText, roadDistance, safeURL } from './plan-model.mjs';

const data = JSON.parse(fs.readFileSync(new URL('../../../content/trips/autumn-meet-2026/plans.json', import.meta.url), 'utf8'));

test('绍兴默认三天方案含前一晚住宿及双方预算分摊', () => {
  assert.deepEqual(data.initial, { dest: 'shaoxing', days: 3, arrival: 'night', direction: 'outbound', city: 'all' });
  const result = calculateBudget(data.initial, getPlanCase(data, data.initial).defaults);
  assert.equal(Math.round(result.total), 4227);
  assert.equal(Math.round(result.beijing), 2739);
  assert.equal(Math.round(result.shanghai), 1488);
  assert.equal(result.nights, 3);
});

test('前晚入住与额外清晨房费分别计晚数，金额无效时不产生合计', () => {
  const state = { dest: 'shaoxing', days: 3, arrival: 'night' };
  const values = getPlanCase(data, state).defaults;
  assert.equal(calculateBudget(state, values).nights, 3);
  assert.equal(calculateBudget({ ...state, arrival: 'sleeper' }, { ...values, early: true }).nights, 3);
  assert.equal(calculateBudget(state, { ...values, nightly: '' }).valid, false);
  assert.equal(calculateBudget(state, { ...values, rooms: 1.5 }).valid, false);
  assert.equal(calculateBudget(state, { ...values, food: -1 }).valid, false);
});

test('只提供绍兴的两种前一晚汇合方案', () => {
  assert.deepEqual(Object.keys(data.cases), ['shaoxing|2|night', 'shaoxing|3|night']);
  assert.deepEqual(data.destinations.map(destination => destination.id), ['shaoxing']);
  assert.doesNotMatch(JSON.stringify(data), /泰安|泰山|taian|taishan/);
  for (const days of [2, 3]) {
    const state = { ...data.initial, days };
    const plan = getPlanCase(data, state);
    assert.equal(plan.meeting.ok, true);
    assert.equal(plan.days.length, days + 1);
    assert.equal(calculateBudget(state, plan.defaults).nights, days);
    assert.equal(calculateBudget(state, plan.defaults, false).valid, false);
  }
});

test('公开数据和文本导出均不含原出发日期或具体酒店', () => {
  const forbidden = /(?:出发日期|出行日期|入住日期|返程日期)[：:\s]*20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}|全季|亚朵|"(?:departureDate|hotelAddress|hotelName)"\s*:/;
  assert.doesNotMatch(JSON.stringify(data), forbidden);
  for (const [key, plan] of Object.entries(data.cases)) {
    const [dest, dayCount, arrival] = key.split('|');
    assert.doesNotMatch(planText(data, { dest, days: Number(dayCount), arrival }, plan.defaults), forbidden);
  }
  assert.equal(roadDistance(data, 'shaoxing', 'stayCang', 'lu'), null);
  assert.ok(roadDistance(data, 'shaoxing', 'lu', 'shen', 'foot').km > 0);
  assert.equal(safeURL('javascript:alert(1)'), '#');
});

test('交互章节保留全部入口，HTML ID 无重复且景点不伪装成个人照片', () => {
  const ids = [...data.markup.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const id of ['compare', 'sights', 'planner', 'map', 'budget', 'trains', 'prepare', 'meeting-summary', 'plan-context', 'itinerary', 'plan-sidebar', 'budget-controls', 'budget-inputs', 'budget-result', 'trip-map', 'map-status', 'map-points', 'hotel-options', 'route-tabs', 'route-legs', 'place-panel', 'train-list', 'train-date', 'train-footnote', 'city-filter', 'copy-plan', 'download-plan', 'checklist', 'check-progress', 'toast']) assert.ok(ids.includes(id), id);
  assert.equal([...data.markup.matchAll(/<article class="sight-card">/g)].length, 5);
  assert.equal(data.photos, undefined);
});
