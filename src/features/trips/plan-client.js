import { calculateBudget, distanceLabel, escapeHTML as e, getPlanCase, getTrains, legDescription, money, navigationURL, planText, roadDistance, safeURL, trainDay } from './plan-model.mjs';

export function initPlans() {
  document.querySelectorAll('[data-plan-experience]').forEach(root => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const data = JSON.parse(root.querySelector('[data-plan-data]').textContent);
    initPlan(root, data);
  });
}

function initPlan(root, data) {
  const $ = id => root.querySelector('#' + id), all = selector => root.querySelectorAll(selector);
  const state = { ...data.initial }, preferences = {};
  let plan, values, routeKey = 'all', selected, signature = '', map, layers, markers = {}, toastTimer;
  for (const destination of data.destinations) preferences[destination.id] = data.travelData.hotels[destination.id][0].id;
  const link = (url, label, className = '') => `<a class="${className}" href="${e(safeURL(url))}" target="_blank" rel="noopener">${label}</a>`;
  const notify = message => { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000); };

  function render() {
    plan = getPlanCase(data, state);
    for (const key of ['dest', 'days', 'arrival', 'direction']) all(`[data-${key}]`).forEach(button => button.setAttribute('aria-pressed', String(String(state[key]) === button.dataset[key])));
    all('[data-guide]').forEach(panel => { panel.hidden = panel.dataset.guide !== state.dest; });
    const meeting = plan.meeting;
    $('meeting-summary').innerHTML = meeting.ok ? `<div class="meeting-title"><span>两地出发，一起抵达</span><strong>${e(meeting.station)}</strong></div><div class="meet-person"><span>北京旅客</span><b>${e(meeting.beijing)}</b></div><div class="meet-gap"><strong>${meeting.gap === 0 ? '同趟到站' : `相差 ${meeting.gap} 分钟`}</strong><span>↔</span></div><div class="meet-person"><span>上海旅客</span><b>${e(meeting.shanghai)}</b></div><p>${e(meeting.detail)}</p>` : `<div class="unavailable-meeting"><strong>当前没有符合条件的完整组合</strong><p>${e(meeting.reason)}</p></div>`;
    $('plan-context').innerHTML = `<strong>${e(plan.name)} · ${state.days} 天计划</strong><span class="plan-dates">${e(plan.arrivalLabel)} · 具体日期未公开</span>${e(plan.warning)}`;
    $('itinerary').innerHTML = plan.days.map(day => `<article class="day"><div class="day-date"><b>${e(day.date)}</b><span>${e(day.weekday)}</span></div><div class="day-body"><div class="day-heading"><h3>${e(day.title)}</h3><span class="day-tag">${e(day.tag)}</span></div>${day.rows.map(row => `<div class="schedule-row"><time>${e(row.time)}</time><p><b>${e(row.title)}</b><small>${e(row.note)}</small></p></div>`).join('')}</div></article>`).join('') || '<div class="plan-empty">此汇合方式暂不排推荐行程。请切换可用方案；景点介绍可继续查看。</div>';
    const destination = data.destinations.find(item => item.id === state.dest);
    $('plan-sidebar').innerHTML = destination.sidebar ? `<div class="aside-card"><div class="eyebrow">给行程留一点余量</div><h3>${e(destination.sidebar.title)}</h3><p>${e(destination.sidebar.body)}</p></div>` : '';
    const nextSignature = `${state.dest}|${state.days}|${state.arrival}`;
    if (signature !== nextSignature) {
      signature = nextSignature;
      values = { ...plan.defaults, hotel: preferences[state.dest], nightly: data.travelData.hotels[state.dest].find(hotel => hotel.id === preferences[state.dest]).price };
      routeKey = 'all'; selected = values.hotel;
      renderHotels(); renderBudgetControls(); renderRoute();
    }
    renderTrains();
    $('map-context').textContent = meeting.ok ? `${plan.name} · ${state.days} 天 · ${plan.arrivalLabel} · 住宿片区、地图和预算同步更新` : '当前汇合方式暂无完整组合，地图仅展示位置参考，请切换可用方案。';
  }

  function renderTrains() {
    $('train-date').textContent = state.direction === 'outbound' ? `${plan.name} ${state.days} 天版 · ${plan.arrivalLabel} · 具体日期未公开` : `第 ${state.days} 天返程 · 按实际出发日重新核实`;
    $('train-list').innerHTML = (plan.meeting.ok ? getTrains(data, state) : []).map(train => {
      const fare = data.travelData.fares[train.no + '|' + train.from];
      return `<article class="ticket ${train.sleeper ? 'sleeper' : ''}"><div class="ticket-person"><b>${train.city === 'beijing' ? '北京旅客' : '上海旅客'}</b><span>${e(trainDay(train, state))}出发</span></div><div class="ticket-route"><div><div class="station-time">${e(train.dep)}</div><div class="station-name">${e(train.from)}</div></div><div class="route-middle"><strong>${e(train.no)}</strong><div class="route-line"></div><span>${e(train.duration)}</span></div><div><div class="station-time">${e(train.arr)}${train.next ? '<sup>次日</sup>' : ''}</div><div class="station-name">${e(train.to)}</div></div></div><div class="ticket-end"><span class="ticket-type">${e(train.type)}</span>${fare ? link(fare.source, `${e(fare.label)} <span>票价来源</span>`, 'ticket-fare') + (fare.note ? `<small class="fare-note">${e(fare.note)}</small>` : '') : ''}${link(data.sources[train.source], '参考时刻来源')}</div><p class="ticket-note">${e(train.note)}</p></article>`;
    }).join('') || '<div class="empty-state">此筛选下暂无已核验的参考车次，请在铁路 12306 查询。</div>';
    $('train-footnote').textContent = plan.meeting.ok ? '参考时刻与价格核查于 ' + data.checkedAt + '，不代表实际出发日开行或有票。请在购票前核实每段车次、车站及换乘条件。' : plan.meeting.reason;
  }

  function renderHotels() {
    $('hotel-options').innerHTML = data.travelData.hotels[state.dest].map(hotel => `<label class="hotel-option ${hotel.id === values.hotel ? 'chosen' : ''}"><input type="radio" name="hotel-area" value="${e(hotel.id)}" ${hotel.id === values.hotel ? 'checked' : ''}><span class="hotel-copy"><span class="hotel-heading"><b>${e(hotel.name)}</b><span>¥${hotel.range[0]}–${hotel.range[1]} <small>/ 间 / 晚</small></span></span><span>${e(hotel.why)}</span><small>${e(hotel.example)}</small><span class="hotel-foot">${link(hotel.source, '查看片区住宿')}<small>${e(hotel.pointNote)}</small></span></span></label>`).join('');
    all('[name="hotel-area"]').forEach(input => input.addEventListener('change', () => {
      values.hotel = input.value; preferences[state.dest] = input.value; values.nightly = data.travelData.hotels[state.dest].find(hotel => hotel.id === input.value).price; selected = input.value;
      renderHotels(); renderBudgetControls(); renderRoute();
    }));
  }

  function renderBudgetControls() {
    const destination = data.destinations.find(item => item.id === state.dest);
    const sleeper = state.arrival === 'sleeper' && state.dest === 'taian';
    const fields = [['nightly', '每间房 / 每晚', 10000], ['food', '餐饮 / 每人 / 每天', 2000], ['beijing', '北京旅客 / 往返铁路', 10000], ['shanghai', '上海旅客 / 往返铁路', 10000], ['local', '当地交通 / 两人', 10000], ['scenic', '门票与景区交通 / 两人', 20000]];
    $('budget-controls').innerHTML = `<div class="budget-control-head"><h3>按自己的习惯，调一调。</h3><button class="text-link" id="reset-budget" type="button">恢复参考预算</button></div><p class="budget-subtitle">住宿片区：${e(data.travelData.hotels[state.dest].find(hotel => hotel.id === values.hotel).name)}。参考范围并非已订酒店报价。</p><div class="room-line"><label>房间数<select id="budget-rooms">${[1, 2].map(number => `<option value="${number}" ${Number(values.rooms) === number ? 'selected' : ''}>${number} 间房</option>`).join('')}</select></label><label>机动预留<select id="budget-reserve">${[0, 10, 15, 20].map(number => `<option value="${number}" ${Number(values.reserve) === number ? 'selected' : ''}>${number}%</option>`).join('')}</select></label></div>${sleeper ? `<div class="bunk-controls"><label>北京去程卧铺<select id="bunk-bj"><option value="hard" ${values.bunkBJ === 'hard' ? 'selected' : ''}>硬卧 · 预算148</option><option value="soft" ${values.bunkBJ === 'soft' ? 'selected' : ''}>软卧 · 预算223</option></select></label><label>上海去程卧铺<select id="bunk-sh"><option value="second" ${values.bunkSH === 'second' ? 'selected' : ''}>二等卧 · 预算228</option><option value="first" ${values.bunkSH === 'first' ? 'selected' : ''}>一等卧 · 预算317</option></select></label></div>` : ''}<div class="money-grid">${fields.map(([id, label, max]) => `<label class="money-field"><span>${label} ¥</span><div><input id="budget-${id}" data-money="${id}" type="number" min="0" max="${max}" step="1" required value="${e(values[id])}"></div></label>`).join('')}</div>${sleeper ? `<label class="early-check"><input id="budget-early" type="checkbox" ${values.early ? 'checked' : ''}>清晨想休息：加订前一晚酒店（需酒店确认）</label>` : ''}<p class="budget-basis">${e(destination.budgetNote || "")}</p><p class="rail-basis">铁路使用参考车次与席别预算；更改车次后，请把往返金额一并更新。价格来源见交通卡片。</p>`;
    all('[data-money]').forEach(input => input.addEventListener('input', () => { values[input.dataset.money] = input.value; renderBudgetResult(); }));
    for (const key of ['rooms', 'reserve']) $('budget-' + key).addEventListener('change', event => { values[key] = Number(event.target.value); renderBudgetResult(); });
    $('budget-early')?.addEventListener('change', event => { values.early = event.target.checked; renderBudgetResult(); });
    $('bunk-bj')?.addEventListener('change', event => { values.bunkBJ = event.target.value; values.beijing = (values.bunkBJ === 'soft' ? 223 : 148) + 231; renderBudgetControls(); });
    $('bunk-sh')?.addEventListener('change', event => { values.bunkSH = event.target.value; values.shanghai = (values.bunkSH === 'first' ? 317 : 228) + 449; renderBudgetControls(); });
    $('reset-budget').addEventListener('click', () => { const hotel = values.hotel; values = { ...plan.defaults, hotel, nightly: data.travelData.hotels[state.dest].find(item => item.id === hotel).price }; renderBudgetControls(); });
    $('budget-inputs').disabled = !plan.meeting.ok;
    renderBudgetResult();
  }

  function renderBudgetResult() {
    const result = calculateBudget(state, values, plan.meeting.ok);
    if (!result.valid) { $('budget-result').innerHTML = `<div class="budget-invalid">${e(result.error)}</div>`; return; }
    const items = [['北京旅客 · 往返铁路', values.beijing], ['上海旅客 · 往返铁路', values.shanghai], [`住宿 · ${values.rooms}间 × ${result.nights}晚`, result.hotel], ['餐饮 · 两人', result.food], ['当地交通 · 两人', values.local], ['门票与景区交通 · 两人', values.scenic], [`机动预留 · ${values.reserve}%`, result.reserve]];
    $('budget-result').innerHTML = `<span class="eyebrow">出发前的小算盘</span><p class="budget-caption">两位成人 · ${e(plan.name)} ${state.days}天 · ${result.nights}晚酒店</p><div class="budget-total"><span>两人共预留</span><strong>${money(result.total)}</strong></div><div class="budget-people"><div><span>北京旅客约</span><b>${money(result.beijing)}</b></div><div><span>上海旅客约</span><b>${money(result.shanghai)}</b></div></div><p class="split-note">各自铁路 + 共用费用的一半，再加机动预算。四舍五入可能相差1元。</p><dl class="budget-lines">${items.map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${money(value)}</dd></div>`).join('')}</dl><p class="budget-hint">${state.arrival === 'sleeper' ? '卧铺夜不计酒店夜；清晨入住需酒店确认，可另外预留前一晚房费。' : state.arrival === 'night' ? '前晚到达后入住也计一晚，已包含在预算中。' : '首日上午出发，酒店按游玩天数减一晚计算。'}<br>不含两地车站接驳、购物和可选夜演。</p>`;
  }

  function selectPlace(id, pan = false) {
    selected = id;
    const place = data.travelData.places[state.dest][id];
    const road = roadDistance(data, state.dest, values.hotel, id), walk = roadDistance(data, state.dest, values.hotel, id, 'foot');
    $('place-panel').innerHTML = `<span class="eyebrow">当前地点</span><h3>${e(place.name)}</h3><p>${e(place.info)}</p><div class="place-distance">${place.kind === 'hotel' ? '大致住宿片区 · 非酒店门牌' : place.road === false ? '山上地点请按景区观光车、索道与步行分段安排。' : road ? `${distanceLabel(road)} · 打车预留 ${road.low}–${road.high} 分钟` : '具体酒店未公开，出发距离与用时请在确定酒店后查询。'}${walk && walk.km <= 4 ? `<small>步行：${distanceLabel(walk)}</small>` : ''}</div>${place.road !== false && id !== values.hotel ? link(navigationURL(data, state.dest, values.hotel, id), '查询从住宿片区到这里', 'btn btn-primary') : ''}${link(place.source, '位置参考来源', 'place-source')}<p class="place-hint">住宿标记仅表示片区中心，虚线仅表示游览顺序。</p>`;
    all('[data-place]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.place === id)));
    if (map && markers[id]) { if (pan) map.panTo(markers[id].getLatLng()); markers[id].openPopup(); }
  }

  function renderRoute() {
    const places = data.travelData.places[state.dest], routes = plan.meeting.ok ? plan.routes[values.hotel] : [];
    if (routeKey !== 'all' && !routes.some(route => route.id === routeKey)) routeKey = 'all';
    const active = routeKey === 'all' ? routes : routes.filter(route => route.id === routeKey);
    $('route-tabs').innerHTML = routes.length ? [{ id: 'all', label: '全部行程' }, ...routes].map(route => `<button type="button" data-route="${e(route.id)}" aria-pressed="${route.id === routeKey}">${e(route.label)}</button>`).join('') : '';
    $('route-legs').innerHTML = active.map(route => `<article class="route-day"><h3>${e(route.label)}</h3><ol>${route.legs.map(leg => {
      const text = legDescription(data, state.dest, leg);
      return `<li><span class="leg-mode ${e(leg.mode)}">${e(text.title)}</span><div><button type="button" class="leg-point" data-place="${e(leg.to)}">${e(places[leg.from].name)} → ${e(places[leg.to].name)}</button><p>${e(text.detail)}</p></div>${['car', 'foot'].includes(leg.mode) ? link(navigationURL(data, state.dest, leg.from, leg.to, leg.mode), '导航') : ''}</li>`;
    }).join('')}</ol></article>`).join('') || '<p class="map-intro">暂无可用路线组合，地图和地点列表仅作参考。</p>';
    $('route-tabs').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { routeKey = button.dataset.route; renderRoute(); }));
    const ids = routes.length ? [...new Set(active.flatMap(route => route.legs.flatMap(leg => [leg.from, leg.to])))] : Object.keys(places).filter(id => places[id].kind !== 'hotel' || id === values.hotel);
    $('map-points').innerHTML = ids.map(id => `<button type="button" data-place="${e(id)}" aria-pressed="${id === selected}">${places[id].kind === 'hotel' ? '⌂' : places[id].kind === 'station' ? '▣' : '●'} ${e(places[id].name)}</button>`).join('');
    for (const container of [$('route-legs'), $('map-points')]) container.querySelectorAll('[data-place]').forEach(button => button.addEventListener('click', () => selectPlace(button.dataset.place, true)));
    const L = window.L;
    if (L) {
      if (!map) {
        map = L.map($('trip-map'), { scrollWheelZoom: false }).setView([36.2, 117.1], 12);
        map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
        layers = L.layerGroup().addTo(map);
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' });
        tiles.on('tileerror', () => { $('map-status').textContent = '底图网络暂不可用；地点、游览顺序和文字路线仍可查看。'; });
        tiles.on('load', () => { $('map-status').textContent = '可拖动、缩放与点选；虚线表示游览顺序。住宿点为片区中心。'; });
        tiles.addTo(map);
      }
      layers.clearLayers(); markers = {};
      const coordinates = data.travelData.routing.coordinates[state.dest];
      for (const route of active) for (const leg of route.legs) L.polyline([coordinates[leg.from], coordinates[leg.to]], { color: ['bus', 'cable'].includes(leg.mode) ? '#b66843' : '#316755', weight: 3, opacity: .75, dashArray: '6 7' }).addTo(layers);
      ids.forEach((id, index) => {
        const place = places[id];
        markers[id] = L.marker(coordinates[id], { title: place.name, keyboard: true, icon: L.divIcon({ className: 'trip-marker', html: `<span class="pin ${e(place.kind)}">${place.kind === 'hotel' ? '⌂' : place.kind === 'station' ? '▣' : index + 1}</span>`, iconSize: [32, 40], iconAnchor: [16, 38] }) }).bindPopup(e(place.name)).addTo(layers).on('click', () => selectPlace(id));
      });
      map.invalidateSize();
      if (ids.length) map.fitBounds(L.latLngBounds(ids.map(id => coordinates[id])), { padding: [35, 35], maxZoom: 15 });
    } else $('map-status').textContent = '地图组件暂不可用，请使用地点列表与文字路线。';
    selectPlace(ids.includes(selected) ? selected : values.hotel);
  }

  all('[data-dest],[data-days],[data-arrival],[data-direction]').forEach(button => button.addEventListener('click', () => {
    for (const key of ['dest', 'days', 'arrival', 'direction']) if (button.dataset[key] !== undefined) state[key] = key === 'days' ? Number(button.dataset[key]) : button.dataset[key];
    if (button.dataset.dest) state.arrival = state.dest === 'shaoxing' ? 'night' : state.days === 3 ? 'sleeper' : 'day';
    render();
  }));
  all('[data-pick]').forEach(button => button.addEventListener('click', () => { state.dest = button.dataset.pick; state.arrival = state.dest === 'shaoxing' ? 'night' : state.days === 3 ? 'sleeper' : 'day'; render(); $('planner').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }));
  $('city-filter').addEventListener('change', event => { state.city = event.target.value; renderTrains(); });
  function download() {
    const url = URL.createObjectURL(new Blob([planText(data, state, values)], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${data.title}-${plan.name}-${state.days}天-公开版.txt`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('download-plan').addEventListener('click', () => { download(); notify('公开版行程已下载，含参考车次与来源。'); });
  $('copy-plan').addEventListener('click', async () => { try { await navigator.clipboard.writeText(planText(data, state, values)); notify('已复制公开版行程。'); } catch { download(); notify('浏览器无法复制，已改为下载公开版行程。'); } });
  const storageKey = `travel-memories:${data.id}:checklist:v1`;
  let checked = [];
  try { const stored = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(stored)) checked = stored.filter(number => Number.isInteger(number) && number >= 0 && number < data.tasks.length); } catch { /* Browser storage is optional. */ }
  $('checklist').innerHTML = data.tasks.map((task, index) => `<label class="check-row"><input type="checkbox" value="${index}" ${checked.includes(index) ? 'checked' : ''}><span>${e(task)}</span></label>`).join('');
  const progress = () => { $('check-progress').textContent = `${$('checklist').querySelectorAll(':checked').length} / ${data.tasks.length}`; };
  $('checklist').addEventListener('change', () => { const items = [...$('checklist').querySelectorAll(':checked')].map(input => Number(input.value)); try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { notify('浏览器未允许保存，勾选仅在本次页面保留。'); } progress(); });
  progress(); render();
}
