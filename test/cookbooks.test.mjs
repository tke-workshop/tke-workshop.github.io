import assert from 'node:assert/strict';
import test from 'node:test';

import { cookbooks } from '../src/data/cookbooks.js';

const legacyCookbookIds = [
  'create-cluster',
  'deploy-nginx',
  'deploy-gpu-pod',
  'tke-ai-playbook',
  'tke-chaos-playbook',
  'tke-direct-upgrade',
  'tke-get-client-ip',
  'tke-hybrid-node-architecture',
  'tke-karpenter',
  'tke-terraform-examples',
  'tke-to-community-ingress',
  'ags-browser-agent',
  'ags-data-analysis',
  'ags-html-processing',
  'ags-mini-rl',
  'ags-mobile-use',
  'ags-shop-assistant',
];

test('migrates every legacy cookbook into the new cookbook collection', () => {
  assert.deepEqual(
    cookbooks.map((cookbook) => cookbook.id),
    legacyCookbookIds
  );
});

test('every cookbook exposes execution experience metadata', () => {
  for (const cookbook of cookbooks) {
    assert.ok(cookbook.icon, `${cookbook.id} should keep its legacy icon`);
    assert.ok(cookbook.services?.length > 0, `${cookbook.id} should keep its legacy service map`);
    assert.ok(cookbook.risk.level, `${cookbook.id} should declare risk level`);
    assert.ok(cookbook.risk.cost, `${cookbook.id} should declare cost impact`);
    assert.ok(cookbook.risk.resourceImpact, `${cookbook.id} should declare resource impact`);
    assert.ok(cookbook.risk.notice, `${cookbook.id} should declare risk notice`);
    assert.ok(cookbook.parameters.length > 0, `${cookbook.id} should document parameters`);
    assert.ok(cookbook.cleanup.length > 0, `${cookbook.id} should include cleanup steps`);
    assert.ok(cookbook.relatedDocs.length > 0, `${cookbook.id} should link related docs`);
    assert.ok(cookbook.source?.href, `${cookbook.id} should link its source repository`);
  }
});

test('legacy service maps keep labels and icons', () => {
  for (const cookbook of cookbooks) {
    for (const service of cookbook.services) {
      assert.ok(service.label, `${cookbook.id} should label every service node`);
      assert.ok(service.icon, `${cookbook.id} ${service.label} should keep its legacy icon`);
    }
  }
});

test('documented command parameters include examples', () => {
  for (const cookbook of cookbooks) {
    for (const parameter of cookbook.parameters) {
      assert.ok(parameter.name, `${cookbook.id} should name each parameter`);
      assert.ok(parameter.example, `${cookbook.id} ${parameter.name} should include an example`);
      assert.equal(typeof parameter.required, 'boolean');
    }
  }
});
