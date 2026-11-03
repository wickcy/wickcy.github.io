import { WORLD_VIEW, clampView, fitBounds, geometryBounds, geometryToPath, project, zoomView } from './geometry.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgElement(name, attributes = {}, text) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

class WorldAtlas extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = 'true';
    const svg = this.querySelector('.atlas-map');
    const select = this.querySelector('[data-country-select]');
    const provinceSelect = this.querySelector('[data-province-select]');
    const regionFilter = this.querySelector('[data-region-filter]');
    const viewLabel = this.querySelector('[data-view-label]');
    const note = this.querySelector('[data-map-note]');
    const countries = [...this.querySelectorAll('[data-country]')];
    const provinces = [...this.querySelectorAll('[data-province]')];
    const cities = [...svg.querySelectorAll('[data-city]')];
    const cityItems = [...this.querySelectorAll('[data-city-item]')];
    const areas = this.querySelector('[data-city-areas]');
    const localLabels = this.querySelector('[data-local-labels]');
    const empty = this.querySelector('[data-filter-empty]');
    const availableRegions = new Set(this.dataset.cityRegions.split(','));
    const cityByCode = new Map(cities.filter(city => city.dataset.countryCode === 'CHN' && city.dataset.cityCode)
      .map(city => [city.dataset.cityCode, city]));
    const visitedRegions = [...new Set(cities.filter(city => city.dataset.countryCode === 'CHN').map(city => city.dataset.regionCode).filter(Boolean))];
    const cache = new Map();
    const pending = new Map();
    const pointers = new Map();
    let countryCode = this.dataset.initialCountry;
    let provinceCode = '';
    let aspect = svg.getBoundingClientRect().width / svg.getBoundingClientRect().height || 2;
    let view = { ...WORLD_VIEW };
    let drag;
    let movedAt = 0;
    let gestureMoved = false;

    const chinaBounds = () => {
      const bounds = provinces.map(path => path.dataset.bounds.split(',').map(Number));
      return [Math.min(...bounds.map(b => b[0])), Math.min(...bounds.map(b => b[1])),
        Math.max(...bounds.map(b => b[2])), Math.max(...bounds.map(b => b[3]))];
    };
    const renderView = () => {
      svg.setAttribute('viewBox', [view.x, view.y, view.width, view.height].join(' '));
      svg.dataset.zoomed = String(view.width < 480);
      svg.dataset.china = String(countryCode === 'CHN');
      const units = view.width / Math.max(1, svg.getBoundingClientRect().width);
      for (const city of cities) {
        city.querySelector('.atlas-city-dot').setAttribute('r', String(5.5 * units));
        city.querySelector('.atlas-city-halo').setAttribute('r', String(11 * units));
        const label = city.querySelector('text');
        label.style.fontSize = 14 * units + 'px';
        label.style.strokeWidth = 4 * units + 'px';
        label.setAttribute('dx', String(13 * units));
        label.setAttribute('dy', String(5 * units));
      }
      svg.querySelectorAll('.atlas-province-labels text, .atlas-local-labels text').forEach(label => {
        label.style.fontSize = 12 * units + 'px';
        label.style.strokeWidth = 3 * units + 'px';
      });
      const occupied = cities.filter(city => city.style.display !== 'none').map(city => city.getBoundingClientRect());
      const regionLabels = [...svg.querySelectorAll('[data-region-label]')].map(label => ({
        label, bounds: provinces.find(path => path.dataset.province === label.dataset.regionLabel).dataset.bounds.split(',').map(Number),
      })).sort((a, b) => (b.bounds[2] - b.bounds[0]) * (b.bounds[3] - b.bounds[1]) - (a.bounds[2] - a.bounds[0]) * (a.bounds[3] - a.bounds[1]));
      for (const { label, bounds } of regionLabels) {
        const rect = label.getBoundingClientRect();
        const fits = ((bounds[2] - bounds[0]) / units > rect.width + 8 || label.dataset.regionLabel === '710000')
          && !occupied.some(other => rect.left < other.right + 4 && rect.right > other.left - 4
            && rect.top < other.bottom + 4 && rect.bottom > other.top - 4);
        label.style.visibility = fits ? 'visible' : 'hidden';
        if (fits) occupied.push(rect);
      }
      for (const label of localLabels.children) {
        const rect = label.getBoundingClientRect();
        const fits = !occupied.some(other => rect.left < other.right + 3 && rect.right > other.left - 3
          && rect.top < other.bottom + 3 && rect.bottom > other.top - 3);
        label.style.visibility = fits ? 'visible' : 'hidden';
        if (fits) occupied.push(rect);
      }
      this.querySelectorAll('[data-scope]').forEach(button => button.setAttribute('aria-pressed',
        String(button.dataset.scope === (countryCode === 'CHN' ? 'china' : 'world'))));
    };

    const renderAreas = () => {
      areas.replaceChildren();
      localLabels.replaceChildren();
      if (countryCode !== 'CHN') return;
      const regionCodes = provinceCode ? [provinceCode] : visitedRegions;
      for (const code of regionCodes) {
        for (const feature of cache.get(code)?.features || []) {
          const city = cityByCode.get(feature.properties.code);
          if (!provinceCode && !city) continue;
          const path = svgElement('path', {
            d: geometryToPath(feature.geometry), 'fill-rule': 'evenodd',
            'data-area': feature.properties.code, 'data-region-code': code,
            'data-bounds': geometryBounds(feature.geometry).join(','),
            class: city ? 'is-visited' : '',
          });
          path.append(svgElement('title', {}, feature.properties.name + (city ? ' · 已到访 · 查看旅行记录' : '')));
          if (city) {
            const link = svgElement('a', { href: city.getAttribute('href'), 'aria-label': city.getAttribute('aria-label') });
            link.append(path);
            areas.append(link);
          } else areas.append(path);
          if (provinceCode && !city) {
            const [x, y] = project(feature.properties.label);
            localLabels.append(svgElement('text', { x, y }, feature.properties.name));
          }
        }
      }
      renderView();
    };
    const loadRegion = async code => {
      if (!availableRegions.has(code) || cache.has(code)) return;
      if (!pending.has(code)) {
        const request = fetch('/maps/china-cities/' + code + '.json').then(async response => {
          if (!response.ok) throw new Error('City boundaries unavailable');
          const data = await response.json();
          if (!Array.isArray(data.features)) throw new Error('Invalid city boundaries');
          cache.set(code, data);
        }).finally(() => pending.delete(code));
        pending.set(code, request);
      }
      await pending.get(code);
    };
    const requestAreas = async () => {
      if (countryCode !== 'CHN') return;
      const requestedProvince = provinceCode;
      const codes = provinceCode ? [provinceCode] : visitedRegions;
      note.textContent = provinceCode ? '正在展开城市…' : '点击省份，展开城市';
      const results = await Promise.allSettled(codes.map(loadRegion));
      // Render from the current selection so slower requests cannot restore an old province.
      renderAreas();
      if (countryCode !== 'CHN' || provinceCode !== requestedProvince) return;
      note.textContent = results.some(result => result.status === 'rejected')
        ? '城市边界加载失败，可从下方列表翻阅旅行'
        : provinceCode ? '橙色区域与标记，是已到访的城市' : '点击省份，展开城市';
    };

    const updateFilters = () => {
      select.value = countryCode;
      provinceSelect.value = provinceCode;
      regionFilter.hidden = countryCode !== 'CHN';
      if (provinceCode) svg.dataset.province = provinceCode;
      else delete svg.dataset.province;
      countries.forEach(path => path.classList.toggle('is-selected', path.dataset.country === countryCode));
      provinces.forEach(path => path.classList.toggle('is-selected', path.dataset.province === provinceCode));
      const matches = element => (!countryCode || element.dataset.countryCode === countryCode)
        && (!provinceCode || element.dataset.regionCode === provinceCode);
      cityItems.forEach(item => { item.hidden = !matches(item); });
      cities.forEach(city => { city.style.display = matches(city) ? '' : 'none'; });
      empty.hidden = !countryCode || cityItems.some(item => !item.hidden) || cityItems.length === 0;
      const province = provinces.find(path => path.dataset.province === provinceCode);
      viewLabel.textContent = province ? '中国 · ' + province.dataset.name : countryCode === 'CHN'
        ? '中国 · 省市足迹' : countryCode ? select.selectedOptions[0]?.textContent : '全球视图';
      note.hidden = countryCode !== 'CHN';
      renderAreas();
    };
    const filterCountry = code => {
      countryCode = code;
      provinceCode = '';
      const country = countries.find(path => path.dataset.country === code);
      if (code === 'CHN') view = fitBounds(chinaBounds(), aspect);
      else if (country) view = fitBounds(country.dataset.bounds.split(',').map(Number), aspect);
      else {
        const points = cities.filter(city => city.dataset.countryCode === code).map(city => city.querySelector('circle'));
        view = points.length ? fitBounds([
          Math.min(...points.map(point => +point.getAttribute('cx'))), Math.min(...points.map(point => +point.getAttribute('cy'))),
          Math.max(...points.map(point => +point.getAttribute('cx'))), Math.max(...points.map(point => +point.getAttribute('cy'))),
        ], aspect) : clampView(WORLD_VIEW, aspect);
      }
      updateFilters();
      renderView();
      void requestAreas();
    };
    const filterProvince = code => {
      countryCode = 'CHN';
      provinceCode = code;
      const province = provinces.find(path => path.dataset.province === code);
      view = fitBounds(province ? province.dataset.bounds.split(',').map(Number) : chinaBounds(), aspect);
      updateFilters();
      renderView();
      void requestAreas();
    };
    this.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => {
      view = zoomView(view, button.dataset.zoom === 'in' ? 1.5 : 1 / 1.5, [0.5, 0.5], aspect);
      renderView();
    }));
    this.querySelectorAll('[data-scope]').forEach(button => button.addEventListener('click', () => filterCountry(button.dataset.scope === 'china' ? 'CHN' : '')));
    this.querySelector('[data-reset]').addEventListener('click', () => { pointers.clear(); filterCountry(''); });
    select.addEventListener('change', () => filterCountry(select.value));
    provinceSelect.addEventListener('change', () => filterProvince(provinceSelect.value));
    this.querySelectorAll('[data-locate-city]').forEach(button => button.addEventListener('click', () => {
      const city = cities.find(marker => marker.dataset.city === button.dataset.locateCity);
      if (!city) return;
      if (city.dataset.countryCode === 'CHN') filterProvince(city.dataset.regionCode || '');
      else filterCountry(city.dataset.countryCode);
      const point = city.querySelector('circle');
      const x = +point.getAttribute('cx');
      const y = +point.getAttribute('cy');
      const boundary = cache.get(city.dataset.regionCode)?.features.find(feature => feature.properties.code === city.dataset.cityCode);
      view = fitBounds(boundary ? geometryBounds(boundary.geometry) : [x - 2, y - 2, x + 2, y + 2], aspect);
      renderView();
      svg.focus({ preventScroll: true });
      svg.scrollIntoView({ block: 'center', behavior: 'instant' });
    }));
    svg.addEventListener('click', event => {
      if (Date.now() - movedAt <= 250) { event.preventDefault(); return; }
      if (event.target.closest('a')) return;
      const area = event.target.closest('[data-area]');
      const province = event.target.closest('[data-province]');
      const country = event.target.closest('[data-country]');
      if (area) { view = fitBounds(area.dataset.bounds.split(',').map(Number), aspect); renderView(); }
      else if (province) filterProvince(province.dataset.province);
      else if (country) filterCountry(country.dataset.country);
    });
    svg.addEventListener('wheel', event => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      view = zoomView(view, Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * .003),
        [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height], aspect);
      renderView();
    }, { passive: false });
    svg.addEventListener('keydown', event => {
      if (event.target !== svg) return;
      const movement = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (movement) view = clampView({ ...view, x: view.x + movement[0] * view.width / 8, y: view.y + movement[1] * view.height / 8 }, aspect);
      else if (['+', '=', '-'].includes(event.key)) view = zoomView(view, event.key === '-' ? 1 / 1.5 : 1.5, [0.5, 0.5], aspect);
      else if (event.key === 'Home') filterCountry('');
      else return;
      event.preventDefault();
      renderView();
    });
    const beginGesture = () => {
      const points = [...pointers.values()];
      drag = { view: { ...view }, points, distance: points.length === 2 ? distance(...points) : 0 };
    };
    svg.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      if (pointers.size === 0) gestureMoved = false;
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      event.target.setPointerCapture(event.pointerId);
      svg.classList.add('is-dragging');
      beginGesture();
    });
    svg.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      const points = [...pointers.values()];
      const rect = svg.getBoundingClientRect();
      if (points.length === 2 && drag.points.length === 2) {
        const initialMid = midpoint(drag.points);
        const currentMid = midpoint(points);
        view = zoomView(drag.view, distance(...points) / Math.max(1, drag.distance),
          [(initialMid[0] - rect.left) / rect.width, (initialMid[1] - rect.top) / rect.height], aspect);
        view = clampView({ ...view, x: view.x - (currentMid[0] - initialMid[0]) * view.width / rect.width,
          y: view.y - (currentMid[1] - initialMid[1]) * view.height / rect.height }, aspect);
        movedAt = Date.now();
        gestureMoved = true;
      } else if (points.length === 1 && drag.points.length === 1) {
        const dx = points[0][0] - drag.points[0][0];
        const dy = points[0][1] - drag.points[0][1];
        if (Math.abs(dx) + Math.abs(dy) > 4) { movedAt = Date.now(); gestureMoved = true; }
        view = clampView({ ...drag.view, x: drag.view.x - dx * drag.view.width / rect.width,
          y: drag.view.y - dy * drag.view.height / rect.height }, aspect);
      }
      renderView();
    });
    const endGesture = event => {
      pointers.delete(event.pointerId);
      if (pointers.size) beginGesture();
      else {
        svg.classList.remove('is-dragging');
        if (gestureMoved) movedAt = Date.now();
      }
    };
    svg.addEventListener('pointerup', endGesture);
    svg.addEventListener('pointercancel', endGesture);
    svg.addEventListener('lostpointercapture', endGesture);
    svg.addEventListener('dragstart', event => event.preventDefault());
    new ResizeObserver(() => {
      const rect = svg.getBoundingClientRect();
      const nextAspect = rect.width / rect.height;
      if (!Number.isFinite(nextAspect) || nextAspect <= 0) return;
      const centerY = view.y + view.height / 2;
      aspect = nextAspect;
      view = clampView({ ...view, y: centerY - view.width / aspect / 2 }, aspect);
      renderView();
    }).observe(svg);
    filterCountry(countryCode);
  }
}
function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function midpoint(points) { return [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2]; }
if (!customElements.get('world-atlas')) customElements.define('world-atlas', WorldAtlas);
