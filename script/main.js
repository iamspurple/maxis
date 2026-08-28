const toggleActive = () => {
  const isHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;

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

  if (window.innerWidth < 849) {
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

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (reducedMotion) {
    video.removeAttribute("autoplay");
    video.pause();
  }

  const source = video.querySelector("source");

  let gestureHooked = false;
  const gestureEvents = ["pointerdown", "touchstart", "keydown", "scroll"];
  const hookGesture = () => {
    if (gestureHooked) return;
    gestureHooked = true;
    const retry = () => {
      gestureEvents.forEach((ev) => window.removeEventListener(ev, retry));
      gestureHooked = false;
      ensurePlay();
    };
    gestureEvents.forEach((ev) =>
      window.addEventListener(ev, retry, { passive: true }),
    );
  };

  const ensurePlay = () => {
    if (reducedMotion) return;
    if (video.offsetParent === null) return;

    if (source && !source.getAttribute("src") && source.dataset.src) {
      source.setAttribute("src", source.dataset.src);
      video.load();
    }

    if (video.paused) {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => hookGesture());
    }
  };

  video.addEventListener("loadeddata", ensurePlay);
  video.addEventListener("canplay", ensurePlay);

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

  let rafId = null;
  let onScreen = true;

  const draw = () => {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    rafId = requestAnimationFrame(draw);
  };

  const startLoop = () => {
    if (
      rafId === null &&
      !video.paused &&
      !video.ended &&
      onScreen &&
      !document.hidden
    ) {
      rafId = requestAnimationFrame(draw);
    }
  };

  const stopLoop = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  video.addEventListener("play", startLoop);
  video.addEventListener("pause", stopLoop);
  video.addEventListener("ended", stopLoop);

  const visObserver = new IntersectionObserver(
    (entries) => {
      onScreen = entries[0].isIntersecting;
      if (onScreen) {
        ensurePlay();
        startLoop();
      } else {
        stopLoop();
        video.pause();
      }
    },
    { threshold: 0 },
  );
  visObserver.observe(wrapper);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLoop();
    } else {
      ensurePlay();
      startLoop();
    }
  });

  let resizeTid = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTid);
    resizeTid = setTimeout(() => {
      if (video.offsetParent === null) {
        stopLoop();
        video.pause();
      } else {
        ensurePlay();
        startLoop();
      }
    }, 200);
  });

  ensurePlay();
  startLoop();
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

  if (!track || !list || !btnBack || !btnFwd) return;

  let currentIndex = 0;
  const scrollEndEpsilon = 2;

  function getSlideWidth() {
    const items = list.querySelectorAll(selectors.item);
    if (!items.length) return 0;
    const item = items[0];
    const marginRight =
      parseFloat(window.getComputedStyle(item).marginRight) || 0;
    return item.getBoundingClientRect().width + marginRight;
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

const initEstimateAccordion = () => {
  const opts = { duration: 300, easing: "ease" };

  document
    .querySelectorAll(".estimate-list .estimate-group-title")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.closest(".estimate-group");
        if (!group) return;
        const body = group.querySelector(".estimate-group-body");
        if (!body) return;

        const bodyH = body.scrollHeight;

        if (group.classList.contains("is-open")) {
          group.classList.remove("is-open");
          btn.setAttribute("aria-expanded", "false");
          body.animate(
            [{ height: bodyH + "px" }, { height: "0px" }],
            opts,
          ).onfinish = () => {
            body.style.height = "0";
          };
        } else {
          group.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
          body.animate(
            [{ height: "0px" }, { height: bodyH + "px" }],
            opts,
          ).onfinish = () => {
            body.style.height = "auto";
          };
        }
      });
    });
};

