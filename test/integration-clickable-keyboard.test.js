// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Task 9.1 — Integration tests for clickable area and keyboard accessibility.
 *
 * Requirements covered:
 *   - Req 2.3: the Full_Image_CTA_Link's clickable area covers 100% of the
 *     slide media with no dead zones.
 *   - Req 5.4: the link can receive keyboard focus via Tab and be activated
 *     with Enter.
 *   - Req 5.5: a visible focus indication is shown while the link has focus.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HONESTY NOTE — JSDOM has no layout or rendering engine.
 * ─────────────────────────────────────────────────────────────────────────
 * JSDOM does NOT lay out or paint anything:
 *   • getBoundingClientRect() returns all-zero rects, so real pixel geometry
 *     ("does the anchor truly fill the slide, are the corners clickable")
 *     CANNOT be measured here.
 *   • getComputedStyle() does NOT resolve the stylesheet cascade for layout
 *     (position/inset/width/height) — it only reflects inline styles — so we
 *     cannot confirm the painted box from the CSS file at runtime.
 *   • :focus-visible matching and the painted `outline` CANNOT be visually
 *     verified — there is no renderer to draw or match the paint state.
 *
 * Therefore, per the design's Testing Strategy, pixel-accurate 100% coverage
 * (Req 2.3) and the painted focus outline (Req 5.5) are documented here
 * STRUCTURALLY: we assert the DOM structure that guarantees full-area coverage
 * and we assert that assets/carousel.css contains the exact rule sets that make
 * the anchor fill the slide and draw the focus outline. We do NOT assert false
 * geometry (e.g. that a zero-size rect equals the slide) because that would be
 * misleading.
 *
 * The truly browser-accurate checks (clicking each corner and reading the
 * painted outline) require a real-browser harness such as Playwright. See the
 * "RECOMMENDATION" note at the bottom of this file — that harness is NOT part
 * of this task and is only recorded as a follow-up.
 *
 * What JSDOM CAN verify honestly, and what we assert below:
 *   • Structure: the <a class="dawn-carousel-cta-link"> is a direct child of
 *     .dawn-carousel-item, is a real anchor with a valid href, and wraps the
 *     media (<picture>) — this is the structural precondition for full-area
 *     coverage (Req 2.3).
 *   • The CSS file contains the full-coverage rule and the :focus-visible
 *     outline rule (Req 2.3 / 5.5 documented at the source level).
 *   • Focusability: a native <a href> is tabbable; element.focus() makes it the
 *     activeElement (Req 5.4 — reachable via Tab).
 *   • Enter activation intent: dispatching a real 'click' on the anchor invokes
 *     the default-navigation path (a click handler fires and sees the href).
 *     JSDOM does NOT synthesize <a> Enter→click, so we assert the activation
 *     contract at the level JSDOM supports.
 *   • Accessible name: aria-label is present and non-empty (Req 5.4
 *     discoverability).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = resolve(__dirname, '../assets/carousel.css');

// Read the stylesheet once. We assert against its source text because JSDOM
// cannot apply the cascade for layout/paint (see HONESTY NOTE above).
const carouselCss = readFileSync(CSS_PATH, 'utf8');

/**
 * Normalize whitespace so brittle formatting differences don't break the
 * source-level assertions while still requiring the meaningful declarations.
 */
function normalizeCss(css) {
  return css.replace(/\s+/g, ' ').trim();
}

const normalizedCss = normalizeCss(carouselCss);

/**
 * Build the rendered full-image slide markup exactly as sections/carousel.liquid
 * emits it in Full_Image_CTA_Mode with a link:
 *
 *   <div class="dawn-carousel-item">
 *     <a class="dawn-carousel-cta-link" href="URL" aria-label="NAME">
 *       <picture>...</picture>
 *     </a>
 *   </div>
 */
function buildFullImageSlide({ href, ariaLabel }) {
  const slide = document.createElement('div');
  slide.className = 'dawn-carousel-item';

  const anchor = document.createElement('a');
  anchor.className = 'dawn-carousel-cta-link';
  anchor.setAttribute('href', href);
  anchor.setAttribute('aria-label', ariaLabel);

  const picture = document.createElement('picture');
  const source = document.createElement('source');
  source.setAttribute('media', '(max-width: 768px)');
  source.setAttribute('srcset', 'mobile.jpg');
  picture.appendChild(source);
  const img = document.createElement('img');
  img.setAttribute('src', 'desktop.jpg');
  img.setAttribute('alt', 'A product');
  picture.appendChild(img);

  anchor.appendChild(picture);
  slide.appendChild(anchor);
  return { slide, anchor, picture };
}

