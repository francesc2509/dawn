// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Integration tests for Task 9.2: auto-advance across full-image (anchor-wrapped)
 * slides in assets/carousel.js.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * ---------------------------------------------------------------------------
 * HOW THE IIFE IS LOADED UNDER TEST
 * ---------------------------------------------------------------------------
 * assets/carousel.js is a browser IIFE (not an ES module) that:
 *   - reads `prefersReducedMotion` from window.matchMedia(...) ONCE at load time,
 *   - defines a `Carousel` class (not exported),
 *   - auto-initializes every `.carousel-container` immediately (when
 *     document.readyState !== 'loading') or on DOMContentLoaded.
 *
 * Because `prefersReducedMotion` is captured at load time, we cannot import the
 * module once and reuse it across reduced-motion variants. Instead we read the
 * file text and evaluate it via `new Function(...)()` in the current JSDOM
 * global scope. The IIFE references `window`, `document`, `setTimeout`, etc.,
 * which are already globals in the vitest jsdom environment, so a plain
 * evaluation runs its initialization against whatever DOM/matchMedia we set up
 * FIRST. We re-evaluate the source for every test so `prefersReducedMotion` is
 * re-read against the current matchMedia mock.
 *
 * Sequence per test:
 *   1. install fake timers,
 *   2. mock window.matchMedia (reduced-motion true/false),
 *   3. set document.body.innerHTML with the carousel markup,
 *   4. evaluate the IIFE source -> initialization runs against our DOM.
 *
 * JSDOM limitations (called out honestly):
 *   - No real media playback: HTMLVideoElement.play() is stubbed to a resolved
 *     promise so the code's safePlay() guard is exercised without noise.
 *   - The `ended` event is SIMULATED via a dispatched Event('ended'); JSDOM does
 *     not fire it from playback. The listener wiring under test is real.
 *   - No layout engine: assertions are on the semantic state the script controls
 *     (`.carousel` style.transform and the active nav dot), which is exactly what
 *     auto-advance manipulates. These are meaningful behavioral assertions.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CAROUSEL_SRC = readFileSync(resolve(__dirname, '../assets/carousel.js'), 'utf8');

/** Evaluate the carousel IIFE against the current JSDOM globals. */
function loadCarousel() {
  // Run the source in the current global scope so it initializes against the
  // DOM and matchMedia mock we set up beforehand.
  // eslint-disable-next-line no-new-func
  new Function(CAROUSEL_SRC)();
}

/** Install a matchMedia mock; reduced-motion query matches `reduce`. */
function mockMatchMedia(reduce) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

/**
 * Build a full-image-mode slide: media nested inside the CTA anchor.
 * `type` is 'image' or 'video'. `duration` is optional (seconds).
 */
function slideMarkup({ type, duration }) {
  const durationAttr = duration != null ? ` data-duration="${duration}"` : '';
  const inner =
    type === 'video'
      ? '<video><source src="v.mp4" type="video/mp4"></video>'
      : '<picture><img src="d.jpg" alt="alt text"></picture>';
  return (
    `<div class="dawn-carousel-item"${durationAttr}>` +
    `<a class="dawn-carousel-cta-link" href="https://example.com/cta">${inner}</a>` +
    `</div>`
  );
}

/**
 * Build a full carousel-container fixture with the given slide descriptors.
 * Includes the `.carousel-nav` dots (one per slide) that carousel.js requires.
 */
function carouselMarkup(slides) {
  const items = slides.map(slideMarkup).join('');
  const dots = slides.map(() => '<button class="carousel-nav-item"></button>').join('');
  return (
    '<div class="carousel-container">' +
    `<div class="carousel">${items}</div>` +
    '<div class="carousel-nav-container hidden">' +
    `<div class="carousel-nav">${dots}</div>` +
    '</div>' +
    '</div>'
  );
}

function setupDom(slides) {
  document.body.innerHTML = carouselMarkup(slides);
}

const carouselEl = () => document.querySelector('.carousel');
const navItems = () => Array.from(document.querySelectorAll('.carousel-nav-item'));
const transform = () => carouselEl().style.transform;
const activeDotIndex = () => navItems().findIndex((d) => d.classList.contains('active'));

