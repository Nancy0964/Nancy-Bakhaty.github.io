function initProjectShowcase(showcase) {
  const track = showcase.querySelector("[data-project-track]");
  const panels = Array.from(showcase.querySelectorAll("[data-project-panel]"));
  const dotsContainer = showcase.querySelector("[data-project-dots]");
  const prevButton = showcase.querySelector("[data-project-prev]");
  const nextButton = showcase.querySelector("[data-project-next]");
  const statusText = showcase.querySelector("[data-project-status]");

  if (!track || panels.length === 0 || !dotsContainer || !prevButton || !nextButton) {
    return;
  }

  let activeIndex = 0;
  let scrollRaf = null;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function clampIndex(index) {
    return Math.max(0, Math.min(index, panels.length - 1));
  }

  function getPanelLeft(index) {
    const panel = panels[index];
    const centeredOffset = (track.clientWidth - panel.clientWidth) / 2;

    return panel.offsetLeft - track.offsetLeft - centeredOffset;
  }

  function pauseVideosOutsideProject(index) {
    panels.forEach((panel, panelIndex) => {
      if (panelIndex === index) return;

      panel.querySelectorAll("video").forEach((video) => {
        video.pause();
      });
    });
  }

  function updateSphereStrip() {
    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    const panelReferenceWidth = panels[0]?.clientWidth || 1;

    panels.forEach((panel) => {
      const panelCenter = panel.offsetLeft + panel.clientWidth / 2;
      const distance = (panelCenter - trackCenter) / panelReferenceWidth;
      const limitedDistance = clamp(distance, -1.35, 1.35);
      const distanceAbs = Math.abs(limitedDistance);

      const rotateY = limitedDistance * -9;
      const scale = 1 - Math.min(distanceAbs * 0.075, 0.095);
      const translateZ = -Math.min(distanceAbs * 68, 82);
      const opacity = 1 - Math.min(distanceAbs * 0.22, 0.32);

      panel.style.setProperty("--panel-rotate-y", `${rotateY.toFixed(3)}deg`);
      panel.style.setProperty("--panel-scale", scale.toFixed(3));
      panel.style.setProperty("--panel-z", `${translateZ.toFixed(3)}px`);
      panel.style.setProperty("--panel-opacity", opacity.toFixed(3));
    });
  }

  function setActiveProject(index, options = {}) {
    const nextIndex = clampIndex(index);
    const shouldPauseVideos = options.pauseVideos !== false;

    activeIndex = nextIndex;

    panels.forEach((panel, panelIndex) => {
      const isActive = panelIndex === activeIndex;
      panel.toggleAttribute("aria-current", isActive);
    });

    const dots = Array.from(dotsContainer.querySelectorAll("[data-project-dot]"));

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeIndex;

      dot.classList.toggle("is-active", isActive);

      if (isActive) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });

    prevButton.disabled = activeIndex === 0;
    nextButton.disabled = activeIndex === panels.length - 1;

    if (statusText) {
      statusText.textContent = `Showing project ${activeIndex + 1} of ${panels.length}`;
    }

    if (shouldPauseVideos) {
      pauseVideosOutsideProject(activeIndex);
    }
  }

  function scrollToProject(index) {
    const nextIndex = clampIndex(index);

    track.scrollTo({
      left: getPanelLeft(nextIndex),
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });

    setActiveProject(nextIndex);
    updateSphereStrip();
  }

  function getClosestPanelIndex() {
    const trackCenter = track.scrollLeft + track.clientWidth / 2;

    let closestIndex = 0;
    let smallestDistance = Infinity;

    panels.forEach((panel, index) => {
      const panelCenter = panel.offsetLeft + panel.clientWidth / 2;
      const distance = Math.abs(trackCenter - panelCenter);

      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  function buildDots() {
    const fragment = document.createDocumentFragment();

    panels.forEach((panel, index) => {
      const title = panel.dataset.projectTitle || `Project ${index + 1}`;
      const dot = document.createElement("button");

      dot.type = "button";
      dot.className = "project-dot";
      dot.dataset.projectDot = String(index);
      dot.setAttribute(
        "aria-label",
        `Go to ${title}, project ${index + 1} of ${panels.length}`
      );

      dot.addEventListener("click", () => {
        scrollToProject(index);
      });

      fragment.appendChild(dot);
    });

    dotsContainer.replaceChildren(fragment);
  }

  function setPanelAccessibility() {
    panels.forEach((panel, index) => {
      panel.setAttribute("aria-posinset", String(index + 1));
      panel.setAttribute("aria-setsize", String(panels.length));
    });
  }

  function handleTrackScroll() {
    if (scrollRaf) {
      window.cancelAnimationFrame(scrollRaf);
    }

    scrollRaf = window.requestAnimationFrame(() => {
      updateSphereStrip();

      const closestIndex = getClosestPanelIndex();

      if (closestIndex !== activeIndex) {
        setActiveProject(closestIndex);
      }
    });
  }

  function handleTrackKeydown(event) {
    const key = event.key;
    const target = event.target;

    const isEditingOrMedia =
      target instanceof Element &&
      target.closest(
        "button, a, input, textarea, select, video, iframe, [contenteditable='true']"
      );

    if (isEditingOrMedia && target !== track) return;

    if (key === "ArrowRight") {
      event.preventDefault();
      scrollToProject(activeIndex + 1);
    }

    if (key === "ArrowLeft") {
      event.preventDefault();
      scrollToProject(activeIndex - 1);
    }

    if (key === "Home") {
      event.preventDefault();
      scrollToProject(0);
    }

    if (key === "End") {
      event.preventDefault();
      scrollToProject(panels.length - 1);
    }
  }

  function debounce(callback, delay = 120) {
    let timeoutId;

    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => callback(...args), delay);
    };
  }

  buildDots();
  setPanelAccessibility();
  setActiveProject(0, { pauseVideos: false });
  updateSphereStrip();

  prevButton.addEventListener("click", () => {
    scrollToProject(activeIndex - 1);
  });

  nextButton.addEventListener("click", () => {
    scrollToProject(activeIndex + 1);
  });

  track.addEventListener("scroll", handleTrackScroll, { passive: true });
  track.addEventListener("keydown", handleTrackKeydown);

  window.addEventListener(
    "resize",
    debounce(() => {
      scrollToProject(activeIndex);
      updateSphereStrip();
    })
  );
}

function initAllProjectShowcases() {
  document.querySelectorAll("[data-project-showcase]").forEach((showcase) => {
    initProjectShowcase(showcase);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAllProjectShowcases);
} else {
  initAllProjectShowcases();
}