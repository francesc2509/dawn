import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import resolveSlideRender, {
  MODE_FULL_IMAGE_CTA,
} from '../assets/carousel-render.js';

/**
 * Feature: carousel-full-image-cta-slide, Property 2: Anchor emission requires mode and a URL
 *
 * Validates: Requirements 2.1, 6.2
 *
 * Property 2: Anchor emission requires mode and a URL.
 *
 * emitAnchor is true if and only if the slide is in Full_Image_CTA_Mode
 * (toggle enabled AND media present) AND the configured URL is non-blank per
 * Liquid `!= blank` semantics (null/undefined and whitespace-only strings count
 * as blank; a trimmed non-empty string is present).
 *
 * When emitAnchor is true, href equals the configured url as a string.
 * When emitAnchor is false, href is null.
 */

/**
 * Mirror Liquid's `!= blank` for the URL value, independent of the module under
 * test so the property is an independent oracle rather than a restatement of
 * the implementation.
 */
function isNonBlank(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

describe('Feature: carousel-full-image-cta-slide, Property 2: Anchor emission requires mode and a URL', () => {
  // A small domain of URL values: valid URLs plus blank/whitespace-only/undefined.
  const urlArb = fc.oneof(
    fc.constantFrom(
      'https://example.com',
      'https://shop.example.com/products/hat',
      '/collections/all',
      'mailto:hi@example.com',
    ),
    // blank-ish values that Liquid treats as blank
    fc.constantFrom('', ' ', '   ', '\t', '\n', ' \t\n '),
    fc.constant(undefined),
    // arbitrary strings (may or may not be blank)
    fc.string(),
  );

  // Label / alt vary to make sure they never influence emitAnchor / href.
  const labelArb = fc.oneof(
    fc.constant(undefined),
    fc.constantFrom('', '  ', 'Shop now', '<b>Sale</b>', '  <i>Deal</i>  '),
    fc.string(),
  );
  const altArb = fc.oneof(
    fc.constant(undefined),
    fc.constantFrom('', '  ', 'A red hat', 'Product photo'),
    fc.string(),
  );

  const settingsArb = fc.record({
    full_image_cta_enabled: fc.boolean(),
    hasImage: fc.boolean(),
    hasVideo: fc.boolean(),
    full_image_cta_url: urlArb,
    full_image_cta_label: labelArb,
    imageAlt: altArb,
  });

  it('emitAnchor iff full-image mode and a non-blank URL; href tracks emitAnchor', () => {
    fc.assert(
      fc.property(settingsArb, (raw) => {
        const settings = {
          full_image_cta_enabled: raw.full_image_cta_enabled,
          hasImage: raw.hasImage,
          hasVideo: raw.hasVideo,
          full_image_cta_url: raw.full_image_cta_url,
          full_image_cta_label: raw.full_image_cta_label,
          image: { alt: raw.imageAlt },
        };

        const result = resolveSlideRender(settings);

        const hasMedia = raw.hasImage || raw.hasVideo;
        const inCtaMode = raw.full_image_cta_enabled && hasMedia;
        const expectedEmit = inCtaMode && isNonBlank(raw.full_image_cta_url);

        // Core biconditional.
        expect(result.emitAnchor).toBe(expectedEmit);

        // href tracks emitAnchor exactly.
        if (expectedEmit) {
          expect(result.mode).toBe(MODE_FULL_IMAGE_CTA);
          expect(result.href).toBe(String(raw.full_image_cta_url));
        } else {
          expect(result.href).toBeNull();
        }
      }),
      { numRuns: 200 },
    );
  });
});