const initCookie = () => {
  const cookie = document.querySelector(".cookie");
  if (!cookie) return;

  const opts = { duration: 300, easing: "ease" };

  // switch between compact and manage views
  cookie.querySelectorAll("[data-cookie-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cookie.classList.toggle("is-manage", btn.dataset.cookieView === "manage");
    });
  });

  // accept / decline -> just hide the window (no persistence yet)
  cookie.querySelectorAll("[data-cookie-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cookie.classList.add("is-hidden");
    });
  });

  // category accordions (only one open at a time)
  const items = cookie.querySelectorAll(".cookie-item");

  const close = (item) => {
    const body = item.querySelector(".cookie-item-body");
    const btn = item.querySelector(".cookie-item-toggle");
    if (!body) return;
    const h = body.scrollHeight;
    item.classList.remove("open");
    if (btn) btn.setAttribute("aria-expanded", "false");
    body.animate([{ height: h + "px" }, { height: "0px" }], opts).onfinish =
      () => {
        body.style.height = "0";
      };
  };

  items.forEach((item) => {
    const btn = item.querySelector(".cookie-item-toggle");
    const body = item.querySelector(".cookie-item-body");
    if (!btn || !body) return;

    btn.addEventListener("click", () => {
      if (item.classList.contains("open")) {
        close(item);
        return;
      }

      items.forEach((other) => {
        if (other !== item && other.classList.contains("open")) close(other);
      });

      item.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      const h = body.scrollHeight;
      body.animate([{ height: "0px" }, { height: h + "px" }], opts).onfinish =
        () => {
          body.style.height = "auto";
        };
    });
  });
};

// prefix — "case" (страница кейса) или "post" (страница статьи). Разметка и
// поведение сайдбара идентичны, отличаются только имена классов.
const initSidebarContent = (prefix = "case") => {
  const opts = { duration: 300, easing: "ease" };

  // .case-sidebar/.post-sidebar залипает на top: 100px (десктоп). Считаем, сколько
  // высоты остаётся под списком до низа вьюпорта: если содержание влезает —
  // показываем все пункты, если нет — ограничиваем и даём списку скроллиться.
  const STICKY_TOP = 100;
  const BOTTOM_GAP = 24;
  const MIN_LIST_H = 120;
  const isDesktop = () => window.matchMedia("(min-width: 851px)").matches;

  document.querySelectorAll(`.${prefix}-sidebar-content-btn`).forEach((btn) => {
    const content = btn.closest(`.${prefix}-sidebar-content`);
    if (!content) return;
    const list = content.querySelector(`.${prefix}-sidebar-content-list`);
    if (!list) return;
    const sidebar = content.closest(`.${prefix}-sidebar`);

    const updateMaxHeight = () => {
      if (!sidebar || !isDesktop() || !content.classList.contains("open")) {
        list.style.maxHeight = "";
        return;
      }
      // смещение списка от верха sidebar не зависит от прокрутки страницы
      const offsetInSidebar =
        list.getBoundingClientRect().top - sidebar.getBoundingClientRect().top;
      const available =
        window.innerHeight - STICKY_TOP - offsetInSidebar - BOTTOM_GAP;
      list.style.maxHeight = Math.max(MIN_LIST_H, available) + "px";
    };

    btn.addEventListener("click", () => {
      const listH = list.scrollHeight;

      if (content.classList.contains("open")) {
        content.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        list.animate(
          [{ height: listH + "px" }, { height: "0px" }],
          opts,
        ).onfinish = () => {
          list.style.height = "0";
          list.style.maxHeight = "";
        };
      } else {
        content.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        updateMaxHeight();
        list.animate(
          [{ height: "0px" }, { height: listH + "px" }],
          opts,
        ).onfinish = () => {
          list.style.height = "auto";
          updateMaxHeight();
        };
      }
    });

    updateMaxHeight();
    window.addEventListener("resize", updateMaxHeight);
  });
};

const initHeaderBurger = () => {
  const burgerBtn = document.querySelector(".header-burger-btn");
  const menu = document.querySelector("#menu");
  const overlay = document.querySelector(".overlay");
  if (!burgerBtn || !menu || !overlay) return;

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

  if (window.innerWidth <= 849) {
    const headerHeight = header.offsetHeight;
    main.style.marginTop = `${headerHeight}px`;
  } else {
    main.style.marginTop = "0";
  }
};

