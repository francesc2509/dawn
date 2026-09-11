// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Integration tests for Task 9.3 — swipe and nav dots on full-image slides.
 *
 * Validates Requirements 4.1, 4.2, 4.3, 4.4, 4.5.
 *
 * IIFE-LOADING APPROACH
 * ---------------------
 * assets/carousel.js is a browser IIFE, not an ES module — it cannot be
 * imported. It also auto-initializes on load by scanning the document for
 * `.carousel-container` elements and binding `touchstart`/`touchend` listeners
 * on the actual container plus `click` listeners on each `.carousel-nav-item`.
 *
 * To exercise the REAL code (not a re-implementation) we:
 *   1. Build the DOM fixture in `document.body` FIRST, so the container exists
 *      when the initializer runs.
 *   2. Mock `window.matchMedia` to return `{ matches: false }` (reduced-motion
 *      OFF) so behavior is the standard path and image auto-advance timers
 *      don't interfere with assertions.
 *   3. Read carousel.js as text and execute it with `new Function(...)` bound to
 *      the jsdom `window`/`document`, so the IIFE's `initCarousels()` runs
 *      against our fixture and binds listeners to the SAME container element we
 *      dispatch events on.
 *
 * We re-execute the script for every test (fresh DOM + fresh Carousel
 * instance) because the IIFE marks containers with `data-carousel-init="true"`
 * to avoid double-init; a fresh container each test keeps instances isolated.
 *
 * JSDOM LIMITATIONS (reported honestly)
 * -------------------------------------
 * jsdom has no real touch/gesture engine and does not construct `TouchEvent`
 * with populated touch lists. The carousel code only reads
 * `e.changedTouches[0].screenX/screenY`, so we synthesize a plain `Event` and
 * attach a `changedTouches` array. This means we are testing the swipe DECISION
 * LOGIC and its wiring to navigation, not a real browser gesture. jsdom also
 * does not lay out or animate CSS, so we assert on the inline
 * `transform: translateX(...)` the script sets and on the active nav-dot class,
 * which are exactly the observable outputs of navigation and remain meaningful.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAROUSEL_JS_PATH = resolve(__dirname, '../assets/carousel.js');
const carouselSource = readFileSync(CAROUSEL_JS_PATH, 'utf8');

/**
 * Build a fixture with `slideCount` full-image CTA slides (media wrapped in an
 * anchor) and one nav dot per slide. The first nav dot starts active, matching
 * the real server-rendered markup.
 */
function buildFixture(slideCount) {
  const slides = [];
  const dots = [];
  for (let i = 0; i < slideCount; i++) {
    slides.push(
      `<div class="dawn-carousel-item" data-duration="2">` +
        `<a class="dawn-carousel-cta-link" href="https://example.com/${i}" aria-label="Slide ${i}">` +
        `<picture><source media="(max-width: 768px)" srcset="m${i}.jpg"><img src="d${i}.jpg" alt="slide ${i}"></picture>` +
        `</a>` +
        `</div>`
    );
    dots.push(`<button class="carousel-nav-item${i === 0 ? ' active' : ''}" type="button"></button>`);
  }

  return (
    `<div class="carousel-container">` +
    `<div class="carousel">${slides.join('')}</div>` +
    `<div class="carousel-nav-container">` +
    `<div class="carousel-nav">${dots.join('')}</div>` +
    `</div>` +
    `</div>`
  );
}

/**
 * Execute the carousel.js IIFE against the current jsdom document so its
 * initializer binds listeners to the fixture already in the DOM.
 */
function loadCarouselScript() {
  // Bind `window`/`document`/`setTimeout`/`clearTimeout` into the IIFE scope.
  // The script references these as globals; in jsdom they live on the global
  // object, but passing them explicitly keeps the execution deterministic.
  const runner = new Function(
    'window',
    'document',
    'setTimeout',
    'clearTimeout',
    carouselSource
  );
  runner(window, document, globalThis.setTimeout, globalThis.clearTimeout);
}

/** Dispatch a synthesized swipe (touchstart then touchend) on the container. */
function swipe(container, { startX, startY, endX, endY }) {
  const start = new window.Event('touchstart', { bubbles: true });
  start.changedTouches = [{ screenX: startX, screenY: startY }];
  container.dispatchEvent(start);

  const end = new window.Event('touchend', { bubbles: true });
  end.changedTouches = [{ screenX: endX, screenY: endY }];
  container.dispatchEvent(end);
}

function getCarousel() {
  return document.querySelector('.carousel');
}

function getNavItems() {
  return Array.from(document.querySelectorAll('.carousel-nav-item'));
}

function activeDotIndex() {
  return getNavItems().findIndex((d) => d.classList.contains('active'));
}

function transform() {
  return getCarousel().style.transform;
}

beforeEach(() => {
  document.body.innerHTML = '';
  // Reduced-motion OFF so behavior is standard and image auto-advance is not
  // scheduled in a way that would race the assertions. (matchMedia is queried
  // once at IIFE load for the reduced-motion flag.)
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  }));
});

