// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * getMedia selector replicated from assets/carousel.js.
 *
 * IMPORTANT: assets/carousel.js is a browser IIFE and is NOT importable as a
 * module, so the selector logic is replicated here. This selector string MUST
 * stay in sync with `Carousel.getMedia(slide)` in assets/carousel.js:
 *
 *   getMedia(slide) {
 *     return slide.querySelector(':scope > a > video, :scope > a > picture, :scope > video, :scope > picture');
 *   }
 */
const GET_MEDIA_SELECTOR = ':scope > a > video, :scope > a > picture, :scope > video, :scope > picture';

function getMedia(slide) {
  return slide.querySelector(GET_MEDIA_SELECTOR);
}

/**
 * Build the media element (a <video> or <picture>), optionally with realistic
 * inner children (<source>, and <img> inside <picture>).
 */
function buildMedia(doc, mediaType, withInner) {
  if (mediaType === 'video') {
    const video = doc.createElement('video');
    if (withInner) {
      const source = doc.createElement('source');
      source.setAttribute('src', 'video.mp4');
      source.setAttribute('type', 'video/mp4');
      video.appendChild(source);
    }
    return video;
  }
  // picture
  const picture = doc.createElement('picture');
  if (withInner) {
    const source = doc.createElement('source');
    source.setAttribute('media', '(max-width: 768px)');
    source.setAttribute('srcset', 'mobile.jpg');
    picture.appendChild(source);
    const img = doc.createElement('img');
    img.setAttribute('src', 'desktop.jpg');
    picture.appendChild(img);
  }
  return picture;
}

/**
 * Build a `.dawn-carousel-item` slide element containing the given media,
 * either unwrapped (Standard_Mode: media is a direct child of the slide) or
 * wrapped (Full_Image_CTA_Mode: media is a direct child of an <a> that is a
 * direct child of the slide). Optionally add the hero-curtain sibling and
 * nav-irrelevant content to be realistic.
 */
function buildSlide(doc, { media, wrapped, withCurtain, withExtra }) {
  const slide = doc.createElement('div');
  slide.className = 'dawn-carousel-item';

  // Optional nav-irrelevant / decorative content that must not be picked up.
  if (withExtra) {
    const span = doc.createElement('span');
    span.className = 'decorative';
    span.textContent = 'x';
    slide.appendChild(span);
  }

  if (media) {
    if (wrapped) {
      const anchor = doc.createElement('a');
      anchor.className = 'dawn-carousel-cta-link';
      anchor.setAttribute('href', 'https://example.com');
      anchor.appendChild(media);
      slide.appendChild(anchor);
    } else {
      slide.appendChild(media);
    }
  }

  // The hero curtain is only present in Standard_Mode in the real markup, but
  // including it as a sibling should never change which element getMedia picks.
  if (withCurtain) {
    const curtain = doc.createElement('div');
    curtain.className = 'carousel-curtain';
    slide.appendChild(curtain);
  }

  return slide;
}

/**
 * Feature: carousel-full-image-cta-slide, Property 5: Media element is resolvable regardless of wrapping
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 4.4
 *
 * For any slide that has media, getMedia(slide) SHALL return the slide's
 * <video> or <picture> element whether that element is a direct child of the
 * slide (Standard_Mode) or nested inside the anchor (Full_Image_CTA_Mode), and
 * SHALL return the same element type in both wrappings. For a slide with no
 * media, getMedia SHALL return null.
 */
describe('Property 5: Media element is resolvable regardless of wrapping', () => {
  it('resolves the same media element type whether wrapped in an anchor or a direct child', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('video', 'picture'), // media type
        fc.boolean(), // include realistic inner children (<source>, <img>)
        fc.boolean(), // include hero curtain sibling
        fc.boolean(), // include nav-irrelevant decorative content
        (mediaType, withInner, withCurtain, withExtra) => {
          const doc = document;

          // Build the SAME underlying media element in both wrappings.
          const unwrappedMedia = buildMedia(doc, mediaType, withInner);
          const wrappedMedia = buildMedia(doc, mediaType, withInner);

          const unwrappedSlide = buildSlide(doc, {
            media: unwrappedMedia,
            wrapped: false,
            withCurtain,
            withExtra,
          });
          const wrappedSlide = buildSlide(doc, {
            media: wrappedMedia,
            wrapped: true,
            withCurtain,
            withExtra,
          });

          const unwrappedResult = getMedia(unwrappedSlide);
          const wrappedResult = getMedia(wrappedSlide);

          // Non-null for both wrappings.
          expect(unwrappedResult).not.toBeNull();
          expect(wrappedResult).not.toBeNull();

          // It is the media element itself, not the anchor and not an inner
          // <source>/<img>.
          const expectedTag = mediaType === 'video' ? 'VIDEO' : 'PICTURE';
          expect(unwrappedResult.tagName).toBe(expectedTag);
          expect(wrappedResult.tagName).toBe(expectedTag);
          expect(unwrappedResult).toBe(unwrappedMedia);
          expect(wrappedResult).toBe(wrappedMedia);

          // Same element type in wrapped vs unwrapped.
          expect(wrappedResult.tagName).toBe(unwrappedResult.tagName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns null for a slide with no media (both curtain-only and empty)', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (withCurtain, withExtra) => {
        const doc = document;
        const slide = buildSlide(doc, {
          media: null,
          wrapped: false,
          withCurtain,
          withExtra,
        });

        expect(getMedia(slide)).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
