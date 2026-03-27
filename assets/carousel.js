const carouselContainer = document.querySelector(".carousel-container");
const carousel = carouselContainer.querySelector(".carousel");
const carouselNavContainer = carouselContainer.querySelector(".carousel-nav-container");
const carouselNav = carouselNavContainer.querySelector(".carousel-nav");
const carouselCurtain = carouselContainer.querySelector(".carousel-curtain");
const carouselNavActiveClassName = 'active';

if (carousel.children.length && carousel.children.length > 1) {
  carouselNavContainer.classList.remove("hidden");
}

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

const handleCarouselChange = (event, position, previousTimeoutId) => {
    const firstElementChild = carousel.children[selectedIdx]?.firstElementChild
    if (firstElementChild instanceof HTMLVideoElement) {
      firstElementChild.pause();
      firstElementChild.currentTime = 0;
    }

    carouselNav.children[selectedIdx].classList.remove(carouselNavActiveClassName);
    carousel.style.transform = `translateX(${position * -100}%)`;
    //carousel.style.left = ((position) * -100) + '%';
    carouselNav.children[position].classList.add(carouselNavActiveClassName);
    selectedIdx = position;

    if (carousel.children[position].firstElementChild instanceof HTMLVideoElement) {
      carousel.children[position].firstElementChild.play();
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
  const media = carouselItem.firstElementChild;
  const itemIdx = idx;

  carouselNav.children[itemIdx].addEventListener('click', (event) => {
    if (selectedIdx === itemIdx) {
      return;
    }
    
    handleCarouselChange(event, itemIdx);
  });

  if (media instanceof HTMLVideoElement) {  

    if (carouselItem === carousel.firstElementChild) {
      media.play();
    }

    const handler = itemIdx < carousel.children.length - 1 ?
      (event) => handleNextItem(event, itemIdx):
      (event) => handleGoToStart(event);
    
    media.addEventListener('ended', (event) => {
      handler(event);
    },false);
  } else if (media instanceof HTMLPictureElement && carouselItem === carousel.firstElementChild) {
    scheduleImage(idx, carouselItem);
  }
  idx++;
}