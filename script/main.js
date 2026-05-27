const toggleActive = () => {
  const isHover = window.matchMedia("(hover: hover)").matches;

  const dropDowns = document.querySelectorAll(".dropdown, .main-link");
  dropDowns.forEach((btn) => {
    if (isHover) {
      btn.addEventListener("mouseenter", () => {
        btn.classList.add("active");
      });

      btn.addEventListener("mouseleave", () => {
        btn.classList.remove("active");
      });
    } else {
      btn.addEventListener("click", () => {
        btn.classList.toggle("active");
      });
    }
  });

  if (window.innerWidth < 1024) {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".dropdown")) {
        dropDowns.forEach((btn) => {
          if (btn.classList.contains("active")) {
            btn.classList.remove("active");
          }
        });
      }
    });
  }
};

const initVideoBlur = (videoSelector, canvasSelector, wrapperSelector) => {
  const video = document.querySelector(videoSelector);
  const canvas = document.querySelector(canvasSelector);
  const wrapper = document.querySelector(wrapperSelector);
  if (!video || !canvas || !wrapper) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const updateCanvasSize = () => {
    const width = wrapper.offsetWidth;
    const height = wrapper.offsetHeight;

    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    updateCanvasSize();
  });

  resizeObserver.observe(wrapper);
  updateCanvasSize();

  function update() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(update);
  }

  video.addEventListener("play", () => {
    update();
  });
};

/**
 * @param {Element | null} root
 * @param {{ list: string; item: string; track?: string; btnBack: string; btnFwd: string }} selectors — относительно root
 */
const initHorizontalSlider = (root, selectors) => {
  if (!root) return;

  const list = root.querySelector(selectors.list);
  const track =
    (selectors.track && root.querySelector(selectors.track)) ||
    list?.parentElement;
  const btnBack = root.querySelector(selectors.btnBack);
  const btnFwd = root.querySelector(selectors.btnFwd);
  const wrapper = document.querySelector("body > .wrapper");
  console.log(wrapper);

  if (!track || !list || !btnBack || !btnFwd) return;

  let currentIndex = 0;
  const scrollEndEpsilon = 2;

  function getZoom() {
    return parseFloat(getComputedStyle(wrapper).zoom) || 1;
  }

  function getSlideWidth() {
    const items = list.querySelectorAll(selectors.item);
    if (!items.length) return 0;
    const item = items[0];
    const zoom = getZoom();
    const marginRight =
      parseFloat(window.getComputedStyle(item).marginRight) || 0;
    return item.getBoundingClientRect().width / zoom + marginRight;
  }

  function getMaxOffset() {
    const items = list.querySelectorAll(selectors.item);
    const lastItem = items[items.length - 1];
    const lastMarginRight = lastItem
      ? parseFloat(window.getComputedStyle(lastItem).marginRight) || 0
      : 0;
    return Math.max(0, list.scrollWidth + lastMarginRight - track.clientWidth);
  }

  function getMaxIndex() {
    const slideWidth = getSlideWidth();
    if (!slideWidth) return 0;
    return Math.max(0, Math.ceil(getMaxOffset() / slideWidth));
  }

  function updateSlider() {
    const slideWidth = getSlideWidth();
    const maxOffset = getMaxOffset();
    let offset = Math.min(currentIndex * slideWidth, maxOffset);
    if (maxOffset > 0 && maxOffset - offset <= scrollEndEpsilon) {
      offset = maxOffset;
    }
    list.style.transform = `translateX(-${offset}px)`;
    list.style.transition = "transform 0.4s ease";

    btnBack.disabled = currentIndex === 0;
    btnFwd.disabled =
      maxOffset <= scrollEndEpsilon || offset >= maxOffset - scrollEndEpsilon;
  }

  btnFwd.addEventListener("click", () => {
    const slideWidth = getSlideWidth();
    const maxOffset = getMaxOffset();
    const offset = Math.min(currentIndex * slideWidth, maxOffset);
    if (maxOffset > 0 && offset >= maxOffset - scrollEndEpsilon) return;
    if (currentIndex < getMaxIndex()) {
      currentIndex++;
      updateSlider();
    }
  });

  btnBack.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateSlider();
    }
  });

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  track.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = false;
    },
    { passive: true },
  );

  track.addEventListener(
    "touchmove",
    (e) => {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (!isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
        isSwiping = true;
      }
      if (isSwiping) e.preventDefault();
    },
    { passive: false },
  );

  track.addEventListener(
    "touchend",
    (e) => {
      if (!isSwiping) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const threshold = 50;
      if (dx < -threshold) {
        if (currentIndex < getMaxIndex()) {
          currentIndex++;
          updateSlider();
        }
      } else if (dx > threshold) {
        if (currentIndex > 0) {
          currentIndex--;
          updateSlider();
        }
      }
      isSwiping = false;
    },
    { passive: true },
  );

  let wheelTimeout = null;
  let wheelAccum = 0;

  track.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;

      e.preventDefault();

      wheelAccum += e.deltaX;

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        wheelAccum = 0;
      }, 300);

      if (wheelAccum > 300) {
        wheelAccum = 0;
        if (currentIndex < getMaxIndex()) {
          currentIndex++;
          updateSlider();
        }
      } else if (wheelAccum < -300) {
        wheelAccum = 0;
        if (currentIndex > 0) {
          currentIndex--;
          updateSlider();
        }
      }
    },
    { passive: false },
  );

  window.addEventListener("resize", () => {
    currentIndex = Math.min(currentIndex, getMaxIndex());
    updateSlider();
  });

  updateSlider();
};

