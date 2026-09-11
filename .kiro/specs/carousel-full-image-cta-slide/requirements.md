# Requirements Document

## Introduction

This feature extends the existing Carousel section of the Dawn theme to support a new slide layout in which the entire slide image (or video) acts as a single clickable link to a merchant-configured destination. In this "full-image CTA" mode, the whole visible media becomes the call-to-action, replacing the hero-text-with-buttons layout that a slide would otherwise display. Merchants opt into this mode per slide. Slides that do not opt in continue to render exactly as they do today, preserving backward compatibility. The feature must keep the existing carousel behaviors intact: auto-advance for images and videos, touch-swipe navigation, navigation dots, and honoring the user's reduced-motion preference.

## Glossary

- **Carousel_Section**: The Shopify section defined in `sections/carousel.liquid` that renders one or more slides inside a single `.carousel-container`.
- **Slide**: A single `slide` block within the Carousel_Section, rendered as a `.dawn-carousel-item` element containing one media element (image `<picture>` or `<video>`) and hero content.
- **Slide_Media**: The image (`<picture>`/`<img>`) or video (`<video>`) element belonging to a Slide.
- **Full_Image_CTA_Mode**: A per-Slide configuration in which the entire Slide_Media is wrapped in a single link to a merchant-configured destination and the hero text and hero CTA buttons are not rendered.
- **Standard_Mode**: The existing Slide layout that renders hero text (title, subtitle, main content) and up to two hero CTA buttons over a gradient overlay.
- **Full_Image_CTA_Link**: The anchor element wrapping the Slide_Media when a Slide is in Full_Image_CTA_Mode.
- **Full_Image_CTA_URL**: The merchant-configured destination URL that the Full_Image_CTA_Link points to.
- **Full_Image_CTA_Label**: A merchant-configured accessible text description used as the accessible name of the Full_Image_CTA_Link.
- **Carousel_Script**: The JavaScript in `assets/carousel.js` that initializes each `.carousel-container`, handles auto-advance, swipe navigation, and navigation dots.
- **Auto_Advance**: The behavior by which the Carousel_Section automatically transitions from the current Slide to the next Slide (after a configured duration for images, or on playback completion for videos).
- **Reduced_Motion_Preference**: The user's operating-system setting exposed via the `prefers-reduced-motion: reduce` media query.
- **Merchant**: The store owner or editor configuring the Carousel_Section in the Shopify theme editor.
- **Visitor**: The end user viewing the storefront that renders the Carousel_Section.

## Requirements

### Requirement 1: Enable Full-Image CTA Mode per Slide

**User Story:** As a Merchant, I want to configure an individual slide so its entire image is a single clickable link, so that I can create a visually clean promotional slide without separate text and buttons.

#### Acceptance Criteria

1. THE Carousel_Section SHALL provide a per-Slide setting, scoped to that Slide's block, that accepts an enabled or disabled value, and WHERE that setting is enabled THE Carousel_Section SHALL render that Slide in Full_Image_CTA_Mode.
2. WHERE Full_Image_CTA_Mode is disabled for a Slide, THE Carousel_Section SHALL render that Slide in Standard_Mode.
3. THE Carousel_Section SHALL default the Full_Image_CTA_Mode setting to disabled for each Slide.
4. THE Carousel_Section SHALL provide a per-Slide Full_Image_CTA_URL setting, accepting a value of up to 2,048 characters, used as the link destination in Full_Image_CTA_Mode.
5. THE Carousel_Section SHALL provide a per-Slide Full_Image_CTA_Label setting, accepting a value of up to 200 characters, used as the accessible name of the Full_Image_CTA_Link.

### Requirement 2: Render the Slide Media as a Full-Image Link

**User Story:** As a Visitor, I want to click anywhere on a full-image slide, so that I am taken to the linked destination without hunting for a small button.

#### Acceptance Criteria

1. WHERE Full_Image_CTA_Mode is enabled for a Slide AND a Full_Image_CTA_URL is configured, THE Carousel_Section SHALL wrap the Slide_Media in a Full_Image_CTA_Link whose destination is the Full_Image_CTA_URL.
2. WHERE Full_Image_CTA_Mode is enabled for a Slide AND a Full_Image_CTA_URL is configured, WHEN a Visitor activates the Full_Image_CTA_Link by pointer click or keyboard activation, THE Carousel_Section SHALL navigate the browser to the Full_Image_CTA_URL.
3. WHERE Full_Image_CTA_Mode is enabled for a Slide, THE Carousel_Section SHALL render the Full_Image_CTA_Link so that its clickable area covers 100 percent of the displayed width and height of the Slide_Media with no non-clickable regions inside that area.
4. WHERE Full_Image_CTA_Mode is enabled for a Slide, THE Carousel_Section SHALL omit the hero title, hero subtitle, hero main content, primary hero CTA button, and secondary hero CTA button for that Slide.
5. WHERE Full_Image_CTA_Mode is enabled for a Slide AND the Slide has a mobile image configured, THE Carousel_Section SHALL display the mobile image within the Full_Image_CTA_Link on viewports 768 pixels wide or less.
6. WHERE Full_Image_CTA_Mode is enabled for a Slide AND the Slide has a mobile image configured, THE Carousel_Section SHALL display the Slide's non-mobile image within the Full_Image_CTA_Link on viewports wider than 768 pixels.
7. WHERE Full_Image_CTA_Mode is enabled for a Slide AND the Slide has a video configured, THE Carousel_Section SHALL wrap the video in the Full_Image_CTA_Link.
8. WHERE Full_Image_CTA_Mode is enabled for a Slide, THE Carousel_Section SHALL apply the existing slide fit and slide position settings to the Slide_Media.

