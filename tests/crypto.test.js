import test from 'node:test';
import assert from 'node:assert/strict';

import { decryptSecret, encryptSecret, isEncrypted } from '../src/lib/crypto.js';

test('encryptSecret/decryptSecret round-trips when SECRET_KEY is configured', async () => {
  const env = { SECRET_KEY: 'unit-test-master-key' };
  const plaintext = 'sk-super-secret-token-123';
  const encrypted = await encryptSecret(env, plaintext);
  assert.ok(isEncrypted(encrypted), '密文应带 enc: 前缀');
  assert.notEqual(encrypted, plaintext);
  assert.equal(await decryptSecret(env, encrypted), plaintext);
});

test('encryptSecret is a no-op without a master key (backward compatible)', async () => {
  const env = {};
  assert.equal(await encryptSecret(env, 'plain-value'), 'plain-value');
  assert.equal(await decryptSecret(env, 'plain-value'), 'plain-value');
});

test('decryptSecret keeps legacy plaintext and handles blanks', async () => {
  const env = { SECRET_KEY: 'unit-test-master-key' };
  assert.equal(await decryptSecret(env, 'legacy-plaintext'), 'legacy-plaintext');
  assert.equal(await encryptSecret(env, ''), '');
  assert.equal(await decryptSecret(env, ''), '');
});

test('ciphertext cannot be decrypted with a different master key', async () => {
  const encrypted = await encryptSecret({ SECRET_KEY: 'key-A' }, 'secret');
  assert.equal(await decryptSecret({ SECRET_KEY: 'key-B' }, encrypted), '');
});