/** Видимые фокусируемые элементы внутри контейнера. */
const getFocusable = (container) =>
  [
    ...container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => el.offsetParent !== null);

/** Удерживает Tab-фокус внутри контейнера. Вызывать из обработчика keydown. */
const trapTab = (container, e) => {
  if (e.key !== "Tab") return;
  const focusable = getFocusable(container);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
};

let modalLastFocused = null;

const initModal = () => {
  const modal = document.querySelector(".modal");
  const menu = document.getElementById("menu");
  const overlay = document.querySelector(".overlay");
  if (!modal || !menu || !overlay) return;

  const modalOpenBtns = document.querySelectorAll(".modal-open-btn");
  const modalCloseBtn = document.querySelector(".modal-close-btn");
  const burgerBtn = document.querySelector(".header-burger-btn");

  const closeMenu = () => {
    menu.classList.remove("active");
    overlay.classList.remove("active");
    burgerBtn?.classList.remove("active");
  };

  const openModal = (e) => {
    // запоминаем триггер, чтобы вернуть на него фокус после закрытия
    modalLastFocused = e?.currentTarget || document.activeElement;
    modal.classList.add("active");
    document.documentElement.classList.add("noscroll");
    closeMenu();
    const target =
      modal.querySelector(".modal-form input, .modal-form textarea") ||
      getFocusable(modal)[0] ||
      modal;
    target.focus();
  };

  modalOpenBtns.forEach((btn) => {
    btn.addEventListener("click", openModal);
  });

  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target.closest(".modal-form-wrapper")) return;
    closeModal();
  });

  // Escape закрывает, Tab не выпускает фокус за пределы окна
  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("active")) return;
    if (e.key === "Escape") {
      closeModal();
    } else if (e.key === "Tab") {
      const focusable = getFocusable(modal);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
};

const closeModal = () => {
  const modal = document.querySelector(".modal");
  if (!modal) return;
  modal.classList.remove("active");
  document.documentElement.classList.remove("noscroll");
  if (modalLastFocused) {
    modalLastFocused.focus();
    modalLastFocused = null;
  }
};

let successLastFocused = null;

const showSuccess = () => {
  const success = document.querySelector(".success");
  if (!success) return;
  // запоминаем триггер, чтобы вернуть на него фокус после закрытия
  successLastFocused = document.activeElement;
  success.classList.add("active");
  document.documentElement.classList.add("noscroll");
  const target = getFocusable(success)[0] || success;
  target.focus();
};

const closeSuccess = () => {
  const success = document.querySelector(".success");
  if (!success) return;
  success.classList.remove("active");
  document.documentElement.classList.remove("noscroll");
  if (successLastFocused) {
    successLastFocused.focus();
    successLastFocused = null;
  }
};

const initSuccess = () => {
  const success = document.querySelector(".success");
  if (!success) return;

  const closeBtn = document.getElementById("success-close-btn");
  closeBtn?.addEventListener("click", closeSuccess);

  // закрытие по клику на внешнюю часть (мимо карточки)
  success.addEventListener("click", (e) => {
    if (e.target.closest(".success-content")) return;
    closeSuccess();
  });

  // Escape закрывает, Tab не выпускает фокус за пределы окна
  document.addEventListener("keydown", (e) => {
    if (!success.classList.contains("active")) return;
    if (e.key === "Escape") {
      closeSuccess();
    } else {
      trapTab(success, e);
    }
  });
};

