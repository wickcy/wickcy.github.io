export function journeyBudget(values, duration) {
  const limits = { people: [1, 20], travel: [0, 100000], lodging: [0, 100000], food: [0, 5000], local: [0, 100000], tickets: [0, 20000], reserve: [0, 50] };
  for (const [key, [min, max]] of Object.entries(limits)) {
    const value = values[key];
    if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) return null;
  }
  if (!Number.isInteger(Number(values.people)) || !Number.isInteger(duration) || duration < 1) return null;
  const people = Number(values.people);
  const base = (Number(values.travel) + Number(values.food) * duration + Number(values.tickets)) * people + Number(values.lodging) + Number(values.local);
  const total = Math.round(base * (1 + Number(values.reserve) / 100) * 100) / 100;
  return { total, perPerson: Math.round(total / people * 100) / 100 };
}

export function journeyText(guide, variantId) {
  const variant = guide.variants.find(item => item.id === variantId);
  if (!variant) throw new Error('旅行方案不存在');
  const lines = [variant.name, guide.scope, `总时长：${variant.duration} 天`, `条件：${variant.condition}`, `住宿：${variant.nights}`, '', variant.route.join(' → '), ''];
  variant.days.forEach((day, index) => {
    lines.push(`第 ${index + 1} 天｜${day.title}`, day.summary || '');
    day.stops.forEach(stop => lines.push(`${stop.time || ''} ${stop.name}`, stop.note || ''));
    lines.push('');
  });
  if (variant.extension) lines.push('可选调整：' + variant.extension, '');
  lines.push('交通核对：');
  guide.transport.forEach(item => lines.push(`${item.title}｜${item.route}`, item.duration, item.description, item.note, ''));
  lines.push('住宿区域：');
  guide.stays.forEach(item => lines.push(`${item.title}：${item.description}`));
  lines.push('', '行前清单：');
  guide.checklist.forEach(item => lines.push(`□ ${item.text}`));
  lines.push('', `资料核查：${guide.checkedAt}。时刻是查询时的公开参考，出发日开行、余票与价格以官方查询为准。`);
  guide.sources.forEach(source => lines.push(`${source.title}：${source.url}`));
  return lines.filter(line => line !== undefined).join('\n');
}
