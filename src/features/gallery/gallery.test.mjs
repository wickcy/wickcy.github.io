import test from 'node:test';
import assert from 'node:assert/strict';
import { stepPhotoIndex } from './gallery.mjs';

test('photo navigation wraps at either end without skipping a photo', () => {
  assert.equal(stepPhotoIndex(0, -1, 3), 2);
  assert.equal(stepPhotoIndex(2, 1, 3), 0);
  assert.equal(stepPhotoIndex(1, 1, 3), 2);
  assert.equal(stepPhotoIndex(1, -1, 3), 0);
});

test('empty and single-photo galleries have no invalid index', () => {
  assert.equal(stepPhotoIndex(0, 1, 0), null);
  assert.equal(stepPhotoIndex(0, -1, 1), 0);
  assert.equal(stepPhotoIndex(0, 1, 1), 0);
});
