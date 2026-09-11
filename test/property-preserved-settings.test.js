import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import resolveSlideRender, { MODE_FULL_IMAGE_CTA, MODE_STANDARD } from '../assets/carousel-render.js';

/**
 * Feature: carousel-full-image-cta-slide, Property 6: Existing structural settings are preserved across modes
 *
 * Validates: Requirements 2.8, 6.4
 *
 * Regardless of the resolved render mode (full-image-cta or standard), the
 * structural settings passed through `resolveSlideRender` must be preserved
 * exactly: `settings.slide_fit`, `settings.slide_position`,
 * `settings.color_scheme`, and `settings.slide_duration` must equal the input
 * values verbatim. Mode selection never mutates or drops these settings.
 *
 * The non-structural inputs (toggle, url, label, alt, media presence) are
 * varied across the full space so the property is exercised in both modes,
 * while the structural settings are varied independently. None of the
 * non-structural inputs may mutate or drop the structural settings.
 */

// Media presence variants: an image, a video, or no media at all.
const mediaArb = fc.constantFrom('image', 'video', 'none');

describe('Property 6: Existing structural settings are preserved across modes', () => {
  it('slide_fit / slide_position / color_scheme / slide_duration pass through unchanged in every mode', () => {
    fc.assert(
      fc.property(
        // Mode-driving / non-structural inputs — vary across the full space to
        // reach both modes and exercise the anchor/accessible-name branches.
        fc.boolean(), // full_image_cta_enabled
        mediaArb, // media presence: image | video | none
        fc.oneof(fc.webUrl(), fc.constant(undefined), fc.constant(''), fc.constant('   ')), // full_image_cta_url (incl. blank)
        fc.oneof(fc.constant(undefined), fc.string({ maxLength: 40 })), // full_image_cta_label
        fc.oneof(fc.constant(undefined), fc.string({ maxLength: 40 })), // image alt
        // Structural settings under test — varied independently.
        fc.constantFrom('cover', 'fill', 'contain', undefined), // slide_fit
        fc.constantFrom('left', 'right', 'center', undefined), // slide_position
        fc.constantFrom('background-1', 'background-2', 'accent-1', undefined), // color_scheme
        fc.option(fc.integer({ min: 0, max: 60 }), { nil: undefined }), // slide_duration
        (enabled, media, url, label, alt, fit, position, color, duration) => {
          const hasImage = media === 'image';
          const hasVideo = media === 'video';

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

          // Sanity: the inputs really do drive both modes across runs.
          expect([MODE_FULL_IMAGE_CTA, MODE_STANDARD]).toContain(result.mode);

          // Structural settings are preserved exactly, regardless of mode —
          // identical to what Standard_Mode would produce.
          expect(result.settings.slide_fit).toBe(fit);
          expect(result.settings.slide_position).toBe(position);
          expect(result.settings.color_scheme).toBe(color);
          expect(result.settings.slide_duration).toBe(duration);
        },
      ),
      { numRuns: 100 },
    );
  });
});