const initFiltersModal = () => {
  const filtersModal = document.querySelector(".filters-modal");
  const openBtn = document.getElementById("open-filters");
  const closeBtn = document.getElementById("close-filters");
  const resetBtn = document.getElementById("reset-filters");
  if (!filtersModal || !openBtn || !closeBtn) return;

  const applyBtn = filtersModal.querySelector(".filters-modal-submit");
  let filtersLastFocused = null;

  filtersModal
    .querySelectorAll(".dropdown-content label, .dropdown-content input")
    .forEach((el) => {
      el.addEventListener("click", (e) => e.stopPropagation());
    });

  const open = () => {
    // запоминаем триггер, чтобы вернуть на него фокус после закрытия
    filtersLastFocused = document.activeElement;
    filtersModal.classList.add("active");
    document.documentElement.classList.add("noscroll");
    const target = getFocusable(filtersModal)[0] || filtersModal;
    target.focus();
  };

  const close = () => {
    filtersModal.classList.remove("active");
    document.documentElement.classList.remove("noscroll");
    if (filtersLastFocused) {
      filtersLastFocused.focus();
      filtersLastFocused = null;
    }
  };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  applyBtn?.addEventListener("click", close);
  resetBtn?.addEventListener("click", close);

  // Escape закрывает, Tab не выпускает фокус за пределы окна
  document.addEventListener("keydown", (e) => {
    if (!filtersModal.classList.contains("active")) return;
    if (e.key === "Escape") {
      close();
    } else {
      trapTab(filtersModal, e);
    }
  });
};

const initCatalogFilterGroups = () => {
  document
    .querySelectorAll(".catalog-filter-group-header")
    .forEach((header) => {
      header.addEventListener("click", () => {
        const expanded = header.getAttribute("aria-expanded") === "true";
        header.setAttribute("aria-expanded", String(!expanded));
      });
    });
};

const initSortDisclosure = () => {
  document.querySelectorAll("[data-sort-disclosure]").forEach((dd) => {
    const btn = dd.querySelector("[data-sort-toggle]");
    const group = dd.querySelector("[data-sort-group]");
    if (!btn || !group) return;
    const radios = [...group.querySelectorAll('input[type="radio"]')];
    const labelEl = btn.querySelector("[data-sort-label]");

    const isOpen = () => dd.classList.contains("active");
    const sync = () => btn.setAttribute("aria-expanded", String(isOpen()));
    new MutationObserver(sync).observe(dd, {
      attributes: true,
      attributeFilter: ["class"],
    });
    sync();

    const open = () => {
      dd.classList.add("active");
      (radios.find((r) => r.checked) || radios[0])?.focus();
    };
    const close = (focusBtn) => {
      dd.classList.remove("active");
      if (focusBtn) btn.focus();
    };

    btn.addEventListener("keydown", (e) => {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        isOpen() ? close(false) : open();
      } else if (e.key === "Escape") {
        close(true);
      }
    });

    dd.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close(true);
    });
    dd.addEventListener("focusout", (e) => {
      if (!dd.contains(e.relatedTarget)) close(false);
    });

    radios.forEach((r) =>
      r.addEventListener("change", () => {
        if (!labelEl) return;
        const text = group
          .querySelector("input:checked")
          ?.closest("label")
          ?.querySelector(".filter-checkbox-label")
          ?.textContent.trim();
        if (text) labelEl.textContent = text;
      }),
    );
  });
};

const initSortListbox = (prefix) => {
  const dd = document.querySelector(`.${prefix}-sort.dropdown`);
  if (!dd) return;
  const btn = dd.querySelector(`.${prefix}-sort-btn`);
  const valueEl = dd.querySelector(`.${prefix}-sort-value`);
  const input = dd.querySelector(`.${prefix}-sort-input`);
  const options = [...dd.querySelectorAll(`.${prefix}-sort-option`)];
  if (!btn || !options.length) return;

  const isOpen = () => dd.classList.contains("active");
  const sync = () => btn.setAttribute("aria-expanded", String(isOpen()));
  new MutationObserver(sync).observe(dd, {
    attributes: true,
    attributeFilter: ["class"],
  });
  sync();

  const open = () => {
    dd.classList.add("active");
    (
      options.find((o) => o.getAttribute("aria-selected") === "true") ||
      options[0]
    ).focus();
  };
  const close = (focusBtn) => {
    dd.classList.remove("active");
    if (focusBtn) btn.focus();
  };

  const select = (opt) => {
    options.forEach((o) => {
      const on = o === opt;
      o.setAttribute("aria-selected", String(on));
      o.classList.toggle("is-active", on);
    });
    if (valueEl) valueEl.textContent = opt.textContent.trim();
    if (input) input.value = opt.dataset.value || "";
  };

  btn.addEventListener("keydown", (e) => {
    if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      isOpen() ? close(false) : open();
    } else if (e.key === "Escape") {
      close(true);
    }
  });

  options.forEach((opt, i) => {
    opt.addEventListener("click", (e) => {
      // не даём клику всплыть к общему обработчику .dropdown (иначе он снова
      // переключит .active и список «мигнёт»)
      e.stopPropagation();
      select(opt);
      close(true);
    });
    opt.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        options[(i + 1) % options.length].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        options[(i - 1 + options.length) % options.length].focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        options[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        options[options.length - 1].focus();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(opt);
        close(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    });
  });

  dd.addEventListener("focusout", (e) => {
    if (!dd.contains(e.relatedTarget)) close(false);
  });
};

