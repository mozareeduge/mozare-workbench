import { describe, expect, it } from 'vitest';

describe('intentional harness canary', () => {
  it('fails only when explicitly invoked by the documented canary command', () => {
    if (process.env.MWB_HARNESS_CANARY === '1') {
      expect('intentional canary').toBe('restored baseline');
    }

    expect(process.env.MWB_HARNESS_CANARY).not.toBe('1');
  });
});
