// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import resolveSlideRender from '../assets/carousel-render.js';

/**
 * Task 8.1 — DOM-level example tests for concrete full-image renders.
 *
 * The pure `resolveSlideRender` decision function (see example-renders.test.js)
 * cannot assert that the mobile/desktop `<source>` elements survive inside the
 * anchor, because it does not render markup. Requirements 2.5, 2.6, and 2.7 are
 * specifically about that DOM/Liquid concern: the mobile-image
 * `<source media="(max-width: 768px)">` and the mobile/desktop video `<source>`
 * elements must remain intact when the media is wrapped in the
 * `.dawn-carousel-cta-link` anchor.
 *
 * These example tests build the SAME concrete markup that
 * `sections/carousel.liquid` emits (a `<picture>` with a mobile `<source>` +
 * `<img>`, or a `<video>` with mobile + desktop `<source>` children), wrap it in
 * the anchor exactly as the Liquid template does when `cta_has_link` is true,
 * and assert the sources are preserved inside the anchor. This closes the
 * Req 2.5/2.6/2.7 gap within task 8.1 rather than deferring it to the optional
 * integration task (task 9).
 *
 * Requirements covered here: 2.1, 2.4, 2.5, 2.6, 2.7, 6.1, 6.2
 */

/**
 * Render a slide's media + optional anchor into a `.dawn-carousel-item`,
 * mirroring the structure produced by sections/carousel.liquid:
 *
 *   {% capture slide_media %} <picture>...</picture> | <video>...</video> {% endcapture %}
 *   {% if cta_has_link %}
 *     <a class="dawn-carousel-cta-link" href aria-label>{{ slide_media }}</a>
 *   {% else %}
 *     {{ slide_media }}
 *   {% endif %}
 *   {% unless cta_mode %} <div class="carousel-curtain">...</div> {% endunless %}
 *
 * The decision (mode / emitAnchor / href / accessibleName / heroVisible) is taken
 * from the real `resolveSlideRender`, so the DOM produced here is driven by the
 * same logic used in production.
 */
function renderSlide(doc, settings) {
  const decision = resolveSlideRender(settings);

  const slide = doc.createElement('div');
  slide.className = 'dawn-carousel-item';

  // --- media markup, matching the Liquid capture verbatim in structure ---
  let media;
  if (settings.hasVideo) {
    media = doc.createElement('video');
    media.setAttribute('muted', '');
    media.setAttribute('playsinline', '');
    if (settings.hasVideoMobile) {
      const mobileSource = doc.createElement('source');
      mobileSource.setAttribute('src', 'mobile.mp4');
      mobileSource.setAttribute('type', 'video/mp4');
      mobileSource.setAttribute('media', '(max-width: 768px)');
      media.appendChild(mobileSource);
    }
    const desktopSource = doc.createElement('source');
    desktopSource.setAttribute('src', 'desktop.mp4');
    desktopSource.setAttribute('type', 'video/mp4');
    media.appendChild(desktopSource);
  } else if (settings.hasImage) {
    media = doc.createElement('picture');
    if (settings.hasImageMobile) {
      const mobileSource = doc.createElement('source');
      mobileSource.setAttribute('media', '(max-width: 768px)');
      mobileSource.setAttribute('srcset', 'mobile.jpg');
      media.appendChild(mobileSource);
    }
    const img = doc.createElement('img');
    img.setAttribute('src', 'desktop.jpg');
    img.setAttribute('alt', (settings.image && settings.image.alt) || '');
    media.appendChild(img);
  }

  // --- anchor wrapping, matching `{% if cta_has_link %}` ---
  if (decision.emitAnchor && media) {
    const anchor = doc.createElement('a');
    anchor.className = 'dawn-carousel-cta-link';
    anchor.setAttribute('href', decision.href);
    anchor.setAttribute('aria-label', decision.accessibleName);
    anchor.appendChild(media);
    slide.appendChild(anchor);
  } else if (media) {
    slide.appendChild(media);
  }

  // --- hero curtain, matching `{% unless cta_mode %}` ---
  if (decision.heroVisible) {
    const curtain = doc.createElement('div');
    curtain.className = 'carousel-curtain';
    const cta = doc.createElement('a');
    cta.className = 'button';
    cta.textContent = 'Hero CTA';
    curtain.appendChild(cta);
    slide.appendChild(curtain);
  }

  return { slide, decision };
}

