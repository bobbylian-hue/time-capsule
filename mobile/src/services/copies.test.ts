import { describe, expect, it } from 'vitest';
import { canSend, copiesOf, STARTING_COPIES } from './copies';

describe('vessel copies (sample rules until HL-C2)', () => {
  it('gives starters and earned Landmark vessels unlimited copies', () => {
    expect(copiesOf({ id: 'dome', price_mop: 0 }, [])).toBeNull();
    expect(copiesOf({ id: 'red-bird', price_mop: 0, earned_place: 'hkust' }, [])).toBeNull();
  });
  it('counts other vessels, including one at zero', () => {
    expect(copiesOf({ id: 'ramen', price_mop: 8 }, [])).toBe(STARTING_COPIES);
    expect(copiesOf({ id: 'gashapon', price_mop: 8 }, [])).toBe(0);
  });
  it('lets unlimited and positive counts be sent, but not zero', () => {
    expect(canSend(null)).toBe(true);
    expect(canSend(3)).toBe(true);
    expect(canSend(0)).toBe(false);
  });
});
