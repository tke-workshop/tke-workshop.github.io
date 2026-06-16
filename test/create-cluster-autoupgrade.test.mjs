import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const cookbookSource = readFileSync('cookbook/cluster/create_cluster.py', 'utf8');
const createClusterDoc = readFileSync(
  'src/content/docs/basics/cluster/01-create-cluster.md',
  'utf8'
);

test('create cluster cookbook uses SDK object for AutoUpgradeClusterLevel', () => {
  assert.doesNotMatch(
    cookbookSource,
    /AutoUpgradeClusterLevel\s*=\s*True/,
    'AutoUpgradeClusterLevel must not be sent as a boolean'
  );
  assert.match(
    cookbookSource,
    /AutoUpgradeClusterLevel\s*=\s*models\.AutoUpgradeClusterLevel\(\)/,
    'AutoUpgradeClusterLevel should use the Tencent Cloud SDK model object'
  );
  assert.match(
    cookbookSource,
    /AutoUpgradeClusterLevel\.IsAutoUpgrade\s*=\s*True/,
    'AutoUpgradeClusterLevel.IsAutoUpgrade should enable automatic cluster level upgrade'
  );
  assert.match(
    cookbookSource,
    /--dry-run/,
    'cookbook should expose a non-destructive dry-run mode'
  );
  assert.match(
    cookbookSource,
    /req\._serialize\(\)/,
    'dry-run should serialize the SDK request so model/type regressions are visible'
  );
  assert.doesNotMatch(
    cookbookSource,
    /ClusterCIDRSettings\.(VpcId|CniType)\s*=/,
    'cookbook should not assign fields that are absent from the ClusterCIDRSettings SDK model'
  );
});

test('create cluster documentation shows AutoUpgradeClusterLevel as an object', () => {
  assert.doesNotMatch(
    createClusterDoc,
    /"AutoUpgradeClusterLevel"\s*:\s*true/,
    'documentation must not show AutoUpgradeClusterLevel as a JSON boolean'
  );
  assert.match(
    createClusterDoc,
    /"AutoUpgradeClusterLevel":\s*\{\s*"IsAutoUpgrade": true\s*\}/s,
    'documentation should show AutoUpgradeClusterLevel.IsAutoUpgrade'
  );
});
