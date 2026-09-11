/**
 * Carousel
 *
 * Each `.carousel-container` on the page is initialised independently, so multiple
 * Carousel sections can coexist. Guards against missing markup (the script is loaded
 * on every page but the section may be absent) and honours `prefers-reduced-motion`
 * by disabling auto-advance.
 */
(function () {
  const CAROUSEL_NAV_ACTIVE_CLASS = 'active';
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class Carousel {
    constructor(container) {
      this.container = container;
      this.carousel = container.querySelector('.carousel');
      this.navContainer = container.querySelector('.carousel-nav-container');
      this.nav = this.navContainer ? this.navContainer.querySelector('.carousel-nav') : null;

      // Bail out if the essential structure is missing.
      if (!this.carousel || !this.nav || !this.carousel.children.length) return;

      this.slides = Array.from(this.carousel.children);
      this.navItems = Array.from(this.nav.children);
      this.selectedIdx = 0;
      this.timeoutId = undefined;
      this.touchstartX = 0;
      this.touchendX = 0;
      this.touchstartY = 0;
      this.touchendY = 0;

      if (this.slides.length > 1 && this.navContainer) {
        this.navContainer.classList.remove('hidden');
      }

      this.init();
    }

    init() {
      this.container.addEventListener(
        'touchstart',
        (e) => {
          this.touchstartX = e.changedTouches[0].screenX;
          this.touchstartY = e.changedTouches[0].screenY;
        },
        { passive: true },
      );

      this.container.addEventListener(
        'touchend',
        (e) => {
          this.touchendX = e.changedTouches[0].screenX;
          this.touchendY = e.changedTouches[0].screenY;
          this.checkDirection();
        },
        { passive: true },
      );

      this.slides.forEach((slide, itemIdx) => {
        const media = this.getMedia(slide);
        const navItem = this.navItems[itemIdx];

        if (navItem) {
          navItem.addEventListener('click', (event) => {
            if (this.selectedIdx === itemIdx) return;
            this.goTo(event, itemIdx);
          });
        }

        if (media instanceof HTMLVideoElement) {
          if (slide === this.carousel.firstElementChild) {
            this.safePlay(media);
          }
          media.addEventListener(
            'ended',
            (event) => {
              const next = itemIdx < this.slides.length - 1 ? itemIdx + 1 : 0;
              this.goTo(event, next);
            },
            false,
          );
        } else if (
          media instanceof HTMLPictureElement &&
          slide === this.carousel.firstElementChild &&
          !prefersReducedMotion
        ) {
          this.scheduleImage(itemIdx, slide);
        }
      });
    }

    getMedia(slide) {
      return slide.querySelector(':scope > a > video, :scope > a > picture, :scope > video, :scope > picture');
    }

    safePlay(video) {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }

    scheduleImage(idx, item) {
      // Auto-advance is disabled when the user prefers reduced motion.
      if (prefersReducedMotion || this.slides.length <= 1) return;

      const duration = Number(item.dataset && item.dataset.duration) || 2;
      const position = this.selectedIdx < this.slides.length - 1 ? idx + 1 : 0;
      const currentIdx = this.selectedIdx;

      this.timeoutId = setTimeout(() => {
        // Cancel if the user navigated in the meantime.
        if (currentIdx !== this.selectedIdx) return;
        this.goTo(undefined, position, this.timeoutId);
      }, duration * 1000);
    }

    goTo(event, position, previousTimeoutId) {
      if (position < 0 || position >= this.slides.length) return;

      const currentMedia = this.slides[this.selectedIdx] ? this.getMedia(this.slides[this.selectedIdx]) : null;
      if (currentMedia instanceof HTMLVideoElement) {
        currentMedia.pause();
        currentMedia.currentTime = 0;
      }

      if (this.navItems[this.selectedIdx]) {
        this.navItems[this.selectedIdx].classList.remove(CAROUSEL_NAV_ACTIVE_CLASS);
      }

      this.carousel.style.transform = `translateX(${position * -100}%)`;

      if (this.navItems[position]) {
        this.navItems[position].classList.add(CAROUSEL_NAV_ACTIVE_CLASS);
      }
      this.selectedIdx = position;

      const nextMedia = this.getMedia(this.slides[position]);
      if (nextMedia instanceof HTMLVideoElement) {
        this.safePlay(nextMedia);
      } else if (nextMedia instanceof HTMLPictureElement) {
        this.scheduleImage(position, this.slides[position]);
      }

      if (previousTimeoutId) clearTimeout(previousTimeoutId);
    }

    checkDirection() {
      // Ignore mostly-vertical swipes (scrolling).
      if (Math.abs(this.touchstartY - this.touchendY) > 100) return;

      if (this.touchendX < this.touchstartX) {
        const next = this.selectedIdx < this.slides.length - 1 ? this.selectedIdx + 1 : 0;
        this.goTo(undefined, next, this.timeoutId);
        return;
      }

      if (this.touchendX > this.touchstartX) {
        const prev = this.selectedIdx > 0 ? this.selectedIdx - 1 : this.slides.length - 1;
        this.goTo(undefined, prev, this.timeoutId);
      }
    }
  }

  function initCarousels() {
    document.querySelectorAll('.carousel-container').forEach((container) => {
      if (container.dataset.carouselInit === 'true') return;
      container.dataset.carouselInit = 'true';
      new Carousel(container);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousels);
  } else {
    initCarousels();
  }
})();