describe('Task 9.3: swipe navigation on full-image CTA slides', () => {
  it('swipe left from slide 0 navigates to the next slide (Req 4.1)', () => {
    document.body.innerHTML = buildFixture(3);
    loadCarouselScript();
    const container = document.querySelector('.carousel-container');

    // Baseline: no transform set yet, first dot active.
    expect(activeDotIndex()).toBe(0);

    // Swipe LEFT: end X < start X, small vertical delta.
    swipe(container, { startX: 300, startY: 100, endX: 100, endY: 110 });

    expect(transform()).toBe('translateX(-100%)');
    expect(activeDotIndex()).toBe(1);
  });

  it('swipe left from the last slide wraps to the first slide (Req 4.1)', () => {
    document.body.innerHTML = buildFixture(3);
    loadCarouselScript();
    const container = document.querySelector('.carousel-container');

    // Move to the last slide (index 2) via two left swipes.
    swipe(container, { startX: 300, startY: 100, endX: 100, endY: 100 });
    swipe(container, { startX: 300, startY: 100, endX: 100, endY: 100 });
    expect(activeDotIndex()).toBe(2);
    expect(transform()).toBe('translateX(-200%)');

    // One more left swipe should wrap 2 -> 0.
    swipe(container, { startX: 300, startY: 100, endX: 100, endY: 100 });
    expect(transform()).toBe('translateX(0%)');
    expect(activeDotIndex()).toBe(0);
  });

  it('swipe right from slide 0 wraps to the last slide (Req 4.2)', () => {
    document.body.innerHTML = buildFixture(3);
    loadCarouselScript();
    const container = document.querySelector('.carousel-container');

    // Swipe RIGHT: end X > start X, small vertical delta. From slide 0 -> last.
    swipe(container, { startX: 100, startY: 100, endX: 300, endY: 105 });

    expect(transform()).toBe('translateX(-200%)');
    expect(activeDotIndex()).toBe(2);
  });

  it('swipe right navigates to the previous slide (Req 4.2)', () => {
    document.body.innerHTML = buildFixture(3);
    loadCarouselScript();
    const container = document.querySelector('.carousel-container');

    // Go to slide 1 first (left swipe), then swipe right back to 0.
    swipe(container, { startX: 300, startY: 100, endX: 100, endY: 100 });
    expect(activeDotIndex()).toBe(1);

    swipe(container, { startX: 100, startY: 100, endX: 300, endY: 100 });
    expect(transform()).toBe('translateX(0%)');
    expect(activeDotIndex()).toBe(0);
  });

  it('a mostly-vertical gesture (>100px Y delta) is treated as scroll and does not change the slide (Req 4.3)', () => {
    document.body.innerHTML = buildFixture(3);
    loadCarouselScript();
    const container = document.querySelector('.carousel-container');

    // Large horizontal delta too, but Y delta > 100 must win -> no navigation.
    swipe(container, { startX: 300, startY: 100, endX: 100, endY: 250 });

    // No transform applied and the active dot is unchanged.
    expect(transform()).toBe('');
    expect(activeDotIndex()).toBe(0);
  });

  it('a vertical gesture after navigation does not change the current slide (Req 4.3)', () => {
    document.body.innerHTML = buildFixture(3);
    loadCarouselScript();
    const container = document.querySelector('.carousel-container');

    // Navigate to slide 1 first.
    swipe(container, { startX: 300, startY: 100, endX: 100, endY: 100 });
    expect(activeDotIndex()).toBe(1);
    expect(transform()).toBe('translateX(-100%)');

    // Now a vertical scroll gesture: state must be unchanged.
    swipe(container, { startX: 300, startY: 100, endX: 100, endY: 260 });
    expect(activeDotIndex()).toBe(1);
    expect(transform()).toBe('translateX(-100%)');
  });
});

describe('Task 9.3: navigation dots on full-image CTA slides', () => {
  it('renders exactly one nav dot per slide, including full-image slides (Req 4.5)', () => {
    document.body.innerHTML = buildFixture(3);
    loadCarouselScript();

    const dots = getNavItems();
    const slides = document.querySelectorAll('.dawn-carousel-item');
    expect(dots.length).toBe(3);
    expect(dots.length).toBe(slides.length);

    // Every slide is a full-image CTA slide (media wrapped in an anchor).
    slides.forEach((slide) => {
      expect(slide.querySelector(':scope > a.dawn-carousel-cta-link > picture')).not.toBeNull();
    });
  });

  it('clicking a nav dot navigates to that slide (Req 4.4)', () => {
    document.body.innerHTML = buildFixture(3);
    loadCarouselScript();

    const dots = getNavItems();

    // Click the third dot -> slide index 2.
    dots[2].dispatchEvent(new window.Event('click', { bubbles: true }));
    expect(transform()).toBe('translateX(-200%)');
    expect(activeDotIndex()).toBe(2);

    // Click the first dot -> back to slide 0.
    dots[0].dispatchEvent(new window.Event('click', { bubbles: true }));
    expect(transform()).toBe('translateX(0%)');
    expect(activeDotIndex()).toBe(0);
  });

  it('clicking the already-active dot is a no-op (Req 4.4)', () => {
    document.body.innerHTML = buildFixture(3);
    loadCarouselScript();

    const dots = getNavItems();
    // Navigate to slide 1, then re-click its dot.
    dots[1].dispatchEvent(new window.Event('click', { bubbles: true }));
    expect(activeDotIndex()).toBe(1);
    expect(transform()).toBe('translateX(-100%)');

    dots[1].dispatchEvent(new window.Event('click', { bubbles: true }));
    // Still on slide 1, transform unchanged.
    expect(activeDotIndex()).toBe(1);
    expect(transform()).toBe('translateX(-100%)');
  });

  it('swipe and dot navigation stay in sync on full-image slides (Req 4.1, 4.4)', () => {
    document.body.innerHTML = buildFixture(3);
    loadCarouselScript();
    const container = document.querySelector('.carousel-container');
    const dots = getNavItems();

    // Dot -> slide 2, then swipe left wraps 2 -> 0.
    dots[2].dispatchEvent(new window.Event('click', { bubbles: true }));
    expect(activeDotIndex()).toBe(2);

    swipe(container, { startX: 300, startY: 100, endX: 100, endY: 100 });
    expect(transform()).toBe('translateX(0%)');
    expect(activeDotIndex()).toBe(0);
  });
});