const initStickyHeaderBottom = () => {
  const header = document.querySelector(".header");
  const headerTop = document.querySelector(".header-top");
  const headerBottom = document.querySelector(".header-bottom");
  if (!header || !headerTop || !headerBottom) return;

  const mq = window.matchMedia("(min-width: 850px)");

  let isSticky = false;
  let triggerY = 0;
  let ticking = false;

  function measure() {
    triggerY = headerTop.getBoundingClientRect().bottom + window.scrollY;
  }

  function setSticky(sticky) {
    if (sticky === isSticky) return;
    isSticky = sticky;
    if (sticky) {
      header.style.paddingBottom = headerBottom.offsetHeight - 4 + "px";
      headerBottom.classList.add("sticky");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isSticky) headerBottom.classList.add("compact");
        });
      });
    } else {
      headerBottom.style.transition = "none";
      headerBottom.classList.remove("sticky", "compact");
      header.style.paddingBottom = "";
      requestAnimationFrame(() => {
        headerBottom.style.transition = "";
      });
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (!mq.matches) return;
      setSticky(window.scrollY >= triggerY);
    });
  }

  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    measure();
    onScroll();
  });
  mq.addEventListener("change", (e) => {
    if (!e.matches) setSticky(false);
    else onScroll();
  });
};

class Progress {
  constructor(
    currentStep = 1,
    totalStep = document.querySelectorAll(".process-steps-item").length || 1,
    progressElement = document.querySelector(".process-slider-progress"),
    progressCurrentStepElement = document.querySelector(".current-step"),
    totalStepElement = document.querySelector(".total-step"),
  ) {
    if (!progressElement || !progressCurrentStepElement || !totalStepElement) {
      this.valid = false;
      return;
    }
    this.valid = true;
    this.currentStep = currentStep;
    this.totalStep = totalStep;
    this.progressElement = progressElement;
    this.progressCurrentStepElement = progressCurrentStepElement;
    this.totalStepElement = totalStepElement;
    this.progressElement.style.setProperty(
      "--percent",
      (this.currentStep / this.totalStep) * 100 + "%",
    );
    this.progressCurrentStepElement.textContent = this.currentStep;
    this.totalStepElement.textContent = this.totalStep;
  }

  onNewStep(newStep) {
    if (!this.valid) return;
    this.progressCurrentStepElement.textContent = newStep;
    this.progressElement.style.setProperty(
      "--percent",
      (newStep / this.totalStep) * 100 + "%",
    );
  }
}

const FIELD_WRAPPERS =
  ".modal-form-input-wrapper, .modal-form-checkbox-wrapper, .consult-form-input-wrapper, .consult-form-checkbox-wrapper";

