import assert from 'node:assert/strict';
import test from 'node:test';

import { getActiveNavItem, workshopNavItems } from '../src/data/navigation.mjs';

test('exposes one shared top-level navigation model', () => {
  assert.deepEqual(
    workshopNavItems.map((item) => item.label),
    ['Start', '基础操作', '网络', '存储', '最佳实践', 'AI on TKE', 'Data on TKE', 'Cookbooks', 'Contribute']
  );
});

test('matches legacy path pages to their current top-level section', () => {
  assert.equal(getActiveNavItem('/operate/')?.label, '基础操作');
  assert.equal(getActiveNavItem('/practice/')?.label, '最佳实践');
  assert.equal(getActiveNavItem('/ai-on-tke/')?.label, 'AI on TKE');
  assert.equal(getActiveNavItem('/cookbooks/create-cluster/')?.label, 'Cookbooks');
});
