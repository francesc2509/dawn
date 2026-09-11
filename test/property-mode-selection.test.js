import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import resolveSlideRender, { MODE_FULL_IMAGE_CTA, MODE_STANDARD } from '../assets/carousel-render.js';

/**
 * Feature: carousel-full-image-cta-slide, Property 1: Mode selection is exactly determined by toggle and media presence
 *
 * Validates: Requirements 1.1, 1.2, 6.3
 *
 * A slide renders in Full_Image_CTA_Mode if and only if the per-slide toggle
 * (`full_image_cta_enabled`) is true AND the slide has media (image OR video).
 * Otherwise it renders in Standard_Mode. No other setting (url, label, alt,
 * fit, position, color, duration) may influence the mode decision.
 *
 * Equivalently, the hero curtain is visible exactly when the mode is Standard.
 */
describe('Property 1: Mode selection is exactly determined by toggle and media presence', () => {
  it('mode is full-image-cta iff enabled AND (hasImage OR hasVideo)', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // full_image_cta_enabled
        fc.boolean(), // hasImage
        fc.boolean(), // hasVideo
        // Settings that must NOT affect the mode decision:
        fc.option(fc.webUrl(), { nil: undefined }), // full_image_cta_url
        fc.option(fc.string(), { nil: undefined }), // full_image_cta_label
        fc.option(fc.string(), { nil: undefined }), // image alt
        fc.constantFrom('cover', 'contain', 'fill', undefined), // slide_fit
        fc.constantFrom('left', 'center', 'right', undefined), // slide_position
        fc.constantFrom('background-1', 'background-2', 'accent-1', undefined), // color_scheme
        fc.option(fc.integer({ min: 0, max: 60 }), { nil: undefined }), // slide_duration
        (enabled, hasImage, hasVideo, url, label, alt, fit, position, color, duration) => {
          const settings = {
            full_image_cta_enabled: enabled,
            hasImage,
            hasVideo,
            full_image_cta_url: url,
            full_image_cta_label: label,
            image: alt === undefined ? undefined : { alt },
            slide_fit: fit,
            slide_position: position,
            color_scheme: color,
            slide_duration: duration,
          };

          const result = resolveSlideRender(settings);

          const expectFullImage = enabled === true && (hasImage || hasVideo);

          if (expectFullImage) {
            expect(result.mode).toBe(MODE_FULL_IMAGE_CTA);
          } else {
            expect(result.mode).toBe(MODE_STANDARD);
          }

          // heroVisible === (mode === standard)
          expect(result.heroVisible).toBe(result.mode === MODE_STANDARD);
        }
      ),
      { numRuns: 100 }
    );
  });
});