const setFieldError = (input, message) => {
  const wrapper = input.closest(FIELD_WRAPPERS) || input.parentElement;
  if (!wrapper) return;
  let err = wrapper.querySelector(".field-error");
  const errId = input.id ? `${input.id}-error` : "";
  if (message) {
    if (!err) {
      err = document.createElement("span");
      err.className = "field-error";
      err.setAttribute("role", "alert");
      if (errId) {
        err.id = errId;
        const db = input.getAttribute("aria-describedby");
        input.setAttribute("aria-describedby", db ? `${db} ${errId}` : errId);
      }
      wrapper.appendChild(err);
    }
    err.textContent = message;
  } else if (err) {
    err.remove();
    if (errId) {
      const rest = (input.getAttribute("aria-describedby") || "")
        .split(" ")
        .filter((id) => id && id !== errId)
        .join(" ");
      rest
        ? input.setAttribute("aria-describedby", rest)
        : input.removeAttribute("aria-describedby");
    }
  }
};

const validateForm = ({ nameSelector, phoneSelector, checkboxSelector }) => {
  const nameInput = document.querySelector(nameSelector);
  const phoneInput = document.querySelector(phoneSelector);
  const checkbox = document.querySelector(checkboxSelector);

  let isValid = true;

  const validate = (input, condition, message) => {
    const invalid = Boolean(condition);
    input.classList.toggle("error", invalid);
    input.setAttribute("aria-invalid", invalid ? "true" : "false");
    setFieldError(input, invalid ? message : "");
    if (invalid) isValid = false;
  };

  if (nameInput) {
    validate(nameInput, !nameInput.value.trim(), "Введите ваше имя");
  }

  if (phoneInput) {
    const digits = phoneInput.value.replace(/\D/g, "");
    validate(
      phoneInput,
      digits.length < 10,
      "Введите номер телефона — минимум 10 цифр",
    );
  }

  if (checkbox) {
    validate(
      checkbox,
      !checkbox.checked,
      "Отметьте согласие, чтобы продолжить",
    );
  }

  return isValid;
};

const clearErrorOnInput = (selectors) => {
  selectors.forEach((selector) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const clear = () => {
      el.classList.remove("error");
      el.setAttribute("aria-invalid", "false");
      setFieldError(el, "");
    };
    el.addEventListener("input", clear);
    el.addEventListener("change", clear);
  });
};

const clearForm = (selectors) => {
  selectors.forEach((selector) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.value = "";
    el.checked = false;
  });
};

const initFileBtns = () => {
  const modalFileBtn = document.getElementById("modal-file-btn");
  const modalFileInput = document.getElementById("modal-file");

  const consultFileBtn = document.getElementById("consult-file-btn");
  const consultFileInput = document.getElementById("consult-file");

  if (modalFileBtn && modalFileInput) {
    modalFileBtn.addEventListener("click", () => {
      modalFileInput.click();
    });
  }

  if (consultFileBtn && consultFileInput) {
    consultFileBtn.addEventListener("click", () => {
      consultFileInput.click();
    });
  }
};

const initFormValidation = () => {
  const consultForm = document.querySelector(".consult-form");
  const modalForm = document.querySelector(".modal-form");

  if (consultForm) {
    clearErrorOnInput([
      "#consult-form-name",
      "#consult-form-phone",
      "#consult-checkbox",
    ]);

    consultForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const isValid = validateForm({
        nameSelector: "#consult-form-name",
        phoneSelector: "#consult-form-phone",
        checkboxSelector: "#consult-checkbox",
      });

      if (!isValid) return;
      clearForm([
        "#consult-form-name",
        "#consult-form-phone",
        "#consult-checkbox",
      ]);
      showSuccess();
    });
  }

  if (modalForm) {
    clearErrorOnInput([
      "#modal-form-name",
      "#modal-form-phone",
      "#modal-checkbox",
    ]);

    modalForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const isValid = validateForm({
        nameSelector: "#modal-form-name",
        phoneSelector: "#modal-form-phone",
        checkboxSelector: "#modal-checkbox",
      });

      if (!isValid) return;
      clearForm(["#modal-form-name", "#modal-form-phone", "#modal-checkbox"]);
      showSuccess();
      modalForm.closest(".modal")?.classList.remove("active");
    });
  }
};