beforeEach(() => {
  vi.useFakeTimers();
  // Stub video playback so safePlay() runs without JSDOM "not implemented" noise.
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Task 9.2: auto-advance across full-image slides', () => {
  it('image full-image slide auto-advances after its duration (Req 3.1, 3.5)', () => {
    // Two image slides, first has an explicit 3s duration.
    mockMatchMedia(false);
    setupDom([
      { type: 'image', duration: 3 },
      { type: 'image' },
    ]);
    loadCarousel();

    // Not yet advanced.
    expect(transform()).toBe('');

    // Before the duration elapses: still on slide 0.
    vi.advanceTimersByTime(2999);
    expect(transform()).toBe('');

    // After 3s: advanced to slide 1.
    vi.advanceTimersByTime(1);
    expect(transform()).toBe('translateX(-100%)');
    expect(activeDotIndex()).toBe(1);
  });

  it('defaults image auto-advance to 2 seconds when no duration is configured (Req 3.1)', () => {
    mockMatchMedia(false);
    setupDom([{ type: 'image' }, { type: 'image' }]);
    loadCarousel();

    vi.advanceTimersByTime(1999);
    expect(transform()).toBe('');

    vi.advanceTimersByTime(1);
    expect(transform()).toBe('translateX(-100%)');
    expect(activeDotIndex()).toBe(1);
  });

  it('cancels a scheduled image auto-advance when the visitor navigates manually (Req 3.6)', () => {
    // Three image slides so we can navigate to a non-adjacent slide.
    mockMatchMedia(false);
    setupDom([
      { type: 'image', duration: 5 },
      { type: 'image', duration: 5 },
      { type: 'image', duration: 5 },
    ]);
    loadCarousel();

    // Slide 0 scheduled to advance to slide 1 after 5s. Before it elapses,
    // the visitor clicks the dot for slide 2.
    vi.advanceTimersByTime(2000);
    navItems()[2].click();

    // Manual nav moved to slide 2 immediately.
    expect(transform()).toBe('translateX(-200%)');
    expect(activeDotIndex()).toBe(2);

    // Let the ORIGINAL slide-0 timer fire. Its guard (currentIdx !== selectedIdx)
    // must cancel it, so it must NOT knock us back to slide 1.
    vi.advanceTimersByTime(3000);
    expect(transform()).toBe('translateX(-200%)');
    expect(activeDotIndex()).toBe(2);
  });

  it('video full-image slide advances to the next slide on `ended` (Req 3.2)', () => {
    mockMatchMedia(false);
    setupDom([
      { type: 'video' },
      { type: 'image' },
    ]);
    loadCarousel();

    const firstVideo = carouselEl().querySelector('.dawn-carousel-item:first-child video');
    firstVideo.dispatchEvent(new Event('ended'));

    expect(transform()).toBe('translateX(-100%)');
    expect(activeDotIndex()).toBe(1);
  });

  it('last video full-image slide wraps to the first slide on `ended` (Req 3.3)', () => {
    mockMatchMedia(false);
    setupDom([
      { type: 'image' },
      { type: 'video' },
    ]);
    loadCarousel();

    // Navigate to the last (video) slide via its nav dot.
    navItems()[1].click();
    expect(transform()).toBe('translateX(-100%)');
    expect(activeDotIndex()).toBe(1);

    const lastVideo = carouselEl().querySelector('.dawn-carousel-item:last-child video');
    lastVideo.dispatchEvent(new Event('ended'));

    // Wrapped back to slide 0.
    expect(transform()).toBe('translateX(0%)');
    expect(activeDotIndex()).toBe(0);
  });

  it('reduced-motion disables image auto-advance but videos still advance on `ended` (Req 3.4)', () => {
    mockMatchMedia(true);
    setupDom([
      { type: 'image', duration: 2 },
      { type: 'video' },
      { type: 'image' },
    ]);
    loadCarousel();

    // Image auto-advance is disabled: advancing well past the duration does
    // nothing.
    vi.advanceTimersByTime(10000);
    expect(transform()).toBe('');
    expect(activeDotIndex()).toBe(-1);

    // Navigate to the video slide (manual nav still works under reduced motion).
    navItems()[1].click();
    expect(transform()).toBe('translateX(-100%)');
    expect(activeDotIndex()).toBe(1);

    // The video still advances on `ended` even under reduced motion.
    const video = carouselEl().querySelector('.dawn-carousel-item:nth-child(2) video');
    video.dispatchEvent(new Event('ended'));
    expect(transform()).toBe('translateX(-200%)');
    expect(activeDotIndex()).toBe(2);

    // And the image slide reached via the video does NOT then auto-advance.
    vi.advanceTimersByTime(10000);
    expect(transform()).toBe('translateX(-200%)');
    expect(activeDotIndex()).toBe(2);
  });
});
