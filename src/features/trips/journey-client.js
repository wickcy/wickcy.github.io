import { journeyBudget, journeyText } from './journey-model.mjs';

export function initJourneyGuides() {
  document.querySelectorAll('[data-journey-guide]').forEach(root => {
    if (root.dataset.enhanced) return;
    root.dataset.enhanced = 'true';
    const guide = JSON.parse(root.querySelector('[data-journey-data]').textContent);
    let selected = guide.defaultVariant;
    const find = selector => root.querySelector(selector);
    const form = find('[data-journey-budget]');
    const exportStatus = find('[data-export-status]');
    const fallback = find('.journey-copy-fallback');
    const money = value => `¥${Math.round(value).toLocaleString('zh-CN')}`;
    const updateBudget = () => {
      const variant = guide.variants.find(item => item.id === selected);
      const result = journeyBudget(Object.fromEntries(new FormData(form)), variant.duration);
      find('[data-budget-days]').textContent = variant.duration;
      find('[data-budget-total]').textContent = result ? `全员约 ${money(result.total)}` : '填齐合理报价后计算';
      find('[data-budget-person]').textContent = result ? `人均约 ${money(result.perPerson)}，已含机动预留。` : '金额可填 0；人数需为 1～20 的整数。';
    };
    const selectVariant = (id, announce = true) => {
      selected = id;
      root.querySelectorAll('[data-variant]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.variant === id)));
      root.querySelectorAll('[data-variant-panel]').forEach(panel => { panel.hidden = panel.dataset.variantPanel !== id; });
      fallback.hidden = true;
      fallback.open = false;
      exportStatus.textContent = '';
      if (announce) find('[data-variant-status]').textContent = `已切换至${guide.variants.find(item => item.id === id).name}。${guide.scopeLabel}，请按方案重新核对住宿与交通报价。`;
      updateBudget();
    };
    root.querySelectorAll('[data-variant]').forEach(button => {
      button.disabled = false;
      button.addEventListener('click', () => selectVariant(button.dataset.variant));
    });
    form.addEventListener('input', updateBudget);
    form.addEventListener('submit', event => event.preventDefault());
    find('[data-copy-journey]').disabled = false;
    find('[data-copy-journey]').addEventListener('click', async () => {
      const text = journeyText(guide, selected);
      try {
        await navigator.clipboard.writeText(text);
        exportStatus.textContent = '已复制当前方案，包含衔接条件、跨日返程与资料链接。';
      } catch {
        fallback.hidden = false;
        fallback.open = true;
        const area = fallback.querySelector('textarea');
        area.value = text;
        area.focus();
        area.select();
        exportStatus.textContent = '浏览器未允许自动复制，可从下方文本框手动复制。';
      }
    });
    find('[data-download-journey]').disabled = false;
    find('[data-download-journey]').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([journeyText(guide, selected)], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${root.dataset.tripId}-${selected}.txt`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      exportStatus.textContent = '已生成当前方案的行程文本。';
    });
    const key = `travel-memories:${root.dataset.tripId}:checklist`;
    const boxes = [...root.querySelectorAll('[data-check-id]')];
    let storageAvailable = true;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      boxes.forEach(box => { box.checked = saved?.[box.dataset.checkId] === true; });
    } catch { storageAvailable = false; }
    const checklistStatus = () => {
      find('[data-checklist-status]').textContent = `已完成 ${boxes.filter(box => box.checked).length} / ${boxes.length} 项。${storageAvailable ? '只保存在本浏览器，按旅行分别记录。' : '本浏览器暂不能保存，仅在本页生效。'}`;
    };
    const saveChecklist = () => {
      try {
        localStorage.setItem(key, JSON.stringify(Object.fromEntries(boxes.map(box => [box.dataset.checkId, box.checked]))));
        storageAvailable = true;
      } catch { storageAvailable = false; }
      checklistStatus();
    };
    boxes.forEach(box => box.addEventListener('change', saveChecklist));
    find('[data-reset-checklist]').disabled = false;
    find('[data-reset-checklist]').addEventListener('click', () => { boxes.forEach(box => { box.checked = false; }); saveChecklist(); });
    root.querySelectorAll('.journey-photo img').forEach(image => {
      const failed = () => { image.hidden = true; image.closest('figure').querySelector('figcaption').prepend('参考图片暂时无法加载。'); };
      image.addEventListener('error', failed, { once: true });
      if (image.complete && !image.naturalWidth) failed();
    });
    selectVariant(selected, false);
    checklistStatus();
  });
}