const initStepper = () => {
  const buttons = document.querySelectorAll(".process-steps-btn");
  const contents = document.querySelectorAll(".process-steps-item");
  const container = document.querySelector(".process-steps-list");

  if (!buttons.length || !container) return;

  let currentIndex = 0;
  let autoInterval = null;
  let pauseTimeout = null;

  const setStep = (index) => {
    currentIndex = index;
    buttons.forEach((btn) => btn.classList.remove("active"));
    contents.forEach((content) => content.classList.remove("active"));
    buttons[currentIndex].classList.add("active");
    if (contents[currentIndex]) contents[currentIndex].classList.add("active");
  };

  const nextStep = () => {
    setStep((currentIndex + 1) % buttons.length);
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  const startAuto = () => {
    if (autoInterval || prefersReducedMotion.matches) return;
    autoInterval = setInterval(nextStep, 3000);
  };

  const stopAuto = () => {
    clearInterval(autoInterval);
    autoInterval = null;
  };

  const pauseAuto = () => {
    stopAuto();
    clearTimeout(pauseTimeout);
    pauseTimeout = setTimeout(startAuto, 5000);
  };

  setStep(0);

  container.addEventListener("click", (e) => {
    const button = e.target.closest(".process-steps-btn");
    if (!button) return;

    const stepIndex = Array.from(buttons).indexOf(button);
    if (stepIndex === -1) return;

    setStep(stepIndex);
    pauseAuto();
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startAuto();
        } else {
          stopAuto();
          clearTimeout(pauseTimeout);
        }
      });
    },
    { threshold: 0.3 },
  );

  observer.observe(container);
};

const initStepSlider = () => {
  const nextBtn = document.querySelector(".process-slider-btn.forward");
  const prevBtn = document.querySelector(".process-slider-btn.backward");
  const steps = document.querySelectorAll(".process-steps-item");
  const controls = document.querySelector(".process-slider-controls");
  const content = document.querySelector(".process-steps-content");

  if (!nextBtn || !prevBtn || !steps.length) return;

  let currentStep = 1;
  let totalStep = steps.length;
  let autoInterval = null;
  let pauseTimeout = null;

  const mainPageProgress = new Progress(currentStep, totalStep);

  const updateStep = (current) => {
    steps.forEach((step, index) => {
      if (index + 1 === current) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });
  };

  const setStep = (step) => {
    currentStep = step;
    mainPageProgress.onNewStep(currentStep);
    prevBtn.disabled = currentStep === 1;
    nextBtn.disabled = currentStep === totalStep;
    updateStep(currentStep);
  };

  const nextStep = () => {
    setStep((currentStep % totalStep) + 1);
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  const startAuto = () => {
    if (autoInterval || prefersReducedMotion.matches) return;
    autoInterval = setInterval(nextStep, 3000);
  };

  const stopAuto = () => {
    clearInterval(autoInterval);
    autoInterval = null;
  };

  const pauseAuto = () => {
    stopAuto();
    clearTimeout(pauseTimeout);
    pauseTimeout = setTimeout(startAuto, 5000);
  };

  nextBtn.addEventListener("click", () => {
    if (currentStep < totalStep) {
      setStep(currentStep + 1);
    }
    pauseAuto();
  });

  prevBtn.addEventListener("click", () => {
    if (currentStep > 1) {
      setStep(currentStep - 1);
    }
    pauseAuto();
  });

  if (content) {
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    content.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
      },
      { passive: true },
    );

    content.addEventListener(
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

    content.addEventListener(
      "touchend",
      (e) => {
        if (!isSwiping) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const threshold = 50;
        if (dx < -threshold && currentStep < totalStep) {
          setStep(currentStep + 1);
        } else if (dx > threshold && currentStep > 1) {
          setStep(currentStep - 1);
        }
        isSwiping = false;
        pauseAuto();
      },
      { passive: true },
    );
  }

  if (controls) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAuto();
          } else {
            stopAuto();
            clearTimeout(pauseTimeout);
          }
        });
      },
      { threshold: 0.3 },
    );

    observer.observe(controls);
  }
};