### Requirement 3: Preserve Auto-Advance Behavior

**User Story:** As a Merchant, I want full-image slides to auto-advance like other slides, so that the carousel rotation stays consistent across all slide types.

#### Acceptance Criteria

1. WHERE Full_Image_CTA_Mode is enabled for a Slide containing an image, THE Carousel_Script SHALL apply the same image Auto_Advance behavior that applies to a Standard_Mode image Slide, using that Slide's configured duration and defaulting to 2 seconds when no duration is configured.
2. WHERE Full_Image_CTA_Mode is enabled for a Slide containing a video AND the Slide is not the last Slide, THE Carousel_Script SHALL advance to the next Slide when the video playback completes.
3. WHERE Full_Image_CTA_Mode is enabled for the last Slide containing a video, THE Carousel_Script SHALL advance to the first Slide when the video playback completes.
4. WHILE the Reduced_Motion_Preference is set to reduce, THE Carousel_Script SHALL disable image Auto_Advance for Full_Image_CTA_Mode Slides while continuing to advance video Slides on playback completion.
5. WHEN a Slide in Full_Image_CTA_Mode becomes the active Slide, THE Carousel_Script SHALL schedule image Auto_Advance to the next Slide, wrapping to the first Slide when the active Slide is the last Slide, after that Slide's configured duration in seconds.
6. IF a Visitor navigates to a different Slide before a scheduled image Auto_Advance elapses, THEN THE Carousel_Script SHALL cancel that scheduled Auto_Advance and SHALL NOT change the active Slide as a result of the cancelled schedule.

### Requirement 4: Preserve Navigation and Swipe Behavior

**User Story:** As a Visitor, I want to swipe and use navigation dots on full-image slides, so that I can move between slides the same way as on other slides.

#### Acceptance Criteria

1. WHEN a Visitor performs a horizontal swipe leftward on a Slide in Full_Image_CTA_Mode, THE Carousel_Script SHALL navigate to the next Slide, and SHALL navigate from the last Slide to the first Slide.
2. WHEN a Visitor performs a horizontal swipe rightward on a Slide in Full_Image_CTA_Mode, THE Carousel_Script SHALL navigate to the previous Slide, and SHALL navigate from the first Slide to the last Slide.
3. IF a Visitor's swipe has a vertical displacement greater than 100 pixels between touch start and touch end, THEN THE Carousel_Script SHALL treat the gesture as a scroll and SHALL NOT change the active Slide.
4. WHEN a Visitor selects a navigation dot, THE Carousel_Script SHALL display the corresponding Slide regardless of whether that Slide is in Full_Image_CTA_Mode or Standard_Mode.
5. THE Carousel_Section SHALL render one navigation dot per Slide, including Slides in Full_Image_CTA_Mode.

### Requirement 5: Accessibility of the Full-Image Link

**User Story:** As a Visitor using assistive technology, I want a meaningful description of where a full-image slide leads, so that I can decide whether to activate the link.

#### Acceptance Criteria

1. WHERE Full_Image_CTA_Mode is enabled for a Slide AND the Full_Image_CTA_Label is non-empty, THE Carousel_Section SHALL set the accessible name of the Full_Image_CTA_Link to the exact text of the Full_Image_CTA_Label, supporting a Full_Image_CTA_Label of 1 to 200 characters.
2. IF Full_Image_CTA_Mode is enabled for a Slide AND the Full_Image_CTA_Label is empty AND the Slide image alt text is non-empty, THEN THE Carousel_Section SHALL set the accessible name of the Full_Image_CTA_Link to the exact text of the Slide image alt text.
3. IF Full_Image_CTA_Mode is enabled for a Slide AND both the Full_Image_CTA_Label and the Slide image alt text are empty, THEN THE Carousel_Section SHALL set the accessible name of the Full_Image_CTA_Link to the configured Full_Image_CTA_URL, so that the link is never exposed to assistive technology without an accessible name.
4. WHERE Full_Image_CTA_Mode is enabled for a Slide, THE Carousel_Section SHALL render the Full_Image_CTA_Link as a link that can receive keyboard focus via sequential Tab navigation and be activated with the Enter key.
5. WHILE the Full_Image_CTA_Link has keyboard focus, THE Carousel_Section SHALL display a visible focus indication on the Full_Image_CTA_Link.

### Requirement 6: Backward Compatibility and Fallback

**User Story:** As a Merchant with existing slides, I want my current slides to keep working unchanged, so that adding the new feature does not disrupt my live storefront.

#### Acceptance Criteria

1. WHERE Full_Image_CTA_Mode is disabled for a Slide, THE Carousel_Section SHALL render that Slide in Standard_Mode with its hero title, hero subtitle, hero main content, primary hero CTA button, and secondary hero CTA button using the same markup and layout as when the Full_Image_CTA_Mode setting did not exist.
2. IF Full_Image_CTA_Mode is enabled for a Slide AND no Full_Image_CTA_URL is configured, THEN THE Carousel_Section SHALL render the Slide_Media without a Full_Image_CTA_Link and SHALL omit the hero title, hero subtitle, hero main content, primary hero CTA button, and secondary hero CTA button for that Slide.
3. IF a Slide has neither an image nor a video configured, THEN THE Carousel_Section SHALL render that Slide in Standard_Mode without a Full_Image_CTA_Link, regardless of the Full_Image_CTA_Mode setting.
4. THE Carousel_Section SHALL keep the existing color scheme, slide fit, slide position, slide duration, and overlay settings available for every Slide regardless of mode.
