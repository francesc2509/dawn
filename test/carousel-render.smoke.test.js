import { describe, it, expect } from 'vitest';
import resolveSlideRender, {
  resolveSlideRender as named,
  MODE_FULL_IMAGE_CTA,
  MODE_STANDARD,
} from '../assets/carousel-render.js';

/**
 * Smoke test for task 6.1: confirms the test toolchain runs and the
 * `resolveSlideRender` pure function is importable and returns the expected
 * shape. The exhaustive property-based tests are tasks 6.2-6.6 and are NOT
 * implemented here.
 */
describe('resolveSlideRender (smoke)', () => {
  it('is importable as default and named export', () => {
    expect(typeof resolveSlideRender).toBe('function');
    expect(named).toBe(resolveSlideRender);
  });

  it('returns Standard_Mode with a visible hero when the toggle is off', () => {
    const result = resolveSlideRender({ full_image_cta_enabled: false, hasImage: true });
    expect(result.mode).toBe(MODE_STANDARD);
    expect(result.emitAnchor).toBe(false);
    expect(result.href).toBeNull();
    expect(result.accessibleName).toBeNull();
    expect(result.heroVisible).toBe(true);
  });

  it('emits a full-image anchor when enabled, media present, and a URL is set', () => {
    const result = resolveSlideRender({
      full_image_cta_enabled: true,
      hasImage: true,
      full_image_cta_url: 'https://example.com',
      full_image_cta_label: '  <b>Shop now</b> ',
      slide_fit: 'cover',
      slide_position: 'left',
      color_scheme: 'background-1',
      slide_duration: 5,
    });
    expect(result.mode).toBe(MODE_FULL_IMAGE_CTA);
    expect(result.emitAnchor).toBe(true);
    expect(result.href).toBe('https://example.com');
    expect(result.accessibleName).toBe('Shop now');
    expect(result.heroVisible).toBe(false);
    expect(result.settings).toEqual({
      slide_fit: 'cover',
      slide_position: 'left',
      color_scheme: 'background-1',
      slide_duration: 5,
    });
  });

  it('falls back Standard_Mode when enabled but no media is present', () => {
    const result = resolveSlideRender({ full_image_cta_enabled: true, hasImage: false, hasVideo: false });
    expect(result.mode).toBe(MODE_STANDARD);
    expect(result.emitAnchor).toBe(false);
    expect(result.heroVisible).toBe(true);
  });
});
