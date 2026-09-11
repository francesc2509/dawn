import { describe, it, expect } from 'vitest';
import resolveSlideRender, {
  MODE_FULL_IMAGE_CTA,
  MODE_STANDARD,
} from '../assets/carousel-render.js';

/**
 * Task 8.1 — Example / unit tests for concrete renders.
 *
 * These pin specific `resolveSlideRender(settings)` outcomes for Standard_Mode
 * and Full_Image_CTA_Mode, complementing the property tests (tasks 6.2-6.6).
 * They assert the pure decision logic only.
 *
 * NOTE on source-element preservation (Requirements 2.5, 2.6, 2.7):
 * `resolveSlideRender` is a DOM-free decision function; it does NOT render the
 * <picture>/<video> markup or the mobile/desktop <source> elements. Preservation
 * of the mobile-image `<source media="(max-width: 768px)">` and the mobile/desktop
 * video `<source>` elements is a rendering concern verified by the Liquid template
 * (sections/carousel.liquid) and by the DOM-level getMedia tests (task 9). Here we
 * only assert the decision outcome (mode / anchor / hero visibility).
 *
 * Requirements covered: 2.1, 2.4, 2.5, 2.6, 2.7, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3
 */
describe('resolveSlideRender — concrete example renders', () => {
  // 1. Toggle OFF renders Standard_Mode (Req 6.1)
  it('toggle OFF renders Standard_Mode with no anchor and a visible hero', () => {
    const result = resolveSlideRender({
      full_image_cta_enabled: false,
      hasImage: true,
      full_image_cta_url: 'https://example.com',
    });
    expect(result.mode).toBe(MODE_STANDARD);
    expect(result.emitAnchor).toBe(false);
    expect(result.href).toBeNull();
    expect(result.accessibleName).toBeNull();
    expect(result.heroVisible).toBe(true);
  });

  // 2. Toggle ON + image + URL renders Full_Image_CTA_Mode with an anchor (Req 2.1, 2.4)
  it('toggle ON + image + URL wraps the media in an anchor and omits the hero', () => {
    const result = resolveSlideRender({
      full_image_cta_enabled: true,
      hasImage: true,
      full_image_cta_url: 'https://example.com/shop',
      full_image_cta_label: 'Shop now',
      image: { alt: 'A product' },
    });
    expect(result.mode).toBe(MODE_FULL_IMAGE_CTA);
    expect(result.emitAnchor).toBe(true);
    expect(result.href).toBe('https://example.com/shop');
    expect(result.heroVisible).toBe(false);
    expect(result.accessibleName).toBe('Shop now');
  });

  // 3. Toggle ON + video + URL renders Full_Image_CTA_Mode with an anchor (Req 2.7)
  it('toggle ON + video + URL wraps the media in an anchor and omits the hero', () => {
    const result = resolveSlideRender({
      full_image_cta_enabled: true,
      hasVideo: true,
      hasImage: false,
      full_image_cta_url: 'https://example.com/video',
      full_image_cta_label: 'Watch the film',
    });
    expect(result.mode).toBe(MODE_FULL_IMAGE_CTA);
    expect(result.emitAnchor).toBe(true);
    expect(result.heroVisible).toBe(false);
    // The anchor wraps the video (Req 2.7). The pure decision function does not
    // render <source> elements; preservation of the mobile/desktop video
    // <source> elements is verified by the Liquid template and the DOM/getMedia
    // tests (task 9), not here.
  });

  // 4. Toggle ON + media, NO URL: full-image mode, no anchor (Req 6.2)
  it('toggle ON + media + NO URL stays in full-image mode without an anchor', () => {
    const result = resolveSlideRender({
      full_image_cta_enabled: true,
      hasImage: true,
      full_image_cta_url: '',
    });
    expect(result.mode).toBe(MODE_FULL_IMAGE_CTA);
    expect(result.emitAnchor).toBe(false);
    expect(result.href).toBeNull();
    expect(result.heroVisible).toBe(false);
  });

  // 5. Toggle ON + NO media: falls back to Standard_Mode (Req 6.3)
  it('toggle ON + NO media falls back to Standard_Mode with no anchor', () => {
    const result = resolveSlideRender({
      full_image_cta_enabled: true,
      hasImage: false,
      hasVideo: false,
      full_image_cta_url: 'https://example.com',
    });
    expect(result.mode).toBe(MODE_STANDARD);
    expect(result.emitAnchor).toBe(false);
    expect(result.heroVisible).toBe(true);
  });

  // 6. Accessible-name label-only (Req 5.1)
  it('resolves accessible name from the label when the alt is empty', () => {
    const result = resolveSlideRender({
      full_image_cta_enabled: true,
      hasImage: true,
      full_image_cta_url: 'https://example.com',
      full_image_cta_label: 'Shop now',
      image: { alt: '' },
    });
    expect(result.emitAnchor).toBe(true);
    expect(result.accessibleName).toBe('Shop now');
  });

  // 7. Accessible-name alt-only (Req 5.2)
  it('falls back to the image alt when the label is blank', () => {
    const result = resolveSlideRender({
      full_image_cta_enabled: true,
      hasImage: true,
      full_image_cta_url: 'https://example.com',
      full_image_cta_label: '',
      image: { alt: 'Red hat' },
    });
    expect(result.emitAnchor).toBe(true);
    expect(result.accessibleName).toBe('Red hat');
  });

  // 8. Accessible-name url-only (Req 5.3)
  it('falls back to the URL when both the label and alt are blank', () => {
    const result = resolveSlideRender({
      full_image_cta_enabled: true,
      hasImage: true,
      full_image_cta_url: 'https://example.com',
      full_image_cta_label: '',
      image: { alt: '' },
    });
    expect(result.emitAnchor).toBe(true);
    expect(result.accessibleName).toBe('https://example.com');
  });

  // 9. Label with markup/whitespace strips to plain text (Req 5.1)
  it('strips markup and whitespace from the label to derive the accessible name', () => {
    const result = resolveSlideRender({
      full_image_cta_enabled: true,
      hasImage: true,
      full_image_cta_url: 'https://example.com',
      full_image_cta_label: '  <b>Shop now</b> ',
      image: { alt: 'Red hat' },
    });
    expect(result.emitAnchor).toBe(true);
    expect(result.accessibleName).toBe('Shop now');
  });
});
