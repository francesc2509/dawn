# Implementation Plan: Carousel Full-Image CTA Slide

## Overview

Convert the design into incremental coding steps across the three affected files (`sections/carousel.liquid`, `assets/carousel.js`, `assets/carousel.css`). The sequence builds server-rendered decisions first (schema + Liquid rendering), then the JS media-resolution change that keeps auto-advance and `goTo` working when media is nested in an anchor, then the CSS that makes the anchor fill the slide and reapplies fit/position rules, and finally the property, example, and integration tests. Each step builds on the previous one and ends with the feature wired together, with the tests validating the correctness properties defined in the design.

The design specifies its own languages: Liquid for the section, JavaScript for the carousel script and its tests (with **fast-check** as the property-based testing library), and CSS for styling. No implementation-language question is required.

## Tasks

- [x] 1. Add the three per-slide block settings to the schema
  - In `sections/carousel.liquid`, append three settings to the `slide` block's `settings` array: `full_image_cta_enabled` (`checkbox`, `"default": false`), `full_image_cta_url` (`url`), and `full_image_cta_label` (`inline_richtext`)
  - Add matching labels/info to the section locale schema so the settings render in the theme editor
  - Keep all existing slide settings (image, video, slide_fit, slide_position, slide_duration, overlay, hero_*, color_scheme) unchanged and available
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 6.4_

- [x] 2. Implement the slide render-decision logic and conditional rendering in Liquid
  - [x] 2.1 Compute the single per-slide mode decision in a `{%- liquid -%}` block
    - Derive `has_media` (image present OR video present), `cta_mode` (`full_image_cta_enabled AND has_media`), `cta_has_link` (`cta_mode AND url != blank`)
    - Derive `cta_accessible_name` via the fallback chain: stripped/escaped label (`strip_html | strip | escape`), then `block.settings.image.alt | escape`, then `cta_url`
    - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 6.2, 6.3_

  - [x] 2.2 Factor the media markup into a reusable capture and wrap it in the anchor when linked
    - Capture the existing picture/video markup once via `{% capture slide_media %}...{% endcapture %}`, preserving the mobile-image `<source media="(max-width: 768px)">` and the mobile/desktop video `<source>` elements verbatim
    - When `cta_has_link`, emit `<a class="dawn-carousel-cta-link" href="{{ cta_url }}" aria-label="{{ cta_accessible_name }}">{{ slide_media }}</a>`; otherwise emit `{{ slide_media }}` unwrapped
    - Keep `.dawn-carousel-item` classes (`slide_position`, `slide_fit`, `color-...`) and its `data-duration` attribute unchanged
    - _Requirements: 2.1, 2.5, 2.6, 2.7, 2.8, 6.2, 6.4_

  - [x] 2.3 Gate the hero curtain on Standard_Mode
    - Wrap the existing hero curtain (overlay, title, subtitle, main content, primary and secondary CTA buttons) in `{%- unless cta_mode -%}...{%- endunless -%}` so it renders only in Standard_Mode and is omitted whenever `cta_mode` is true
    - _Requirements: 2.4, 6.1, 6.2, 6.3_

- [x] 3. Introduce `getMedia()` and replace `firstElementChild` reads in the carousel script
  - [x] 3.1 Add the `getMedia(slide)` helper to the `Carousel` class
    - Implement `getMedia(slide)` returning `slide.querySelector(':scope > a > video, :scope > a > picture, :scope > video, :scope > picture')` so media resolves whether it is a direct child (Standard_Mode) or nested inside the anchor (Full_Image_CTA_Mode)
    - _Requirements: 3.1, 3.2, 3.3, 4.4_

  - [x] 3.2 Replace the three `firstElementChild` reads with `this.getMedia(...)`
    - In `init()`, replace `const media = slide.firstElementChild;` with `const media = this.getMedia(slide);`, leaving the `instanceof HTMLVideoElement` / `HTMLPictureElement` branches, first-slide autoplay, video `ended` listener, and `scheduleImage` call unchanged
    - In `goTo()`, replace both `firstElementChild` reads (current-media pause/reset and next-media play/schedule) with `this.getMedia(...)`
    - Leave `checkDirection()`, `scheduleImage()`, `safePlay()`, nav-dot wiring, and the reduced-motion guard untouched
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Add the anchor and media CSS rules
  - In `assets/carousel.css`, add `.dawn-carousel-item > .dawn-carousel-cta-link` rules so the anchor is `display: block; position: absolute; inset: 0; width/height: 100%` and covers the full slide with no dead zones
  - Reapply `object-fit`/`object-position` to `img` and `> video` nested inside the anchor, including the `.left`, `.right`, and `.fill` variants, matching the existing Standard_Mode media rules
  - Add a `.dawn-carousel-cta-link:focus-visible` rule with a visible outline (`3px solid rgb(var(--color-foreground))`, `outline-offset: -3px`)
  - _Requirements: 2.3, 2.8, 5.4, 5.5_