const initProcessColumns = () => {
  const lists = document.querySelectorAll(".process-list");
  if (!lists.length) return;

  lists.forEach((list) => {
    const items = list.querySelectorAll(".process-item");
    const count = items.length;

    if (!count) {
      list.style.removeProperty("--process-rows");
      return;
    }

    const firstColumnCount = Math.ceil(count / 2);

    list.style.setProperty("--process-rows", firstColumnCount);

    items.forEach((item, index) => {
      const isLastInFirstColumn = index === firstColumnCount - 1;
      const isLastInSecondColumn = index === count - 1;
      item.classList.toggle(
        "process-item--no-border",
        isLastInFirstColumn || isLastInSecondColumn,
      );
    });
  });
};

const initCasesSlider = () => {
  document.querySelectorAll(".cases-slider").forEach((root) => {
    const list = root.querySelector(".cases-slider-list");
    if (!list) return;

    const items = list.querySelectorAll(".cases-slider-item");
    if (!items.length) return;

    let currentIndex = 0;
    const getMaxIndex = () => items.length - 1;

    const updateSlider = () => {
      items.forEach((item, index) =>
        item.classList.toggle("active", index === currentIndex),
      );

      list
        .querySelectorAll(".cases-slider-item-btn.backward")
        .forEach((btn) => (btn.disabled = currentIndex === 0));
      list
        .querySelectorAll(".cases-slider-item-btn.forward")
        .forEach((btn) => (btn.disabled = currentIndex >= getMaxIndex()));
    };

    const goNext = () => {
      if (currentIndex < getMaxIndex()) {
        currentIndex++;
        updateSlider();
      }
    };

    const goPrev = () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateSlider();
      }
    };

    list.addEventListener("click", (e) => {
      if (e.target.closest(".cases-slider-item-btn.forward")) goNext();
      else if (e.target.closest(".cases-slider-item-btn.backward")) goPrev();
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    root.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
      },
      { passive: true },
    );

    root.addEventListener(
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

    root.addEventListener(
      "touchend",
      (e) => {
        if (!isSwiping) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const threshold = 50;
        if (dx < -threshold) goNext();
        else if (dx > threshold) goPrev();
        isSwiping = false;
      },
      { passive: true },
    );

    updateSlider();
  });
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
  initEstimateAccordion();

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

  initHorizontalSlider(document.querySelector(".case-projects-slider"), {
    list: ".case-projects-list",
    item: ".case-projects-item",
    track: ".case-projects-slider",
    btnBack: ".case-projects-slider-btn.backward",
    btnFwd: ".case-projects-slider-btn.forward",
  });

  initHorizontalSlider(document.querySelector(".related"), {
    list: ".related-list",
    item: ".related-item",
    track: ".related-slider",
    btnBack: ".related-slider-btn.backward",
    btnFwd: ".related-slider-btn.forward",
  });

  // blog-post: слайдер похожих статей (своё именование .related-slider-*)
  initHorizontalSlider(document.querySelector(".related"), {
    list: ".related-slider-list",
    item: ".related-slider-item",
    track: ".related-slider",
    btnBack: ".related-slider-btn.backward",
    btnFwd: ".related-slider-btn.forward",
  });

  // blog-post: слайдер проектов внутри статьи
  initHorizontalSlider(document.querySelector(".post-projects-slider"), {
    list: ".post-projects-list",
    item: ".post-projects-item",
    track: ".post-projects-slider",
    btnBack: ".post-projects-slider-btn.backward",
    btnFwd: ".post-projects-slider-btn.forward",
  });

  initHeaderBurger();
  getHeaderHeight();
  initModal();
  initFiltersModal();
  initCatalogFilterGroups();
  initSortDisclosure();
  initSortListbox("catalog");
  initSortListbox("blog");
  initStickyHeaderBottom();
  initStepper();
  initStepSlider();
  initCasesSlider();
  initProcessColumns();
  initSidebarContent("case");
  initSidebarContent("post");
  initFormValidation();
  initSuccess();
  initFileBtns();
  initCookie();
});

window.addEventListener("resize", () => {
  getHeaderHeight();
});