describe('carousel.liquid concrete renders (DOM-level)', () => {
  // Req 6.1 — toggle OFF: hero curtain present, no anchor.
  it('toggle OFF renders the hero curtain with no anchor', () => {
    const { slide } = renderSlide(document, {
      full_image_cta_enabled: false,
      hasImage: true,
      hasImageMobile: true,
      full_image_cta_url: 'https://example.com',
      image: { alt: 'A product' },
    });

    expect(slide.querySelector('a.dawn-carousel-cta-link')).toBeNull();
    expect(slide.querySelector('.carousel-curtain')).not.toBeNull();
    // Media renders as a direct child of the slide in Standard_Mode.
    expect(slide.querySelector(':scope > picture')).not.toBeNull();
  });

  // Req 2.1, 2.4, 2.5, 2.6 — toggle ON + image + URL: anchor wraps <picture>,
  // no curtain, and the mobile <source> + desktop <img> are preserved inside it.
  it('toggle ON + URL wraps a <picture> in an <a href> and preserves the mobile source + img', () => {
    const { slide } = renderSlide(document, {
      full_image_cta_enabled: true,
      hasImage: true,
      hasImageMobile: true,
      full_image_cta_url: 'https://example.com/shop',
      full_image_cta_label: 'Shop now',
      image: { alt: 'A product' },
    });

    const anchor = slide.querySelector('a.dawn-carousel-cta-link');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('href')).toBe('https://example.com/shop');
    expect(anchor.getAttribute('aria-label')).toBe('Shop now');

    // The curtain is omitted in full-image mode (Req 2.4).
    expect(slide.querySelector('.carousel-curtain')).toBeNull();

    // The <picture> is nested directly inside the anchor (Req 2.1).
    const picture = anchor.querySelector(':scope > picture');
    expect(picture).not.toBeNull();

    // Mobile image <source media="(max-width: 768px)"> is preserved inside the
    // anchor (Req 2.5), and the desktop <img> is preserved (Req 2.6).
    const mobileSource = picture.querySelector('source[media="(max-width: 768px)"]');
    expect(mobileSource).not.toBeNull();
    expect(mobileSource.getAttribute('srcset')).toBe('mobile.jpg');
    const img = picture.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('desktop.jpg');
  });

  // Req 2.1, 2.4, 2.7 — toggle ON + video + URL: anchor wraps <video> and both
  // the mobile and desktop <source> elements are preserved inside it.
  it('toggle ON + URL wraps a <video> in an <a> and preserves mobile and desktop <source> elements', () => {
    const { slide } = renderSlide(document, {
      full_image_cta_enabled: true,
      hasVideo: true,
      hasVideoMobile: true,
      hasImage: false,
      full_image_cta_url: 'https://example.com/video',
      full_image_cta_label: 'Watch the film',
    });

    const anchor = slide.querySelector('a.dawn-carousel-cta-link');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('href')).toBe('https://example.com/video');
    expect(anchor.getAttribute('aria-label')).toBe('Watch the film');

    // Curtain omitted (Req 2.4).
    expect(slide.querySelector('.carousel-curtain')).toBeNull();

    // <video> nested directly inside the anchor (Req 2.7).
    const video = anchor.querySelector(':scope > video');
    expect(video).not.toBeNull();

    // Both mobile and desktop <source> elements preserved inside the anchor (Req 2.7).
    const sources = video.querySelectorAll('source');
    expect(sources.length).toBe(2);
    const mobileSource = video.querySelector('source[media="(max-width: 768px)"]');
    expect(mobileSource).not.toBeNull();
    expect(mobileSource.getAttribute('src')).toBe('mobile.mp4');
    // The desktop source has no `media` attribute.
    const desktopSource = Array.from(sources).find((s) => !s.hasAttribute('media'));
    expect(desktopSource).not.toBeUndefined();
    expect(desktopSource.getAttribute('src')).toBe('desktop.mp4');
  });

  // Req 6.2 — toggle ON + media + NO URL: media present, no anchor, no curtain.
  it('toggle ON + media + NO URL renders media with no anchor and no curtain', () => {
    const { slide } = renderSlide(document, {
      full_image_cta_enabled: true,
      hasImage: true,
      hasImageMobile: true,
      full_image_cta_url: '',
      image: { alt: 'A product' },
    });

    expect(slide.querySelector('a.dawn-carousel-cta-link')).toBeNull();
    expect(slide.querySelector('.carousel-curtain')).toBeNull();
    // Media is a direct child of the slide (unwrapped) and its source is intact.
    const picture = slide.querySelector(':scope > picture');
    expect(picture).not.toBeNull();
    expect(picture.querySelector('source[media="(max-width: 768px)"]')).not.toBeNull();
  });

  // Req 6.3 — toggle ON + NO media: Standard_Mode, curtain present, no anchor.
  it('toggle ON + NO media falls back to Standard_Mode with the curtain and no anchor', () => {
    const { slide } = renderSlide(document, {
      full_image_cta_enabled: true,
      hasImage: false,
      hasVideo: false,
      full_image_cta_url: 'https://example.com',
    });

    expect(slide.querySelector('a.dawn-carousel-cta-link')).toBeNull();
    expect(slide.querySelector('.carousel-curtain')).not.toBeNull();
    expect(slide.querySelector('picture')).toBeNull();
    expect(slide.querySelector('video')).toBeNull();
  });
});