- [x] 5. Checkpoint - verify rendering and behavior wiring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Extract pure decision logic and property tests for rendering
  - [x] 6.1 Extract the `resolveSlideRender(settings)` pure function
    - Implement a testable JS function mirroring the Liquid derivation, returning `{ mode, emitAnchor, href, accessibleName, heroVisible }` from slide settings (toggle, url, label, alt, media presence, fit/position/color, duration)
    - _Requirements: 1.1, 1.2, 2.1, 2.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

  - [x] 6.2 Write property test for mode selection
    - **Property 1: Mode selection is exactly determined by toggle and media presence**
    - **Validates: Requirements 1.1, 1.2, 6.3**
    - Use fast-check, minimum 100 iterations; tag `Feature: carousel-full-image-cta-slide, Property 1: Mode selection is exactly determined by toggle and media presence`

  - [x] 6.3 Write property test for anchor emission
    - **Property 2: Anchor emission requires mode and a URL**
    - **Validates: Requirements 2.1, 6.2**
    - Use fast-check, minimum 100 iterations; tag `Feature: carousel-full-image-cta-slide, Property 2: Anchor emission requires mode and a URL`

  - [x] 6.4 Write property test for hero omission
    - **Property 3: Hero content is omitted exactly in full-image mode**
    - **Validates: Requirements 2.4, 6.1, 6.2**
    - Use fast-check, minimum 100 iterations; tag `Feature: carousel-full-image-cta-slide, Property 3: Hero content is omitted exactly in full-image mode`

  - [x] 6.5 Write property test for accessible-name fallback
    - **Property 4: Accessible-name fallback chain**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Use fast-check, minimum 100 iterations; tag `Feature: carousel-full-image-cta-slide, Property 4: Accessible-name fallback chain`

  - [x] 6.6 Write property test for preserved structural settings
    - **Property 6: Existing structural settings are preserved across modes**
    - **Validates: Requirements 2.8, 6.4**
    - Use fast-check, minimum 100 iterations; tag `Feature: carousel-full-image-cta-slide, Property 6: Existing structural settings are preserved across modes`

- [x] 7. Property test for JS media resolution
  - [x] 7.1 Write property test for `getMedia()` against a JSDOM fixture
    - **Property 5: Media element is resolvable regardless of wrapping**
    - **Validates: Requirements 3.1, 3.2, 3.3, 4.4**
    - Build slides both wrapped (anchor) and unwrapped from the same media element and assert `getMedia` returns the same element type in both cases
    - Use fast-check, minimum 100 iterations; tag `Feature: carousel-full-image-cta-slide, Property 5: Media element is resolvable regardless of wrapping`

- [x] 8. Example / unit tests for concrete renders
  - [x] 8.1 Write example tests for Standard_Mode and full-image renders
    - Toggle off renders the hero curtain with no anchor, matching pre-feature markup — Req 6.1
    - Toggle on with URL wraps a `<picture>` in `<a href>` and omits the curtain — Req 2.1, 2.4
    - Toggle on with URL wraps a `<video>` in `<a>` and preserves mobile and desktop `<source>` elements — Req 2.5, 2.6, 2.7
    - Toggle on, no URL: media present, no anchor, no curtain — Req 6.2
    - Toggle on, no media: Standard_Mode, no anchor — Req 6.3
    - Accessible-name cases: label-only, alt-only, url-only — Req 5.1, 5.2, 5.3
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

- [x] 9. Integration / browser tests for DOM-visual and behavior wiring
  - [x] 9.1 Write integration tests for clickable area and keyboard accessibility
    - Anchor covers 100% of the slide area with no dead zones (corner clicks / computed layout) — Req 2.3
    - Tab reaches the link, Enter activates it, and `:focus-visible` shows an outline — Req 5.4, 5.5
    - _Requirements: 2.3, 5.4, 5.5_

  - [x] 9.2 Write integration tests for auto-advance across full-image slides
    - Image full-image slide auto-advances after its duration and cancels on manual navigation — Req 3.1, 3.5, 3.6
    - Video full-image slide advances on `ended`, wrapping last to first — Req 3.2, 3.3
    - Reduced-motion disables image auto-advance while videos still advance on `ended` — Req 3.4
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 9.3 Write integration tests for swipe and nav dots on full-image slides
    - Swipe left/right navigates with wraparound and vertical-scroll rejection (>100px) does not change slide — Req 4.1, 4.2, 4.3
    - One nav dot per slide including full-image slides, and clicking a dot navigates — Req 4.4, 4.5
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP.
- Each task references specific requirements (granular sub-requirements) for traceability.
- Checkpoints ensure incremental validation.
- Property tests validate the universal correctness properties over the pure `resolveSlideRender` decision logic and `getMedia` resolution, using fast-check at 100+ iterations, each tagged per the design's format.
- Unit/example tests pin concrete renders and backward-compatible Standard_Mode markup; integration tests cover browser behaviors (clickable area, focus, auto-advance, swipe, nav dots) that cannot be expressed as universally quantified properties.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "3.1", "4"] },
    { "id": 1, "tasks": ["2.1", "3.2"] },
    { "id": 2, "tasks": ["2.2", "6.1", "7.1"] },
    { "id": 3, "tasks": ["2.3", "6.2", "6.3", "6.4", "6.5", "6.6"] },
    { "id": 4, "tasks": ["8.1", "9.1", "9.2", "9.3"] }
  ]
}
```
