const toggleActive = () => {
  const isHover = window.matchMedia("(any-hover: hover)").matches;

  const dropDowns = document.querySelectorAll(".dropdown");
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

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) {
      dropDowns.forEach((btn) => {
        if (btn.classList.contains("active")) {
          btn.classList.remove("active");
        }
      });
    }
  });
};

/**
 * @param {Element | null} root
 * @param {{ list: string; track?: string; btnBack: string; btnFwd: string }} selectors — относительно root
 */
const initHorizontalSlider = (root, selectors) => {
  if (!root) return;

  const list = root.querySelector(selectors.list);
  const track =
    (selectors.track && root.querySelector(selectors.track)) ||
    list?.parentElement;
  const btnBack = root.querySelector(selectors.btnBack);
  const btnFwd = root.querySelector(selectors.btnFwd);

  if (!track || !list || !btnBack || !btnFwd) return;

  let currentIndex = 0;
  const scrollEndEpsilon = 2;

  function getSlideWidth() {
    const items = list.querySelectorAll("li");
    if (!items.length) return 0;
    if (items.length === 1) return items[0].getBoundingClientRect().width;
    return (
      items[1].getBoundingClientRect().left -
      items[0].getBoundingClientRect().left
    );
  }

  function getMaxIndex() {
    const slideWidth = getSlideWidth();
    if (!slideWidth) return 0;
    const maxOffset = Math.max(0, list.scrollWidth - track.clientWidth);
    return Math.max(0, Math.ceil(maxOffset / slideWidth));
  }

  function updateSlider() {
    const slideWidth = getSlideWidth();
    const maxOffset = Math.max(0, list.scrollWidth - track.clientWidth);
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
    const maxOffset = Math.max(0, list.scrollWidth - track.clientWidth);
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

  window.addEventListener("resize", () => {
    currentIndex = Math.min(currentIndex, getMaxIndex());
    updateSlider();
  });

  updateSlider();
};

const initFaqAccordion = () => {
  document.querySelectorAll(".faq-list .faq-item-title").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      if (!item) return;
      const open = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
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
  });
};

const getHeaderHeight = () => {
  if (window.innerWidth < 1024) {
    const header = document.querySelector(".header");
    const main = document.querySelector(".main");
    const headerHeight = header.offsetHeight;
    main.style.marginTop = `${headerHeight}px`;
  }
};

const initModal = () => {
  const modalOpenBtns = document.querySelectorAll(".modal-open-btn");
  const modalCloseBtns = document.querySelectorAll(".modal-close-btn");
  const modal = document.querySelector(".modal");

  modalOpenBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.classList.add("active");
    });
  });
  modalCloseBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.classList.remove("active");
    });
  });
  modal.addEventListener("click", (e) => {
    if (e.target.closest(".modal-content")) return;
    modal.classList.remove("active");
  });
};

document.addEventListener("DOMContentLoaded", () => {
  toggleActive();
  initFaqAccordion();

  initHorizontalSlider(document.querySelector(".about-team-slider-wrapper"), {
    list: ".about-team-slider-list",
    track: ".about-team-slider",
    btnBack: ".about-team-slider-btn.backward",
    btnFwd: ".about-team-slider-btn.forward",
  });

  initHorizontalSlider(document.querySelector(".about-certificates-content"), {
    list: ".about-certificates-slider-list",
    track: ".about-certificates-slider",
    btnBack: ".about-certificates-slider-btn.backward",
    btnFwd: ".about-certificates-slider-btn.forward",
  });

  initHorizontalSlider(document.querySelector(".articles-wrapper"), {
    list: ".articles-slider-list",
    track: ".articles-slider",
    btnBack: ".articles-slider-btn.backward",
    btnFwd: ".articles-slider-btn.forward",
  });

  initHeaderBurger();
  getHeaderHeight();
  initModal();
});

window.addEventListener("resize", () => {
  getHeaderHeight();
});
