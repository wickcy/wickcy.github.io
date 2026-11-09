import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journeyBudget, journeyText } from './journey-model.mjs';

const values = { people: '2', travel: '3000', lodging: '1200', food: '100', local: '1500', tickets: '300', reserve: '10' };
test('预算区分人均费用、全员费用与包含返程的总天数', () => {
  const result = journeyBudget(values, 5);
  // (3000 + 100 × 5 + 300) × 2 + 1200 + 1500, then add 10%.
  assert.equal(result.total, 11330);
  assert.equal(result.perPerson, 5665);
  assert.equal(Math.round(result.total - journeyBudget(values, 4).total), 220);
});
test('预算不把空报价当成免费，拒绝无效人数和金额', () => {
  for (const change of [{ travel: '' }, { people: '1.5' }, { people: 0 }, { local: -1 }, { tickets: Infinity }, { reserve: 51 }]) {
    assert.equal(journeyBudget({ ...values, ...change }, 5), null);
  }
  assert.notEqual(journeyBudget({ ...values, travel: 0 }, 5), null);
});
const { guide } = JSON.parse(readFileSync(new URL('../../../content/trips/mohe-new-year-2027/plans.json', import.meta.url), 'utf8'));
test('漠河各方案都包含末日凌晨回沪，导出保留成立条件和来源', () => {
  for (const variant of guide.variants) {
    assert.equal(variant.days.length, variant.duration);
    assert.match(variant.days.at(-1).title, /凌晨抵达上海/);
    const output = journeyText(guide, variant.id);
    assert.ok(output.includes(variant.condition));
    assert.ok(output.includes(variant.nights));
    assert.match(output, /次日 00:55/);
    assert.match(output, /https:\/\/hk\.ch\.com/);
    assert.ok(output.includes(`第 ${variant.duration} 天｜凌晨抵达上海`));
    assert.ok(!output.includes(`第 ${variant.duration + 1} 天｜`));
  }
  assert.throws(() => journeyText(guide, 'missing'), /方案不存在/);
});
