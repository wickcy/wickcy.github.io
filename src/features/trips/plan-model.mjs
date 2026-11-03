export const caseKey = state => `${state.dest}|${state.days}|${state.arrival}`;
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const safeURL = value => {
  const url = String(value ?? '');
  return /^https:\/\//i.test(url) || /^\/(?!\/)/.test(url) ? url : '#';
};
export const money = value => '¥' + Math.round(value).toLocaleString('zh-CN');
export const getPlanCase = (data, state) => data.cases[caseKey(state)];
export const getTrains = (data, state) => data.trains.filter(train => train.dest === state.dest && train.dir === state.direction && (state.city === 'all' || train.city === state.city) && (train.dir === 'return' || train.arrival === state.arrival));
export const trainDay = (train, state) => train.when === 'eve' ? '前一晚' : train.when === 'first' ? '第 1 天' : `第 ${state.days} 天`;

export function calculateBudget(state, values, valid = true) {
  if (!valid) return { valid: false, error: '此汇合方式暂无完整车次组合，请先切换可用方案。' };
  const limits = { rooms: [1, 2], nightly: [0, 10000], food: [0, 2000], local: [0, 10000], scenic: [0, 20000], beijing: [0, 10000], shanghai: [0, 10000], reserve: [0, 30] };
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (values[key] === '' || values[key] === null || !Number.isFinite(Number(values[key])) || Number(values[key]) < min || Number(values[key]) > max) return { valid: false, error: '请填写完整、合理的预算金额，输入项不能留空。' };
  }
  if (![1, 2].includes(Number(values.rooms))) return { valid: false, error: '房间数请选择 1 或 2。' };
  const nights = state.days - 1 + (state.arrival === 'night' ? 1 : 0) + (state.arrival === 'sleeper' && values.early ? 1 : 0);
  const hotel = Number(values.nightly) * Number(values.rooms) * nights;
  const food = Number(values.food) * 2 * state.days;
  const shared = hotel + food + Number(values.local) + Number(values.scenic);
  const rail = Number(values.beijing) + Number(values.shanghai);
  const base = shared + rail;
  const reserve = base * Number(values.reserve) / 100;
  return { valid: true, nights, hotel, food, shared, rail, base, reserve, total: base + reserve, beijing: (Number(values.beijing) + shared / 2) * (1 + Number(values.reserve) / 100), shanghai: (Number(values.shanghai) + shared / 2) * (1 + Number(values.reserve) / 100) };
}

export function roadDistance(data, city, from, to, mode = 'car') {
  const matrix = data.travelData.routing.cities[city];
  const a = matrix.keys.indexOf(from), b = matrix.keys.indexOf(to), route = matrix[mode];
  if (!route || a < 0 || b < 0 || route.distances[a][b] === null || route.durations[a][b] === null || route.snap?.[a] > 300 || route.snap?.[b] > 300) return null;
  const km = route.distances[a][b] / 1000, raw = route.durations[a][b] / 60;
  if (mode === 'foot') return { km, low: Math.max(1, Math.ceil(raw)), high: Math.max(2, Math.ceil(raw * 1.2 + 3)) };
  let low = Math.max(10, Math.ceil((raw * 1.25 + 10) / 5) * 5), high = Math.ceil((low + Math.max(10, raw * .45)) / 5) * 5;
  if (['taian', 'north'].includes(from) || ['taian', 'north'].includes(to)) { low = Math.max(30, low); high = Math.max(45, high); }
  return { km, low, high };
}
export const distanceLabel = route => route.km < 1 ? `${Math.round(route.km * 1000 / 50) * 50} 米` : `${route.km.toFixed(1)} 公里`;

export function navigationURL(data, city, from, to, mode = 'car') {
  const places = data.travelData.places[city], a = places[from], b = places[to];
  if (a.kind === 'hotel' || b.kind === 'hotel') return 'https://www.amap.com/search?query=' + encodeURIComponent(`${a.name} 到 ${b.name}`);
  return `https://uri.amap.com/navigation?from=${a.ll[1]},${a.ll[0]},${encodeURIComponent(a.name)}&to=${b.ll[1]},${b.ll[0]},${encodeURIComponent(b.name)}&mode=${mode === 'foot' ? 'walk' : 'car'}&coordinate=gaode&src=travel-memories&callnative=0`;
}

export function legDescription(data, city, leg) {
  if (leg.mode === 'bus') return { title: '景区观光车', detail: leg.note };
  if (leg.mode === 'cable') return { title: '索道 + 山顶步行', detail: leg.note };
  const places = data.travelData.places[city];
  if (places[leg.from].kind === 'hotel' || places[leg.to].kind === 'hotel') return { title: leg.mode === 'foot' ? '步行' : '打车 / 驾车', detail: '住宿仅展示大致片区，距离与时间请在确定酒店后复核。' };
  const route = roadDistance(data, city, leg.from, leg.to, leg.mode);
  return { title: leg.mode === 'foot' ? '步行' : '打车 / 驾车', detail: route ? `${distanceLabel(route)} · 预留 ${route.low}–${route.high} 分钟` : '道路资料暂缺，请打开导航确认。' };
}

export function planText(data, state, values) {
  const plan = getPlanCase(data, state);
  const lines = [`${data.title}｜${plan.name} ${state.days} 天`, '公开版：具体日期和酒店未公开。', `汇合方式：${plan.arrivalLabel}`, '', plan.warning, ''];
  for (const day of plan.days) {
    lines.push(`${day.weekday}｜${day.title}`);
    for (const row of day.rows) lines.push(`${row.time} ${row.title}`, row.note);
    lines.push('');
  }
  if (plan.meeting.ok) {
    lines.push('参考车次（非实际出发日实时车票）：');
    const trains = getTrains(data, { ...state, direction: 'outbound', city: 'all' }).concat(getTrains(data, { ...state, direction: 'return', city: 'all' }));
    for (const train of trains) lines.push(`${trainDay(train, state)} ${train.no} ${train.from} ${train.dep} → ${train.to} ${train.arr}${train.next ? '（次日）' : ''}`, data.sources[train.source]);
    const result = calculateBudget(state, values);
    if (result.valid) {
      lines.push('', `参考预算：两人共 ${money(result.total)}，北京旅客约 ${money(result.beijing)}，上海旅客约 ${money(result.shanghai)}。`, `住宿：${values.rooms} 间 × ${result.nights} 晚 × ${money(values.nightly)}；餐饮 ${money(result.food)}；当地交通 ${money(values.local)}；门票与景区交通 ${money(values.scenic)}；机动 ${values.reserve}%。`, '', '路线与距离（非实时导航）：');
      for (const route of plan.routes[values.hotel]) {
        lines.push(route.label);
        for (const leg of route.legs) lines.push(`${data.travelData.places[state.dest][leg.from].name} → ${data.travelData.places[state.dest][leg.to].name}：${legDescription(data, state.dest, leg).detail}`);
      }
    } else lines.push('', '预算：' + result.error);
  }
  lines.push('', `资料核查日：${data.checkedAt}。车次、开行、票价和席位以铁路 12306 为准：https://www.12306.cn/index/`);
  return lines.join('\n');
}
