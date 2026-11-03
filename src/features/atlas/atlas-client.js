import { WORLD_VIEW, clampView, fitBounds, zoomView } from './geometry.mjs';

class WorldAtlas extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = 'true';
    const svg = this.querySelector('.atlas-map');
    const select = this.querySelector('[data-country-select]');
    const viewLabel = this.querySelector('[data-view-label]');
    const countries = [...this.querySelectorAll('[data-country]')];
    const cityItems = [...this.querySelectorAll('[data-city-item]')];
    const empty = this.querySelector('[data-filter-empty]');
    const pointers = new Map();
    let view = { ...WORLD_VIEW };
    let drag;
    let movedAt = 0;

    const renderView = () => {
      svg.setAttribute('viewBox', [view.x, view.y, view.width, view.height].join(' '));
      svg.dataset.zoomed = String(view.width < 480);
      const units = view.width / Math.max(1, svg.getBoundingClientRect().width);
      svg.querySelectorAll('.atlas-city').forEach((city) => {
        city.querySelector('circle').setAttribute('r', String(4.5 * units));
        const label = city.querySelector('text');
        label.style.fontSize = 12 * units + 'px';
        label.setAttribute('dx', String(10 * units));
        label.setAttribute('dy', String(4 * units));
      });
    };

    const filterCountry = (code, focus = true) => {
      const country = countries.find((path) => path.dataset.country === code);
      select.value = code;
      countries.forEach((path) => path.classList.toggle('is-selected', path === country));
      let count = 0;
      cityItems.forEach((item) => {
        item.hidden = Boolean(code && item.dataset.countryCode !== code);
        if (!item.hidden) count++;
      });
      empty.hidden = !code || count > 0;
      viewLabel.textContent = country?.dataset.name || (code ? select.selectedOptions[0]?.textContent : '全球视图');
      if (focus && country) view = fitBounds(country.dataset.bounds.split(',').map(Number));
      if (focus && code && !country) {
        const points = [...svg.querySelectorAll('[data-city]')]
          .filter((city) => city.dataset.countryCode === code)
          .map((city) => city.querySelector('circle'));
        if (points.length) {
          const xs = points.map((point) => Number(point.getAttribute('cx')));
          const ys = points.map((point) => Number(point.getAttribute('cy')));
          view = fitBounds([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
        }
      }
      if (!code && focus) view = { ...WORLD_VIEW };
      renderView();
    };

    this.querySelectorAll('[data-zoom]').forEach((button) => {
      button.addEventListener('click', () => {
        view = zoomView(view, button.dataset.zoom === 'in' ? 1.5 : 1 / 1.5);
        renderView();
      });
    });
    this.querySelector('[data-reset]').addEventListener('click', () => {
      pointers.clear();
      filterCountry('');
    });
    select.addEventListener('change', () => filterCountry(select.value));

    svg.addEventListener('click', (event) => {
      const country = event.target.closest('[data-country]');
      if (country && Date.now() - movedAt > 250) filterCountry(country.dataset.country);
    });
    svg.addEventListener('keydown', (event) => {
      const movement = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (movement) {
        event.preventDefault();
        view = clampView({ ...view, x: view.x + movement[0] * view.width / 8, y: view.y + movement[1] * view.height / 8 });
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        view = zoomView(view, 1.5);
      } else if (event.key === '-') {
        event.preventDefault();
        view = zoomView(view, 1 / 1.5);
      } else if (event.key === 'Home') {
        event.preventDefault();
        filterCountry('');
      } else return;
      renderView();
    });

    const beginGesture = () => {
      const points = [...pointers.values()];
      drag = { view: { ...view }, points, distance: points.length === 2 ? distance(...points) : 0 };
    };
    svg.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('[data-city]')) return;
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      event.target.setPointerCapture(event.pointerId);
      svg.classList.add('is-dragging');
      beginGesture();
    });
    svg.addEventListener('pointermove', (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      const points = [...pointers.values()];
      const rect = svg.getBoundingClientRect();
      if (points.length === 2 && drag.points.length === 2) {
        const midpoint = [(drag.points[0][0] + drag.points[1][0]) / 2, (drag.points[0][1] + drag.points[1][1]) / 2];
        view = zoomView(drag.view, distance(...points) / Math.max(1, drag.distance),
          [(midpoint[0] - rect.left) / rect.width, (midpoint[1] - rect.top) / rect.height]);
        movedAt = Date.now();
      } else if (points.length === 1 && drag.points.length === 1) {
        const dx = points[0][0] - drag.points[0][0];
        const dy = points[0][1] - drag.points[0][1];
        if (Math.abs(dx) + Math.abs(dy) > 4) movedAt = Date.now();
        const units = drag.view.width / rect.width;
        view = clampView({ ...drag.view, x: drag.view.x - dx * units, y: drag.view.y - dy * units });
      }
      renderView();
    });
    const endGesture = (event) => {
      pointers.delete(event.pointerId);
      if (pointers.size) beginGesture();
      else svg.classList.remove('is-dragging');
    };
    svg.addEventListener('pointerup', endGesture);
    svg.addEventListener('pointercancel', endGesture);
    new ResizeObserver(renderView).observe(svg);
    renderView();
  }
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

if (!customElements.get('world-atlas')) customElements.define('world-atlas', WorldAtlas);
