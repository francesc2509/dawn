/**
 * carousel-render.js
 *
 * Pure, DOM-free decision logic for the Carousel section's per-slide render mode.
 *
 * This module mirrors the Liquid derivation in `sections/carousel.liquid` so the
 * decision logic can be exercised by unit and property-based tests without a
 * Liquid runtime or a browser. It intentionally has NO side effects and NO DOM
 * dependency, and it does not affect the browser script `assets/carousel.js`
 * (which remains a standalone IIFE loaded via <script> in the theme).
 *
 * Liquid reference (sections/carousel.liquid):
 *
 *   assign has_media = false
 *   if block.settings.video != blank or block.settings.image != blank
 *     assign has_media = true
 *   endif
 *
 *   assign cta_mode = false
 *   if block.settings.full_image_cta_enabled and has_media
 *     assign cta_mode = true
 *   endif
 *
 *   assign cta_url = block.settings.full_image_cta_url
 *   assign cta_has_link = false
 *   if cta_mode and cta_url != blank
 *     assign cta_has_link = true
 *   endif
 *
 *   # accessible name: label -> image alt -> url
 *   assign cta_accessible_name = block.settings.full_image_cta_label | strip_html | strip | escape
 *   if cta_accessible_name == blank
 *     assign cta_accessible_name = block.settings.image.alt | escape
 *   endif
 *   if cta_accessible_name == blank
 *     assign cta_accessible_name = cta_url
 *   endif
 */

/** Render mode constants. */
export const MODE_FULL_IMAGE_CTA = 'full-image-cta';
export const MODE_STANDARD = 'standard';

/**
 * Mirror Liquid's `!= blank` test.
 *
 * In Liquid, `blank` matches nil, an empty string, and a string containing only
 * whitespace. We treat `null`/`undefined` and empty/whitespace-only strings as
 * blank, matching that behavior for the string-valued settings (url).
 *
 * @param {unknown} value
 * @returns {boolean} true when the value is considered non-blank by Liquid.
 */
function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  // Non-string, non-nullish values (e.g. an image/video object) are "present".
  return true;
}

/**
 * Mirror Liquid's `strip_html | strip` for the accessible-name label.
 *
 * - `strip_html` removes HTML tags.
 * - `strip` trims leading/trailing whitespace.
 *
 * The Liquid chain also applies `| escape`, which HTML-escapes characters such
 * as `&`, `<`, `>`, `"`. For the accessible-name decision we only need to know
 * whether the stripped label is blank and what its plain-text value is; full
 * HTML-entity escaping is a rendering concern handled by Liquid at output time,
 * not part of the fallback-selection logic. The stripped text is returned as-is
 * so the value is consistent and documented. A label that is only tags and/or
 * whitespace strips to an empty string and is therefore treated as blank,
 * matching Liquid.
 *
 * @param {unknown} value
 * @returns {string} the stripped plain-text label (may be empty).
 */
function stripLabel(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<[^>]*>/g, '') // strip_html
    .trim(); // strip
}

/**
 * @typedef {Object} SlideSettings
 * @property {boolean} [full_image_cta_enabled] Toggle for Full_Image_CTA_Mode.
 * @property {string} [full_image_cta_url] Link destination in full-image mode.
 * @property {string} [full_image_cta_label] Accessible label (may contain markup/whitespace).
 * @property {{ alt?: string } | null} [image] Slide image; `alt` used in the fallback chain.
 * @property {boolean} [hasImage] Whether an image is present (image != blank).
 * @property {boolean} [hasVideo] Whether a video is present (video != blank).
 * @property {string} [slide_fit] Structural pass-through: fit setting.
 * @property {string} [slide_position] Structural pass-through: position setting.
 * @property {string} [color_scheme] Structural pass-through: color scheme.
 * @property {number} [slide_duration] Structural pass-through: duration seconds.
 */

/**
 * @typedef {Object} SlideRender
 * @property {('full-image-cta'|'standard')} mode Chosen render mode.
 * @property {boolean} emitAnchor Whether the media is wrapped in an anchor (cta_has_link).
 * @property {(string|null)} href Anchor href when `emitAnchor`, otherwise null.
 * @property {(string|null)} accessibleName Anchor accessible name when `emitAnchor`, otherwise null.
 * @property {boolean} heroVisible Whether the hero curtain renders (Standard_Mode only).
 * @property {Object} settings Preserved structural settings (slide_fit, slide_position, color_scheme, slide_duration).
 */

/**
 * Resolve a slide's render decision from its settings, mirroring the Liquid
 * derivation exactly.
 *
 * Media presence can be provided either via explicit `hasImage`/`hasVideo`
 * booleans or via the presence of `image`/`video` fields (matching Liquid's
 * `image != blank` / `video != blank`).
 *
 * @param {SlideSettings} [settings]
 * @returns {SlideRender}
 */
export function resolveSlideRender(settings = {}) {
  const s = settings || {};

  // has_media = (video present) OR (image present)
  const hasImage = s.hasImage !== undefined ? Boolean(s.hasImage) : isPresent(s.image);
  const hasVideo = s.hasVideo !== undefined ? Boolean(s.hasVideo) : isPresent(s.video);
  const hasMedia = hasVideo || hasImage;

  // cta_mode = full_image_cta_enabled AND has_media
  const ctaMode = Boolean(s.full_image_cta_enabled) && hasMedia;

  // cta_has_link = cta_mode AND (url != blank)
  const url = s.full_image_cta_url;
  const ctaHasLink = ctaMode && isPresent(url);

  // accessible name fallback chain: stripped label -> image alt -> url
  let accessibleName = null;
  if (ctaHasLink) {
    const strippedLabel = stripLabel(s.full_image_cta_label);
    if (strippedLabel !== '') {
      accessibleName = strippedLabel;
    } else {
      const alt = s.image && typeof s.image === 'object' ? s.image.alt : undefined;
      if (isPresent(alt)) {
        accessibleName = String(alt).trim();
      } else {
        // url is guaranteed present here because ctaHasLink is true.
        accessibleName = String(url);
      }
    }
  }

  return {
    mode: ctaMode ? MODE_FULL_IMAGE_CTA : MODE_STANDARD,
    emitAnchor: ctaHasLink,
    href: ctaHasLink ? String(url) : null,
    accessibleName,
    // heroVisible = NOT cta_mode (hero curtain renders only in Standard_Mode).
    heroVisible: !ctaMode,
    // Structural settings are passed through unchanged so tests can assert
    // preservation across modes (Property 6 / Req 2.8, 6.4).
    settings: {
      slide_fit: s.slide_fit,
      slide_position: s.slide_position,
      color_scheme: s.color_scheme,
      slide_duration: s.slide_duration,
    },
  };
}

export default resolveSlideRender;
