import test from 'node:test';
import assert from 'node:assert/strict';

import { findSpace } from '../src/services/spaceService.js';

test('findSpace awaits D1 first() so async failures use compatibility fallback', async () => {
  const env = {
    NAV_DB: {
      prepare() {
        return {
          bind() {
            return {
              async first() {
                throw new Error('spaces table missing');
              },
            };
          },
        };
      },
    },
  };

  assert.equal(await findSpace(env, 'default'), null);
});
