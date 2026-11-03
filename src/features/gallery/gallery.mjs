export function stepPhotoIndex(index, offset, count) {
  return count > 0 ? ((index + offset) % count + count) % count : null;
}

function initializeGallery(root) {
  if (root.dataset.galleryReady) return;
  root.dataset.galleryReady = 'true';

  root.addEventListener('error', (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const frame = image.closest('[data-photo-frame]');
    if (!frame) return;
    image.hidden = true;
    frame.querySelector('.image-error').hidden = false;
  }, true);

  const items = [...root.querySelectorAll('[data-gallery-photo]')];
  const dialog = root.querySelector('[data-gallery-viewer]');
  if (!dialog || !items.length || typeof dialog.showModal !== 'function') return;

  const image = dialog.querySelector('[data-viewer-image]');
  const heading = dialog.querySelector('[data-viewer-heading]');
  const status = dialog.querySelector('[data-viewer-status]');
  const loading = dialog.querySelector('[data-viewer-loading]');
  const error = dialog.querySelector('[data-viewer-error]');
  const previous = dialog.querySelector('[data-viewer-previous]');
  const next = dialog.querySelector('[data-viewer-next]');
  let current = 0;
  let trigger;

  function show(index) {
    current = index;
    const photo = items[current].dataset;
    heading.textContent = photo.photoCaption;
    status.textContent = `${current + 1} / ${items.length}`;
    loading.hidden = false;
    error.hidden = true;
    image.hidden = true;
    image.alt = photo.photoAlt;
    image.src = photo.photoSrc;
    previous.disabled = next.disabled = items.length < 2;
  }

  image.addEventListener('load', () => {
    loading.hidden = true;
    image.hidden = false;
  });
  image.addEventListener('error', () => {
    loading.hidden = true;
    image.hidden = true;
    error.hidden = false;
  });

  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[data-gallery-index]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const index = Number(link.dataset.galleryIndex);
    if (!Number.isInteger(index) || index < 0 || index >= items.length) return;
    event.preventDefault();
    trigger = link;
    show(index);
    dialog.showModal();
  });

  previous.addEventListener('click', () => show(stepPhotoIndex(current, -1, items.length)));
  next.addEventListener('click', () => show(stepPhotoIndex(current, 1, items.length)));
  dialog.querySelector('[data-viewer-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(stepPhotoIndex(current, event.key === 'ArrowLeft' ? -1 : 1, items.length));
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    image.removeAttribute('src');
    trigger?.focus({ preventScroll: true });
  });

  root.querySelectorAll('[data-photo-frame] img').forEach((thumbnail) => {
    if (thumbnail.complete && !thumbnail.naturalWidth) thumbnail.dispatchEvent(new Event('error'));
  });
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-travel-gallery]').forEach(initializeGallery);
}
