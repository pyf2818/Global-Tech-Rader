import { describe, it, expect } from 'vitest';
import { hexToRgba, getGradeColors } from '../format.js';

describe('smoke: vitest + format utils', () => {
  it('hexToRgba converts #rrggbb with alpha', () => {
    expect(hexToRgba('#dc2626', 0.28)).toBe('rgba(220, 38, 38, 0.28)');
  });

  it('hexToRgba falls back on invalid hex', () => {
    expect(hexToRgba('not-a-color', 1)).toMatch(/^rgba\(100, 116, 139, 1\)$/);
  });

  it('getGradeColors derives {primary, glow} from color', () => {
    const c = getGradeColors('#dc2626');
    expect(c.primary).toBe('#dc2626');
    expect(c.glow).toBe('rgba(220, 38, 38, 0.28)');
  });

  it('getGradeColors falls back when color missing', () => {
    const c = getGradeColors(undefined);
    expect(c.primary).toBe('#64748b');
  });
});
