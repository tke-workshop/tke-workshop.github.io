import assert from 'node:assert/strict';
import test from 'node:test';

import { cookbooks } from '../src/data/cookbooks.js';

test('every cookbook exposes execution experience metadata', () => {
  for (const cookbook of cookbooks) {
    assert.ok(cookbook.risk.level, `${cookbook.id} should declare risk level`);
    assert.ok(cookbook.risk.cost, `${cookbook.id} should declare cost impact`);
    assert.ok(cookbook.risk.resourceImpact, `${cookbook.id} should declare resource impact`);
    assert.ok(cookbook.risk.notice, `${cookbook.id} should declare risk notice`);
    assert.ok(cookbook.parameters.length > 0, `${cookbook.id} should document parameters`);
    assert.ok(cookbook.cleanup.length > 0, `${cookbook.id} should include cleanup steps`);
    assert.ok(cookbook.relatedDocs.length > 0, `${cookbook.id} should link related docs`);
  }
});

test('documented command parameters include examples', () => {
  for (const cookbook of cookbooks) {
    for (const parameter of cookbook.parameters) {
      assert.ok(parameter.name.startsWith('--'), `${parameter.name} should be a CLI flag`);
      assert.ok(parameter.example, `${cookbook.id} ${parameter.name} should include an example`);
      assert.equal(typeof parameter.required, 'boolean');
    }
  }
});
