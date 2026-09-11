import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import resolveSlideRender, { MODE_FULL_IMAGE_CTA, MODE_STANDARD } from '../assets/carousel-render.js';

/**
 * Task 6.4 - Property 3: Hero content is omitted exactly in full-image mode.
 *
 * Feature: carousel-full-image-cta-slide, Property 3: Hero content is omitted exactly in full-image mode
 *
 * Validates: Requirements 2.4, 6.1, 6.2
 *
 * The hero curtain (title, subtitle, main content, primary/secondary CTA
 * buttons) renders only in Standard_Mode. `heroVisible` is therefore the exact
 * complement of Full_Image_CTA_Mode:
 *
 *   heroVisible === false  IFF  mode === MODE_FULL_IMAGE_CTA
 *
 * Full_Image_CTA_Mode is entered exactly when the toggle is enabled AND the
 * slide has media (image or video). It does NOT depend on whether a URL is
 * present: enabled + media hides the hero whether or not there is a link
 * (Req 6.2). Enabled with no media falls through to Standard_Mode, so the hero
 * stays visible (Req 6.3/6.1 fallthrough). Toggle off is always Standard_Mode
 * (Req 6.1).
 */

// Media presence: image only, video only, both, or none.
const mediaArb = fc.record({
  hasImage: fc.boolean(),
  hasVideo: fc.boolean(),
});

// URL: blank/absent variants and present variants.
const urlArb = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(''),
  fc.constant('   '),
  fc.constant('https://example.com'),
  fc.webUrl(),
  fc.string()
);

const settingsArb = fc.record({
  full_image_cta_enabled: fc.boolean(),
  full_image_cta_url: urlArb,
  full_image_cta_label: fc.oneof(
    fc.constant(undefined),
    fc.constant(''),
    fc.constant('   '),
    fc.constant('<b>Shop</b>'),
    fc.string()
  ),
  hasImage: fc.boolean(),
  hasVideo: fc.boolean(),
  image: fc.oneof(fc.constant(null), fc.record({ alt: fc.string() })),
  slide_fit: fc.oneof(fc.constant(undefined), fc.constantFrom('cover', 'contain', 'fill')),
  slide_position: fc.oneof(fc.constant(undefined), fc.constantFrom('left', 'center', 'right')),
  color_scheme: fc.oneof(fc.constant(undefined), fc.constantFrom('background-1', 'background-2', 'accent-1')),
  slide_duration: fc.oneof(fc.constant(undefined), fc.integer({ min: 0, max: 20 })),
});

describe('Property 3: Hero content is omitted exactly in full-image mode', () => {
  it('heroVisible === false IFF the slide is in Full_Image_CTA_Mode', () => {
    fc.assert(
      fc.property(settingsArb, (settings) => {
        const result = resolveSlideRender(settings);

        const hasMedia = Boolean(settings.hasImage) || Boolean(settings.hasVideo);
        const inFullImageMode = Boolean(settings.full_image_cta_enabled) && hasMedia;

        // Mode reflects the derivation.
        expect(result.mode).toBe(inFullImageMode ? MODE_FULL_IMAGE_CTA : MODE_STANDARD);

        // The core biconditional: hero omitted exactly in full-image mode.
        expect(result.heroVisible).toBe(!inFullImageMode);
        expect(result.heroVisible === false).toBe(result.mode === MODE_FULL_IMAGE_CTA);
      }),
      { numRuns: 300 }
    );
  });

  it('enabled + media hides the hero regardless of URL presence (Req 2.4, 6.2)', () => {
    fc.assert(
      fc.property(mediaArb, urlArb, (media, url) => {
        // Force at least one media type present.
        const hasImage = media.hasImage || !media.hasVideo;
        const result = resolveSlideRender({
          full_image_cta_enabled: true,
          hasImage,
          hasVideo: media.hasVideo,
          full_image_cta_url: url,
        });

        // With the toggle on and media present we are always in full-image mode,
        // so the hero is omitted whether or not a link/anchor is emitted.
        expect(result.mode).toBe(MODE_FULL_IMAGE_CTA);
        expect(result.heroVisible).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('enabled + no media keeps the hero visible (Req 6.3/6.1 fallthrough)', () => {
    fc.assert(
      fc.property(urlArb, fc.oneof(fc.constant(undefined), fc.string()), (url, label) => {
        const result = resolveSlideRender({
          full_image_cta_enabled: true,
          hasImage: false,
          hasVideo: false,
          full_image_cta_url: url,
          full_image_cta_label: label,
        });

        expect(result.mode).toBe(MODE_STANDARD);
        expect(result.heroVisible).toBe(true);
      }),
      { numRuns: 150 }
    );
  });

  it('toggle off always keeps the hero visible (Req 6.1)', () => {
    fc.assert(
      fc.property(mediaArb, urlArb, (media, url) => {
        const result = resolveSlideRender({
          full_image_cta_enabled: false,
          hasImage: media.hasImage,
          hasVideo: media.hasVideo,
          full_image_cta_url: url,
        });

        expect(result.mode).toBe(MODE_STANDARD);
        expect(result.heroVisible).toBe(true);
      }),
      { numRuns: 150 }
    );
  });
});
