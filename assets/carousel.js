const carouselContainer = document.querySelector(".carousel-container");
if (!carouselContainer) {
  /* Homepage hero not on this page */
} else {
const carousel = carouselContainer.querySelector(".carousel");
const carouselNavContainer = carouselContainer.querySelector(".carousel-nav-container");
const carouselNav = carouselNavContainer.querySelector(".carousel-nav");
const carouselArrows = carouselContainer.querySelector(".carousel-arrows");
const carouselPrev = carouselContainer.querySelector(".carousel-arrow--prev");
const carouselNext = carouselContainer.querySelector(".carousel-arrow--next");
const carouselCurtain = carouselContainer.querySelector(".carousel-curtain");
const carouselNavActiveClassName = 'active';

if (carousel.children.length && carousel.children.length > 1) {
  carouselNavContainer.classList.remove("hidden");
  carouselArrows?.classList.remove("hidden");
}

carouselPrev?.addEventListener("click", () => {
  if (selectedIdx > 0) {
    handlePreviousItem(undefined, selectedIdx);
  } else {
    handleGoToEnd(undefined);
  }
});

carouselNext?.addEventListener("click", () => {
  if (selectedIdx < carousel.children.length - 1) {
    handleNextItem(undefined, selectedIdx);
  } else {
    handleGoToStart(undefined);
  }
});

let idx = 0;
let selectedIdx = idx;
let timeoutId = undefined;

let touchstartX = 0
let touchendX = 0
let touchstartY = 0;
let touchendY = 0;

carouselContainer.addEventListener('touchstart', e => {
  touchstartX = e.changedTouches[0].screenX;
  touchstartY = e.changedTouches[0].screenY;
})

carouselContainer.addEventListener('touchend', e => {
  touchendX = e.changedTouches[0].screenX;
  touchendY = e.changedTouches[0].screenY;
  checkDirection()
})

const scheduleImage = (idx, item) => {
    const duration = Number(item.dataset?.duration) || 2;
    const position = selectedIdx < carousel.children.length - 1 ? idx + 1: 0;
    const currentIdx = selectedIdx;
  
    timeoutId = setTimeout(() => {
        if (currentIdx !== selectedIdx) {
          return;
        }
        
        handleCarouselChange(undefined, position, timeoutId)
    }, duration * 1000);
}

const getSlideVideos = (slideEl) => {
  if (!slideEl) return [];
  return Array.from(slideEl.querySelectorAll("video.bc-hero__video"));
};

const pauseSlideVideos = (slideEl) => {
  getSlideVideos(slideEl).forEach((video) => {
    video.pause();
    try {
      video.currentTime = 0;
    } catch (e) {
      /* ignore seek errors */
    }
  });
};

const playSlideVideos = (slideEl) => {
  getSlideVideos(slideEl).forEach((video) => {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  });
};

const slideUsesVideo = (slideEl) => getSlideVideos(slideEl).length > 0;

const handleCarouselChange = (event, position, previousTimeoutId) => {
    pauseSlideVideos(carousel.children[selectedIdx]);

    carouselNav.children[selectedIdx].classList.remove(carouselNavActiveClassName);
    carousel.style.transform = `translateX(${position * -100}%)`;
    carouselNav.children[position].classList.add(carouselNavActiveClassName);
    selectedIdx = position;

    if (slideUsesVideo(carousel.children[position])) {
      playSlideVideos(carousel.children[position]);
    } else if (carousel.children[position].firstElementChild instanceof HTMLPictureElement) {
      scheduleImage(position, carousel.children[position]);
    }

    if (previousTimeoutId) {
      clearTimeout(previousTimeoutId);
    }
} 

const handlePreviousItem = (event, itemIdx) => {
    handleCarouselChange(event, itemIdx - 1, timeoutId);
};

const handleNextItem = (event, itemIdx) => {
    handleCarouselChange(event, itemIdx + 1, timeoutId);
};

const handleGoToStart = (event) => {
    handleCarouselChange(event, 0, timeoutId);
};

const handleGoToEnd = (event) => {
    handleCarouselChange(event, carousel.children.length - 1, timeoutId);
};

const checkDirection = () => {
  if (Math.abs(touchstartY - touchendY) > 100) {
    return;
  }
  
  if (touchendX < touchstartX) {
    const handler = selectedIdx < carousel.children.length - 1 ?
        (event) => handleNextItem(event, selectedIdx):
        (event) => handleGoToStart(event);
    handler();
    return;
  }

  if (touchendX > touchstartX) {
    const handler = selectedIdx > 0 ?
        (event) => handlePreviousItem(event, selectedIdx):
        (event) => handleGoToEnd(event);
    handler();
    return;
  }
}

for (let carouselItem of carousel.children) {
  const itemIdx = idx;

  carouselNav.children[itemIdx].addEventListener('click', (event) => {
    if (selectedIdx === itemIdx) {
      return;
    }
    
    handleCarouselChange(event, itemIdx);
  });

  const videos = getSlideVideos(carouselItem);
  if (videos.length) {
    if (carouselItem === carousel.firstElementChild) {
      playSlideVideos(carouselItem);
    }

    const handler = itemIdx < carousel.children.length - 1 ?
      (event) => handleNextItem(event, itemIdx):
      (event) => handleGoToStart(event);

    videos.forEach((media) => {
      media.addEventListener('ended', () => {
        if (media.loop || media.dataset.videoLoop === 'true') {
          return;
        }
        handler();
      });
    });
  } else if (carouselItem.firstElementChild instanceof HTMLPictureElement && carouselItem === carousel.firstElementChild) {
    scheduleImage(idx, carouselItem);
  }
  idx++;
}
}