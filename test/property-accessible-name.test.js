import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import resolveSlideRender from '../assets/carousel-render.js';

/**
 * Feature: carousel-full-image-cta-slide, Property 4: Accessible-name fallback chain
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 *
 * When an anchor is emitted (Full_Image_CTA_Mode enabled + media present +
 * non-blank url), the Full_Image_CTA_Link's accessible name is resolved by the
 * fallback chain:
 *
 *   1. the stripped, non-blank label (strip_html then trim); else
 *   2. the non-blank image alt (trimmed); else
 *   3. the url.
 *
 * The accessible name must never be empty when an anchor is emitted. When no
 * anchor is emitted, accessibleName is null.
 */

// Mirror the module's stripping semantics: strip HTML tags then trim.
function stripLabel(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .trim();
}

describe('Property 4: Accessible-name fallback chain', () => {
  it('resolves accessibleName via label -> alt -> url when an anchor is emitted', () => {
    // Labels covering: blank/undefined, whitespace-only, markup-only, text
    // wrapped in markup/whitespace, and plain text.
    const labelArb = fc.oneof(
      fc.constant(undefined),
      fc.constant(''),
      fc.constantFrom('   ', '\t', '\n  \n'),
      fc.constantFrom('<b></b>', '<span></span>', '<i><b></b></i>', '<br/>'),
      fc.constantFrom('  <b>Shop now</b> ', '<span> Sale </span>', '\n<b>Learn more</b>\t'),
      fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => stripLabel(s) !== '') // ensure this branch contributes non-blank labels
    );

    // Alt: blank and non-blank values.
    const altArb = fc.oneof(
      fc.constant(undefined),
      fc.constant(''),
      fc.constantFrom('   ', '\t'),
      fc.constantFrom('Product photo', '  Sunset banner  ', 'Alt text'),
      fc.string({ minLength: 1, maxLength: 50 })
    );

    fc.assert(
      fc.property(
        fc.boolean(), // full_image_cta_enabled
        fc.boolean(), // hasImage
        fc.boolean(), // hasVideo
        // url: sometimes non-blank (webUrl), sometimes blank/absent, so we
        // exercise both anchor-emitting and non-anchor cases.
        fc.oneof(fc.webUrl(), fc.constant(undefined), fc.constant(''), fc.constant('   ')),
        labelArb,
        altArb,
        (enabled, hasImage, hasVideo, url, label, alt) => {
          const settings = {
            full_image_cta_enabled: enabled,
            hasImage,
            hasVideo,
            full_image_cta_url: url,
            full_image_cta_label: label,
            image: alt === undefined ? undefined : { alt },
          };

          const result = resolveSlideRender(settings);

          const hasMedia = hasImage || hasVideo;
          const urlPresent = typeof url === 'string' && url.trim().length > 0;
          const emitAnchor = enabled === true && hasMedia && urlPresent;

          expect(result.emitAnchor).toBe(emitAnchor);

          if (!emitAnchor) {
            expect(result.accessibleName).toBe(null);
            return;
          }

          // Compute the expected accessible name from the fallback chain.
          const strippedLabel = stripLabel(label);
          const altPresent = typeof alt === 'string' && alt.trim().length > 0;

          let expected;
          if (strippedLabel !== '') {
            expected = strippedLabel;
          } else if (altPresent) {
            expected = alt.trim();
          } else {
            expected = url;
          }

          expect(result.accessibleName).toBe(expected);
          // Never empty when an anchor is emitted.
          expect(typeof result.accessibleName).toBe('string');
          expect(result.accessibleName.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('anchor-emitting slides always have a non-empty accessible name (focused generation)', () => {
    // Force the anchor-emitting preconditions: enabled + media + non-blank url.
    fc.assert(
      fc.property(
        fc.webUrl().filter((u) => u.trim().length > 0), // always non-blank url
        fc.oneof(
          fc.constant(undefined),
          fc.constant(''),
          fc.constantFrom('   ', '\t'),
          fc.constantFrom('<b></b>', '<i></i>'),
          fc.constantFrom('  <b>Shop now</b> ', '<span> Sale </span>'),
          fc.string({ minLength: 1, maxLength: 50 })
        ), // label
        fc.oneof(
          fc.constant(undefined),
          fc.constant(''),
          fc.constantFrom('   '),
          fc.constantFrom('Product photo', '  Sunset  '),
          fc.string({ minLength: 1, maxLength: 50 })
        ), // alt
        fc.boolean(), // hasImage
        (url, label, alt, hasImageFlag) => {
          // Guarantee media presence even if hasImageFlag is false.
          const hasImage = hasImageFlag;
          const hasVideo = !hasImageFlag;

          const settings = {
            full_image_cta_enabled: true,
            hasImage,
            hasVideo,
            full_image_cta_url: url,
            full_image_cta_label: label,
            image: alt === undefined ? undefined : { alt },
          };

          const result = resolveSlideRender(settings);

          expect(result.emitAnchor).toBe(true);

          const strippedLabel = stripLabel(label);
          const altPresent = typeof alt === 'string' && alt.trim().length > 0;

          let expected;
          if (strippedLabel !== '') {
            expected = strippedLabel;
          } else if (altPresent) {
            expected = alt.trim();
          } else {
            expected = url;
          }

          expect(result.accessibleName).toBe(expected);
          expect(typeof result.accessibleName).toBe('string');
          expect(result.accessibleName.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