const initFaqAccordion = () => {
  const opts = { duration: 300, easing: "ease" };

  document.querySelectorAll(".faq-list .faq-item-title").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      if (!item) return;
      const content = item.querySelector(".faq-item-content");
      if (!content) return;

      const contentH = content.scrollHeight;

      if (item.classList.contains("open")) {
        item.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        content.animate(
          [{ height: contentH + "px" }, { height: "0px" }],
          opts,
        ).onfinish = () => {
          content.style.height = "0";
        };
      } else {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        content.animate(
          [{ height: "0px" }, { height: contentH + "px" }],
          opts,
        ).onfinish = () => {
          content.style.height = "auto";
        };
      }
    });
  });
};

const toggleDisabled = (checkboxID, buttonID) => {
  const checkbox = document.getElementById(checkboxID);
  const button = document.getElementById(buttonID);

  if (!checkbox || !button) return;
  checkbox.addEventListener("change", () => {
    button.disabled = !checkbox.checked;
    button.classList.toggle("btn", checkbox.checked);
  });
};

const initHeaderBurger = () => {
  const burgerBtn = document.querySelector(".header-burger-btn");
  const menu = document.querySelector("#menu");
  const overlay = document.querySelector(".overlay");
  burgerBtn.addEventListener("click", () => {
    burgerBtn.classList.toggle("active");
    menu.classList.toggle("active");
    overlay.classList.toggle("active");
    document.documentElement.classList.toggle("noscroll");
  });
};

const getHeaderHeight = () => {
  const header = document.querySelector(".header");
  const main = document.querySelector(".main");

  if (!header || !main) return;

  if (window.innerWidth < 1024) {
    const headerHeight = header.offsetHeight;
    main.style.marginTop = `${headerHeight}px`;
  } else {
    main.style.marginTop = "0";
  }
};

const initModal = () => {
  const modalOpenBtns = document.querySelectorAll(".modal-open-btn");
  const modalCloseBtns = document.querySelectorAll(".modal-close-btn");
  const modal = document.querySelector(".modal");

  modalOpenBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.classList.add("active");
      document.documentElement.classList.add("noscroll");
    });
  });
  modalCloseBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.classList.remove("active");
      document.documentElement.classList.remove("noscroll");
    });
  });
  modal.addEventListener("click", (e) => {
    if (e.target.closest(".modal-content")) return;
    modal.classList.remove("active");
    document.documentElement.classList.remove("noscroll");
  });
};

const initStickyHeaderBottom = () => {
  const headerTop = document.querySelector(".header-top");
  const headerBottom = document.querySelector(".header-bottom");
  if (!headerTop || !headerBottom) return;

  const spacer = document.createElement("div");
  spacer.style.display = "none";
  headerBottom.insertAdjacentElement("afterend", spacer);

  let isSticky = false;

  function update() {
    if (window.innerWidth <= 1024) {
      if (isSticky) {
        headerBottom.classList.remove("sticky");
        spacer.style.display = "none";
        isSticky = false;
      }
      return;
    }

    const shouldBeSticky = headerTop.getBoundingClientRect().bottom <= 0;

    if (shouldBeSticky && !isSticky) {
      spacer.style.height = headerBottom.offsetHeight + "px";
      spacer.style.display = "block";
      headerBottom.classList.add("sticky");
      isSticky = true;
    } else if (!shouldBeSticky && isSticky) {
      headerBottom.classList.remove("sticky");
      spacer.style.display = "none";
      isSticky = false;
    }
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
};

document.addEventListener("DOMContentLoaded", () => {
  toggleActive();
  initVideoBlur(
    ".hero-video.desktop",
    ".hero-video-canvas.desktop",
    ".hero-video-wrapper.desktop",
  );
  initVideoBlur(
    ".hero-video.mobile",
    ".hero-video-canvas.mobile",
    ".hero-video-wrapper.mobile",
  );
  initFaqAccordion();

  initHorizontalSlider(document.querySelector(".about-team-slider-wrapper"), {
    list: ".about-team-slider-list",
    item: ".about-team-slider-item",
    track: ".about-team-slider",
    btnBack: ".about-team-slider-btn.backward",
    btnFwd: ".about-team-slider-btn.forward",
  });

  initHorizontalSlider(document.querySelector(".about-certificates-content"), {
    list: ".about-certificates-slider-list",
    item: ".about-certificates-slider-item",
    track: ".about-certificates-slider",
    btnBack: ".about-certificates-slider-btn.backward",
    btnFwd: ".about-certificates-slider-btn.forward",
  });

  initHorizontalSlider(document.querySelector(".articles-wrapper"), {
    list: ".articles-slider-list",
    item: ".articles-slider-item",
    track: ".articles-slider",
    btnBack: ".articles-slider-btn.backward",
    btnFwd: ".articles-slider-btn.forward",
  });

  initHeaderBurger();
  getHeaderHeight();
  initModal();
  initStickyHeaderBottom();
  toggleDisabled("consult-checkbox", "consult-submit");
  toggleDisabled("modal-checkbox", "modal-submit");
});

window.addEventListener("resize", () => {
  getHeaderHeight();
});