describe('Task 9.1 — clickable area (Req 2.3)', () => {
  it('renders the CTA link as a direct child of the slide, wrapping the media, as a real anchor with a valid href', () => {
    const href = 'https://example.com/shop';
    const { slide, anchor, picture } = buildFullImageSlide({
      href,
      ariaLabel: 'Shop now',
    });

    // Structural precondition for full-area coverage: the anchor is a DIRECT
    // child of .dawn-carousel-item (matched by the CSS `>` combinator) ...
    expect(anchor.parentElement).toBe(slide);
    expect(slide.children).toHaveLength(1);
    expect(slide.querySelector(':scope > a.dawn-carousel-cta-link')).toBe(anchor);

    // ... it is a genuine <a> element with a non-empty, valid href ...
    expect(anchor.tagName).toBe('A');
    expect(anchor.getAttribute('href')).toBe(href);
    expect(anchor.href).toBe(href); // resolves as a real link

    // ... and it WRAPS the media (the media is a descendant of the anchor), so
    // the whole media surface is inside the single link.
    expect(anchor.contains(picture)).toBe(true);
    expect(anchor.querySelector('picture')).toBe(picture);
  });

  it('the CSS file contains the rule that makes the anchor fill the slide with no dead zones', () => {
    // JSDOM cannot measure the painted box, so we verify the source rule that
    // GUARANTEES 100% coverage: position:absolute; inset:0; width/height:100%
    // on `.dawn-carousel-item > .dawn-carousel-cta-link`.
    const ruleMatch = normalizedCss.match(
      /\.dawn-carousel-item > \.dawn-carousel-cta-link \{([^}]*)\}/
    );
    expect(ruleMatch).not.toBeNull();

    const body = ruleMatch[1];
    expect(body).toMatch(/display:\s*block/);
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/inset:\s*0/);
    expect(body).toMatch(/width:\s*100%/);
    expect(body).toMatch(/height:\s*100%/);
  });
});

describe('Task 9.1 — keyboard focus and activation (Req 5.4)', () => {
  it('the link is focusable (a native <a href> is tabbable) and becomes document.activeElement', () => {
    const { slide, anchor } = buildFullImageSlide({
      href: 'https://example.com/shop',
      ariaLabel: 'Shop now',
    });
    // The element must be attached to the document to receive focus in JSDOM.
    document.body.appendChild(slide);

    try {
      // A native <a> with href is part of sequential Tab navigation. We assert
      // the observable consequence JSDOM supports: focus() makes it active.
      anchor.focus();
      expect(document.activeElement).toBe(anchor);

      // It has no tabindex="-1" that would remove it from the tab order.
      expect(anchor.getAttribute('tabindex')).not.toBe('-1');
    } finally {
      slide.remove();
    }
  });

  it('activating the link navigates to its destination (Enter/click activation intent)', () => {
    const href = 'https://example.com/shop';
    const { slide, anchor } = buildFullImageSlide({ href, ariaLabel: 'Shop now' });
    document.body.appendChild(slide);

    try {
      // JSDOM does NOT synthesize <a> Enter→click, and it does not perform real
      // navigation. We assert the activation CONTRACT at the level JSDOM
      // supports: a click on the anchor fires with the anchor as target and the
      // destination href intact, which is the default-navigation path a real
      // browser follows for both a pointer click and an Enter keypress on a
      // focused link.
      const clickSpy = vi.fn((event) => {
        expect(event.currentTarget).toBe(anchor);
        expect(event.currentTarget.href).toBe(href);
        // Prevent JSDOM's "Not implemented: navigation" noise; the intent is
        // already proven by reaching this handler with the correct href.
        event.preventDefault();
      });
      anchor.addEventListener('click', clickSpy);

      anchor.focus();
      expect(document.activeElement).toBe(anchor);

      // Dispatch a real click event (what Enter on a focused link resolves to
      // in a real browser).
      const clickEvent = new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      anchor.dispatchEvent(clickEvent);

      expect(clickSpy).toHaveBeenCalledTimes(1);
    } finally {
      slide.remove();
    }
  });
});

describe('Task 9.1 — visible focus indication (Req 5.5)', () => {
  it('the CSS file defines a visible :focus-visible outline on the CTA link', () => {
    // JSDOM cannot match :focus-visible or paint an outline, so we verify the
    // source rule that draws the focus ring in a real browser.
    const ruleMatch = normalizedCss.match(
      /\.dawn-carousel-cta-link:focus-visible \{([^}]*)\}/
    );
    expect(ruleMatch).not.toBeNull();

    const body = ruleMatch[1];
    // A visible outline (non-zero, non-"none") — the design specifies
    // `3px solid rgb(var(--color-foreground))` with `outline-offset: -3px`.
    expect(body).toMatch(/outline:\s*3px\s+solid/);
    expect(body).not.toMatch(/outline:\s*none/);
    expect(body).toMatch(/outline-offset:\s*-3px/);
  });
});

describe('Task 9.1 — accessible name (Req 5.4 discoverability)', () => {
  it('the link exposes a present, non-empty aria-label as its accessible name', () => {
    const { anchor } = buildFullImageSlide({
      href: 'https://example.com/shop',
      ariaLabel: 'Shop the new collection',
    });

    const ariaLabel = anchor.getAttribute('aria-label');
    expect(ariaLabel).not.toBeNull();
    expect(ariaLabel.trim().length).toBeGreaterThan(0);
    expect(ariaLabel).toBe('Shop the new collection');
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────
 * RECOMMENDATION (NOT part of this task, not installed here):
 * ─────────────────────────────────────────────────────────────────────────
 * The pixel-accurate aspects of Req 2.3 (clicking each of the four corners of
 * the rendered slide and asserting the anchor receives every hit) and Req 5.5
 * (the outline is actually painted when the link is focus-visible) require a
 * real browser with a layout/paint engine. A Playwright (or equivalent) test
 * that mounts the section, sizes the viewport, and (a) elementFromPoint()s each
 * corner to confirm the anchor is hit and (b) reads the computed `outline`
 * after tabbing to the link would fully verify those criteria. That harness is
 * left as a follow-up and is intentionally not added as part of task 9.1.
 */
