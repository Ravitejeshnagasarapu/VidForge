document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  function showToast(titleText, messageText, type = "info") {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = "toast";

    let iconName = "info";
    if (type === "success") iconName = "check-circle";
    if (type === "error") iconName = "alert-triangle";
    if (type === "warning") iconName = "alert-circle";

    const icon = document.createElement("div");
    icon.className = `toast-icon ${type}`;
    const iconElement = document.createElement("i");
    iconElement.setAttribute("data-lucide", iconName);
    icon.appendChild(iconElement);

    const content = document.createElement("div");
    content.className = "toast-content";
    const title = document.createElement("div");
    title.className = "toast-title";
    title.textContent = titleText;
    const message = document.createElement("div");
    message.className = "toast-message";
    message.textContent = messageText;
    content.append(title, message);

    const closeButton = document.createElement("button");
    closeButton.className = "toast-close";
    closeButton.setAttribute("aria-label", "Close Notification");
    const closeIcon = document.createElement("i");
    closeIcon.setAttribute("data-lucide", "x");
    closeButton.appendChild(closeIcon);

    const isDownloadStarted =
      titleText.toLowerCase().includes("download started") ||
      type === "download-started";
    toast.append(icon, content, closeButton);
    if (isDownloadStarted) {
      const progressBar = document.createElement("div");
      progressBar.className = "toast-progress-bar";
      toast.appendChild(progressBar);
    }

    toastContainer.appendChild(toast);
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    toast.offsetHeight;
    toast.classList.add("show");

    const autoCloseTimer = setTimeout(() => {
      dismiss();
    }, 5000);

    function dismiss() {
      clearTimeout(autoCloseTimer);
      toast.classList.remove("show");
      toast.classList.add("hide");
      toast.addEventListener("transitionend", () => {
        toast.remove();
      });
    }

    closeButton.addEventListener("click", dismiss);
  }

  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const htmlElement = document.documentElement;

  const savedTheme = localStorage.getItem("yt-downloader-theme") || "dark";
  htmlElement.setAttribute("data-theme", savedTheme);

  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = htmlElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    htmlElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("yt-downloader-theme", newTheme);
  });

  const isDesktop = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;
  const navbar = document.getElementById("mainNavbar");
  const navIndicator = document.getElementById("navIndicator");
  const navMenu = document.getElementById("navMenu");
  let lastScrollY = window.scrollY;
  let scrollTicking = false;

  let isNavigating = false;
  let navigationTimeout;

  function updateNavIndicator() {
    if (!navMenu || !navIndicator) return;
    if (getComputedStyle(navMenu).display === "none") {
      navIndicator.style.opacity = "0";
      return;
    }
    const activeLink =
      navMenu.querySelector(".nav-link.active") ||
      navMenu.querySelector(".nav-link");
    if (!activeLink) {
      navIndicator.style.opacity = "0";
      return;
    }

    if (!activeLink.offsetWidth || !activeLink.offsetHeight) {
      navIndicator.style.opacity = "0";
      return;
    }

    let left = 0;
    let top = 0;
    let offsetElement = activeLink;
    while (offsetElement && offsetElement !== navMenu) {
      left += offsetElement.offsetLeft;
      top += offsetElement.offsetTop;
      offsetElement = offsetElement.offsetParent;
    }
    if (offsetElement !== navMenu) {
      navIndicator.style.opacity = "0";
      return;
    }

    navIndicator.style.transform =
      `translate3d(${left}px, ${top}px, 0)`;
    navIndicator.style.width = `${activeLink.offsetWidth}px`;
    navIndicator.style.height = `${activeLink.offsetHeight}px`;
    navIndicator.style.opacity = "1";
  }

  function handleScroll() {
    const currentScrollY = window.scrollY;

    if (currentScrollY > 30) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }

    if (currentScrollY <= 30 || currentScrollY < lastScrollY) {
      navbar.classList.remove("scrolling-down");
    } else if (currentScrollY > lastScrollY) {
      navbar.classList.add("scrolling-down");
    }
    lastScrollY = currentScrollY;

    const winScroll =
      document.body.scrollTop || document.documentElement.scrollTop;
    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    const progressBar = document.getElementById("scrollProgressBar");
    if (progressBar) {
      progressBar.style.width = scrolled + "%";
    }

    updateNavIndicator();
    scrollTicking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(handleScroll);
        scrollTicking = true;
      }
    },
    { passive: true },
  );

  window.requestAnimationFrame(() => {
    handleScroll();
    updateNavIndicator();
  });

  const spySections = [
    "home",
    "preview",
    "architecture",
    "how-it-works",
    "repository",
    "download",
  ];
  const navLinks = document.querySelectorAll(".nav-link");
  const visibleSections = new Set();
  const sectionRatios = new Map();

  const spyObserverOptions = {
    root: null,
    rootMargin: "-120px 0px -40% 0px",
    threshold: [
      0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
    ],
  };

  function updateActiveNav(activeId) {
    if (!activeId || isNavigating) return;

    let targetHref = "#home";
    if (activeId === "home") {
      targetHref = "#home";
    } else if (activeId === "preview") {
      targetHref = "#preview";
    } else if (
      ["architecture", "how-it-works", "repository"].includes(activeId)
    ) {
      targetHref = "#architecture";
    } else if (["download"].includes(activeId)) {
      targetHref = "#download";
    }

    let changed = false;
    navLinks.forEach((link) => {
      const isMatch = link.getAttribute("href") === targetHref;
      if (isMatch) {
        if (!link.classList.contains("active")) {
          link.classList.add("active");
          changed = true;
        }
      } else {
        if (link.classList.contains("active")) {
          link.classList.remove("active");
          changed = true;
        }
      }
    });

    if (changed) {
      window.requestAnimationFrame(updateNavIndicator);
    }
  }

  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const id = entry.target.getAttribute("id");
      if (!id) return;

      if (entry.isIntersecting) {
        visibleSections.add(id);
        sectionRatios.set(id, entry.intersectionRatio);
      } else {
        visibleSections.delete(id);
        sectionRatios.delete(id);
      }
    });

    let mostActiveId = "";
    if (visibleSections.size > 0) {
      let maxScore = -Infinity;
      visibleSections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const distanceScore = -Math.abs(rect.top - 110);

          const ratio = sectionRatios.get(id) || 0;
          const score = distanceScore + ratio * 1000;

          if (score > maxScore) {
            maxScore = score;
            mostActiveId = id;
          }
        }
      });
    }

    if (window.scrollY < 100) {
      mostActiveId = "home";
    } else if (
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 50
    ) {
      mostActiveId = "download";
    }

    if (mostActiveId) {
      updateActiveNav(mostActiveId);
    }
  }, spyObserverOptions);

  spySections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      spyObserver.observe(el);
    }
  });

  let resizeTimeout;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        window.requestAnimationFrame(updateNavIndicator);
      }, 100);
    },
    { passive: true },
  );

  const showTooltip = (link) => {
    if (link.dataset.hasTooltip === "true") return;

    const text = link.getAttribute("aria-label");
    if (!text) return;

    const tooltip = document.createElement("span");
    tooltip.className = "nav-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    const rect = link.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const top = rect.bottom + 12 + scrollY;
    const left = rect.left + rect.width / 2 + scrollX;

    tooltip.style.position = "absolute";
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.margin = "0";
    tooltip.style.transform = "translate(-50%, 8px) scale(0.95)";
    tooltip.style.opacity = "0";
    tooltip.style.pointerEvents = "none";
    tooltip.style.transition =
      "opacity 250ms cubic-bezier(0.22, 1, 0.36, 1), transform 250ms cubic-bezier(0.22, 1, 0.36, 1)";

    tooltip.offsetHeight;

    tooltip.style.transform = "translate(-50%, 0) scale(1)";
    tooltip.style.opacity = "1";

    link.dataset.hasTooltip = "true";
    link._activeTooltip = tooltip;
  };

  const hideTooltip = (link) => {
    const tooltip = link._activeTooltip;
    if (tooltip) {
      tooltip.style.transform = "translate(-50%, 8px) scale(0.95)";
      tooltip.style.opacity = "0";
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.remove();
        }
      }, 250);
      delete link.dataset.hasTooltip;
      delete link._activeTooltip;
    }
  };

  document.querySelectorAll(".nav-link").forEach((link) => {
    if (!link.getAttribute("tabindex")) {
      link.setAttribute("tabindex", "0");
    }
    if (!link.getAttribute("title")) {
      link.setAttribute("title", link.getAttribute("aria-label"));
    }

    if (isDesktop) {
      link.addEventListener("mouseenter", () => showTooltip(link));
      link.addEventListener("mouseleave", () => hideTooltip(link));

      link.addEventListener("focus", () => showTooltip(link));
      link.addEventListener("blur", () => hideTooltip(link));
    }

    link.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        link.click();
      }
    });

    link.addEventListener("click", (e) => {
      e.preventDefault();
      isNavigating = true;
      clearTimeout(navigationTimeout);
      navigationTimeout = setTimeout(() => {
        isNavigating = false;
      }, 1000);

      document
        .querySelectorAll(".nav-link")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      window.requestAnimationFrame(updateNavIndicator);

      hideTooltip(link);

      const href = link.getAttribute("href");
      const targetId = href && href.startsWith("#") ? href.slice(1) : null;
      if (targetId) {
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const navbarHeight = navbar
            ? navbar.getBoundingClientRect().height
            : 0;
          const rect = targetEl.getBoundingClientRect();
          const targetY =
            window.scrollY + rect.top - Math.round(navbarHeight) - 8;
          window.scrollTo({ top: targetY, behavior: "smooth" });

          document
            .querySelectorAll(".nav-link")
            .forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
          window.requestAnimationFrame(updateNavIndicator);

          isNavigating = true;
          clearTimeout(navigationTimeout);
          navigationTimeout = setTimeout(() => {
            isNavigating = false;
          }, 700);
        } else {
          window.location.hash = href;
        }
      }
    });
  });

  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileDrawer = document.getElementById("mobileDrawer");
  const mobileNavLinks = document.querySelectorAll(".mobile-nav-link");

  if (hamburgerBtn && mobileDrawer) {
    function toggleMobileMenu() {
      const expanded = hamburgerBtn.getAttribute("aria-expanded") === "true";
      hamburgerBtn.setAttribute("aria-expanded", !expanded);
      mobileDrawer.classList.toggle("active");
      hamburgerBtn.classList.toggle("active");
    }

    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMobileMenu();
    });

    mobileNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        isNavigating = true;
        clearTimeout(navigationTimeout);
        navigationTimeout = setTimeout(() => {
          isNavigating = false;
        }, 1000);

        hamburgerBtn.setAttribute("aria-expanded", "false");
        mobileDrawer.classList.remove("active");
        hamburgerBtn.classList.remove("active");
      });
    });

    document.addEventListener("click", (e) => {
      if (
        mobileDrawer.classList.contains("active") &&
        !mobileDrawer.contains(e.target) &&
        !hamburgerBtn.contains(e.target)
      ) {
        hamburgerBtn.setAttribute("aria-expanded", "false");
        mobileDrawer.classList.remove("active");
        hamburgerBtn.classList.remove("active");
      }
    });

    mobileDrawer.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  let startSimBtn = document.getElementById("startSimBtn");
  let simulationUrlInput = document.getElementById("simulationUrlInput");
  let simDownloadMode = document.getElementById("simDownloadMode");
  let simProcessPanel = document.getElementById("simProcessPanel");
  let downloadOutputFolderInput = document.getElementById(
    "downloadOutputFolderInput",
  );
  const chooseOutputFolderBtn = document.getElementById("chooseOutputFolderBtn");
  let outputFolderPickerPending = false;
  let selectedOutputDirectory = null;
  const outputDirectoriesByDownload = new Map();
  let pendingOutputDirectoryReady = null;
  let resolvePendingOutputDirectoryReady = null;

  let simVideoTitle = document.getElementById("simVideoTitle");
  let simVideoChannel = document.getElementById("simVideoChannel");
  let simVideoDuration = document.getElementById("simVideoDuration");
  let simVideoViewCount = document.getElementById("simVideoViewCount");
  let simVideoFormat = document.getElementById("simVideoFormat");
  let simVideoThumbnail = document.getElementById("simVideoThumbnail");

  let progressStageLabel = document.getElementById("progressStageLabel");
  let progressPercentLabel = document.getElementById("progressPercentLabel");
  let simProgressFill = document.getElementById("simProgressFill");
  let simProgressSpeed = document.getElementById("simProgressSpeed");
  let simProgressETA = document.getElementById("simProgressETA");
  let simProgressSize = document.getElementById("simProgressSize");
  let simProgressResolution = document.getElementById("simProgressResolution");
  let simTickerText = document.getElementById("simTickerText");

  let downloadHistoryList = document.getElementById("downloadHistoryList");

  function refreshElements() {
    startSimBtn = startSimBtn || document.getElementById("startSimBtn");
    simulationUrlInput =
      simulationUrlInput || document.getElementById("simulationUrlInput");
    simDownloadMode =
      simDownloadMode || document.getElementById("simDownloadMode");
    simProcessPanel =
      simProcessPanel || document.getElementById("simProcessPanel");
    downloadOutputFolderInput =
      downloadOutputFolderInput ||
      document.getElementById("downloadOutputFolderInput");

    simVideoTitle = simVideoTitle || document.getElementById("simVideoTitle");
    simVideoChannel =
      simVideoChannel || document.getElementById("simVideoChannel");
    simVideoDuration =
      simVideoDuration || document.getElementById("simVideoDuration");
    simVideoViewCount =
      simVideoViewCount || document.getElementById("simVideoViewCount");
    simVideoFormat =
      simVideoFormat || document.getElementById("simVideoFormat");
    simVideoThumbnail =
      simVideoThumbnail || document.getElementById("simVideoThumbnail");

    progressStageLabel =
      progressStageLabel || document.getElementById("progressStageLabel");
    progressPercentLabel =
      progressPercentLabel || document.getElementById("progressPercentLabel");
    simProgressFill =
      simProgressFill || document.getElementById("simProgressFill");
    simProgressSpeed =
      simProgressSpeed || document.getElementById("simProgressSpeed");
    simProgressETA =
      simProgressETA || document.getElementById("simProgressETA");
    simProgressSize =
      simProgressSize || document.getElementById("simProgressSize");
    simProgressResolution =
      simProgressResolution || document.getElementById("simProgressResolution");
    simTickerText = simTickerText || document.getElementById("simTickerText");

    downloadHistoryList =
      downloadHistoryList || document.getElementById("downloadHistoryList");
  }

  let isSimulatorRunning = false;
  let isDownloadRequestPending = false;
  let currentDownloadId = null;
  let lastFinishedDownloadId = null;
  let eventSource = null;

  function resetDownloadUI() {
    refreshElements();
    isSimulatorRunning = false;
    isDownloadRequestPending = false;
    currentDownloadId = null;
    if (startSimBtn) {
      startSimBtn.disabled = false;
      startSimBtn.style.opacity = "1";
      startSimBtn.classList.remove("btn-danger");
      startSimBtn.innerHTML =
        '<i data-lucide="download"></i> <span>Download</span>';
    }

    const progressFill = document.getElementById("simProgressFill");
    if (progressFill) progressFill.style.width = "0%";

    if (progressStageLabel)
      progressStageLabel.textContent = "Initializing pipeline...";
    if (progressPercentLabel) progressPercentLabel.textContent = "0%";
    if (simProgressSpeed) simProgressSpeed.textContent = "0.0 MB/s";
    if (simProgressETA) simProgressETA.textContent = "--:--";
    if (simProgressSize) simProgressSize.textContent = "-- MB";
    if (simProgressResolution) simProgressResolution.textContent = "-- • --";
    if (simTickerText)
      simTickerText.textContent = "Waiting for backend events...";

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  function renderHistoryEntry(entry) {
    if (!downloadHistoryList) return;
    const item = document.createElement("div");
    item.className = "rcs-item";
    const thumbnail = document.createElement("div");
    thumbnail.className = "rcs-thumb";
    if (entry.thumbnail) {
      try {
        const thumbnailUrl = new URL(entry.thumbnail, document.baseURI);
        if (["http:", "https:"].includes(thumbnailUrl.protocol)) {
          const image = document.createElement("img");
          image.src = thumbnailUrl.href;
          image.alt = entry.title || "Download";
          image.addEventListener("error", () => {
            image.style.display = "none";
          });
          thumbnail.appendChild(image);
        }
      } catch (error) {
        console.warn("Ignoring invalid download thumbnail URL.", error);
      }
    }

    const info = document.createElement("div");
    info.className = "rcs-info";
    const name = document.createElement("div");
    name.className = "rcs-name";
    name.textContent = entry.title || "Unknown";
    const metadata = document.createElement("div");
    metadata.className = "rcs-meta";
    const format = document.createElement("span");
    format.className = "rcs-format-badge";
    format.textContent = entry.format || "Unknown";
    const date = document.createElement("span");
    date.className = "rcs-time";
    date.textContent = entry.date || "Unknown date";
    metadata.append(format, date);
    info.append(name, metadata);
    item.append(thumbnail, info);
    downloadHistoryList.prepend(item);
  }

  function connectSSE() {
    if (eventSource) return;
    eventSource = new EventSource("/api/stream");

    eventSource.onerror = () => {
      if (eventSource && eventSource.readyState === EventSource.CLOSED) {
        eventSource = null;
        setTimeout(connectSSE, 5000);
      }
    };

    eventSource.addEventListener("DOWNLOAD_STARTED", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.downloadId) {
          currentDownloadId = data.downloadId;
          lastFinishedDownloadId = null;
        }
      } catch (err) {
        console.error("Failed to process DOWNLOAD_STARTED event.", err);
      }

      isDownloadRequestPending = false;
      isSimulatorRunning = true;
      if (startSimBtn) {
        startSimBtn.disabled = false;
        startSimBtn.style.opacity = "1";
        startSimBtn.classList.add("btn-danger");
        startSimBtn.innerHTML =
          '<i data-lucide="square"></i> <span>Stop Download</span>';
      }
      if (typeof lucide !== "undefined") lucide.createIcons();

      if (simProcessPanel) simProcessPanel.classList.remove("hidden");

      if (simVideoTitle) simVideoTitle.textContent = "Fetching metadata...";
      if (simVideoChannel) simVideoChannel.textContent = "...";
      if (simVideoDuration) simVideoDuration.textContent = "Duration: ...";
      if (simVideoViewCount) simVideoViewCount.textContent = "Views: ...";

      const selectedMode =
        simDownloadMode &&
        simDownloadMode.options &&
        simDownloadMode.selectedIndex >= 0
          ? simDownloadMode.options[simDownloadMode.selectedIndex].text
          : null;
      if (selectedMode && simVideoFormat)
        simVideoFormat.textContent = "Target: " + selectedMode;
    });

    eventSource.addEventListener("METADATA_READY", (e) => {
      try {
        const data = JSON.parse(e.data || "{}");

        if (
          currentDownloadId &&
          data.downloadId &&
          data.downloadId !== currentDownloadId
        ) {
          return;
        }

        simVideoTitle.textContent = data.title || "Unknown";
        simVideoChannel.textContent = data.uploader || "Unknown";

        let dur = parseInt(data.duration) || 0;
        let mins = Math.floor(dur / 60);
        let secs = dur % 60;
        let timeStr = mins + ":" + (secs < 10 ? "0" : "") + secs;
        simVideoDuration.textContent = "Duration: " + timeStr;

        const durationBadge = document.getElementById(
          "simThumbDurationOverlay",
        );
        if (durationBadge) durationBadge.textContent = timeStr;

        const overlays = document.getElementById("simThumbOverlays");
        if (overlays) overlays.classList.remove("hidden");

        const hdBadge = document.getElementById("simThumbHDBadge");
        const selectedMode =
          simDownloadMode.options[simDownloadMode.selectedIndex].text;
        if (
          hdBadge &&
          (selectedMode.includes("1080") ||
            selectedMode.includes("1440") ||
            selectedMode.includes("4K") ||
            selectedMode.includes("Best"))
        ) {
          hdBadge.classList.remove("hidden");
        } else if (hdBadge) {
          hdBadge.classList.add("hidden");
        }

        const verifiedBadge = document.getElementById("simChannelVerified");
        if (verifiedBadge) verifiedBadge.classList.remove("hidden");

        simVideoViewCount.textContent =
          "Views: " + (data.view_count || "Unknown");

        const fallback = document.getElementById("simThumbFallback");
        const loading = document.getElementById("simThumbLoading");
        const img = document.getElementById("simThumbImg");
        if (fallback) fallback.classList.add("hidden");
        if (img) {
          img.classList.remove("show");
          img.classList.add("hidden");
        }
        if (loading) loading.classList.remove("hidden");

        const queueTitleSpan = document.getElementById("queueTitleSpan");
        if (queueTitleSpan)
          queueTitleSpan.textContent = data.title || "Unknown";

        if (data.activeCodec && simProgressResolution) {
          simProgressResolution.textContent = data.activeCodec;
        }

        if (data.thumbnail && simVideoThumbnail) {
          const thumbImg = document.getElementById("simThumbImg");
          const thumbFallback = document.getElementById("simThumbFallback");
          if (thumbImg) {
            thumbImg.src = data.thumbnail;
            thumbImg.classList.remove("hidden");
          }
          if (thumbFallback) thumbFallback.classList.add("hidden");
        }

        showToast(
          "Metadata Ready",
          `Video information fetched for "${data.title}"`,
          "success",
        );
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener("THUMBNAIL_READY", (e) => {
      try {
        const data = JSON.parse(e.data || "{}");

        if (
          currentDownloadId &&
          data.downloadId &&
          data.downloadId !== currentDownloadId
        ) {
          return;
        }

        const loading = document.getElementById("simThumbLoading");
        const img = document.getElementById("simThumbImg");
        const fallback = document.getElementById("simThumbFallback");

        if (img && data.path) {
          img.dataset.triedAlt = "0";
          img.onload = () => {
            if (loading) loading.classList.add("hidden");
            img.classList.remove("hidden");
            setTimeout(() => img.classList.add("show"), 50);
          };
          img.onerror = function () {
            if (this.dataset.triedAlt !== "1") {
              this.dataset.triedAlt = "1";
              let alt = null;
              try {
                if (data.path && data.path.includes("/")) {
                  const fname = data.path.split("/").pop();
                  alt = "/cache/thumbnails/" + fname;
                }
                if (!alt && data.videoId) {
                  alt = "/cache/thumbnails/" + data.videoId + ".jpg";
                }
              } catch (err) {
                alt = null;
              }
              if (alt && this.src !== alt) {
                this.src = alt;
                return;
              }
            }
            if (loading) loading.classList.add("hidden");
            if (fallback) fallback.classList.remove("hidden");
          };
          img.src = data.path;
        } else {
          if (loading) loading.classList.add("hidden");
          if (fallback) fallback.classList.remove("hidden");
        }
      } catch (err) {
        console.error(err);
      }
    });

    let progressAnimationFrame = null;
    eventSource.addEventListener("PROGRESS", (e) => {
      try {
        const data = JSON.parse(e.data || "{}");

        if (
          currentDownloadId &&
          data.downloadId &&
          data.downloadId !== currentDownloadId
        ) {
          return;
        }

        if (progressAnimationFrame)
          cancelAnimationFrame(progressAnimationFrame);
        progressAnimationFrame = requestAnimationFrame(() => {
          if (progressStageLabel)
            progressStageLabel.textContent =
              "Downloading " + (data.streamType || "Stream") + "...";
          if (progressPercentLabel)
            progressPercentLabel.textContent = data.percent + "%";
          if (simProgressFill) simProgressFill.style.width = data.percent + "%";
          if (simProgressSpeed) simProgressSpeed.textContent = data.speed;
          if (simProgressETA) simProgressETA.textContent = data.eta;
          if (simProgressSize)
            simProgressSize.textContent =
              data.downloadedSize + " / " + data.totalSize;
          if (simProgressResolution && data.activeCodec)
            simProgressResolution.textContent = data.activeCodec;
          if (simTickerText)
            simTickerText.textContent = "Current File: " + data.currentFile;
        });
      } catch (err) {
        console.error("Failed to process PROGRESS event.", err);
      }
    });

    eventSource.addEventListener("STATUS", (e) => {
      try {
        const data = JSON.parse(e.data || "{}");

        if (
          currentDownloadId &&
          data.downloadId &&
          data.downloadId !== currentDownloadId
        ) {
          return;
        }
        const statusMessage = data.message || data.status;
        if (statusMessage && simTickerText) {
          simTickerText.textContent = statusMessage;
        }
      } catch (err) {
        console.error("Failed to process STATUS event.", err);
      }
    });

    eventSource.addEventListener("WARNING", (e) => {
      try {
        const data = JSON.parse(e.data || "{}");

        if (
          currentDownloadId &&
          data.downloadId &&
          data.downloadId !== currentDownloadId
        ) {
          return;
        }
        const warningMessage = data.message || data.warning;
        if (warningMessage && simTickerText) {
          simTickerText.textContent = warningMessage;
        }
      } catch (err) {
        console.error("Failed to process WARNING event.", err);
      }
    });

    eventSource.addEventListener("ERROR", (e) => {
      try {
        const data = JSON.parse(e.data || "{}");

        if (
          currentDownloadId &&
          data.downloadId &&
          data.downloadId !== currentDownloadId
        ) {
          return;
        }

        showToast("Error", data.message, "error");
      } catch (err) {
        console.error("Failed to process ERROR event.", err);
      }
    });

    eventSource.addEventListener("DOWNLOAD_COMPLETE", async (e) => {
      try {
        const data = JSON.parse(e.data || "{}");

        if (isDownloadRequestPending && pendingOutputDirectoryReady) {
          await pendingOutputDirectoryReady;
        }

        if (
          currentDownloadId &&
          data.downloadId &&
          data.downloadId !== currentDownloadId
        ) {
          return;
        }

        const outputDirectory = outputDirectoriesByDownload.get(data.downloadId);
        if (outputDirectory) {
          try {
            const response = await fetch(
              "/api/download-file?id=" + encodeURIComponent(data.downloadId),
            );
            if (!response.ok) {
              const errorBody = await response.json();
              throw new Error(
                errorBody.error || "The completed file could not be transferred.",
              );
            }

            const fileName = (data.path || "download").split(/[\\/]/).pop();
            if (typeof outputDirectory.getFileHandle !== "function") {
              throw new Error(
                "This browser cannot create files in the selected folder.",
              );
            }
            const fileHandle = await outputDirectory.getFileHandle(fileName, {
              create: true,
            });
            if (typeof fileHandle.createWritable !== "function") {
              throw new Error(
                "This browser cannot write files to the selected folder.",
              );
            }
            const writable = await fileHandle.createWritable();
            try {
              if (response.body && typeof response.body.pipeTo === "function") {
                await response.body.pipeTo(writable);
              } else {
                await writable.write(await response.blob());
                await writable.close();
              }
            } catch (error) {
              await writable.abort();
              throw error;
            }

            data.path = outputDirectory.name + "/" + fileName;
            const cleanupResponse = await fetch("/api/download-file/cleanup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ downloadId: data.downloadId }),
            });
            if (!cleanupResponse.ok) {
              showToast(
                "Saved with a copy in Downloads",
                "The file was saved to the selected folder, but the temporary copy could not be removed.",
                "warning",
              );
            }
          } catch (error) {
            showToast(
              "Saved to Downloads",
              "The selected folder could not be written to: " +
                (error.message || "unknown error"),
              "warning",
            );
          } finally {
            outputDirectoriesByDownload.delete(data.downloadId);
          }
        }

        lastFinishedDownloadId = data.downloadId || currentDownloadId;
        resetDownloadUI();

        renderHistoryEntry({
          title: data.title || "Unknown",
          thumbnail: data.thumbnail || "",
          date: new Date().toLocaleString(),
          path: data.path || "",
          format: data.format || "Unknown",
          size: data.size || "Unknown",
          status: "Completed",
        });
        showToast(
          "Download Completed",
          `Successfully downloaded "${data.title}"`,
          "success",
        );
        if (typeof confetti === "function") {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#dc2626", "#ef4444", "#f87171", "#ffffff"],
          });
        }
      } catch (err) {
        console.error("Failed to process DOWNLOAD_COMPLETE event.", err);
      }
    });

    eventSource.addEventListener("DOWNLOAD_FAILED", (e) => {
      try {
        const data = JSON.parse(e.data || "{}");

        if (
          currentDownloadId &&
          data.downloadId &&
          data.downloadId !== currentDownloadId
        ) {
          return;
        }

        lastFinishedDownloadId = data.downloadId || currentDownloadId;
        outputDirectoriesByDownload.delete(data.downloadId);
        resetDownloadUI();

        showToast("Download Failed", data.message, "error");
      } catch (err) {
        console.error("Failed to process DOWNLOAD_FAILED event.", err);
      }
    });
  }

  refreshElements();
  connectSSE();

  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      (!eventSource || eventSource.readyState === EventSource.CLOSED)
    ) {
      eventSource = null;
      connectSSE();
    }
  });

  const detectClipboardBtn = document.getElementById("detectClipboardBtn");
  const clipboardReadSupported =
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.readText === "function" &&
    window.isSecureContext;

  if (detectClipboardBtn && !clipboardReadSupported) {
    detectClipboardBtn.disabled = true;
    detectClipboardBtn.style.opacity = "0.4";
    detectClipboardBtn.style.cursor = "not-allowed";
    detectClipboardBtn.title =
      "Clipboard access isn't supported in this browser";
  }

  detectClipboardBtn.addEventListener("click", async () => {
    if (!clipboardReadSupported) {
      showToast(
        "Not Supported",
        "This browser doesn't support reading the clipboard. Paste the URL manually instead.",
        "warning",
      );
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.includes("http") || text.includes("youtu"))) {
        simulationUrlInput.value = text;
        detectClipboardBtn.style.color = "var(--primary)";

        setTimeout(() => {
          detectClipboardBtn.style.color = "var(--text-secondary)";
        }, 800);
      } else {
        showToast(
          "Clipboard Empty",
          "No valid URL found in clipboard.",
          "warning",
        );
      }
    } catch (err) {
      showToast("Clipboard Error", "Could not read clipboard.", "error");
    }
  });

  async function chooseOutputFolder() {
    if (outputFolderPickerPending) return;

    outputFolderPickerPending = true;
    if (chooseOutputFolderBtn) chooseOutputFolderBtn.disabled = true;
    try {
      if (typeof window.showDirectoryPicker !== "function") {
        throw new Error(
          "Folder selection is supported in Chromium-based browsers. You can also type a local folder path.",
        );
      }

      const directory = await window.showDirectoryPicker({ mode: "readwrite" });
      const permission = await directory.requestPermission({ mode: "readwrite" });
      if (permission !== "granted") {
        throw new Error("VidForge needs write access to the selected folder.");
      }

      selectedOutputDirectory = directory;
      if (downloadOutputFolderInput) {
        downloadOutputFolderInput.value = directory.name;
        downloadOutputFolderInput.title =
          "Selected folder: " + directory.name + " (the browser hides its full path)";
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      showToast(
        "Folder Selection Unavailable",
        error.message || "Enter a local folder path manually.",
        "warning",
      );
    } finally {
      outputFolderPickerPending = false;
      if (chooseOutputFolderBtn) chooseOutputFolderBtn.disabled = false;
    }
  }

  if (chooseOutputFolderBtn) {
    chooseOutputFolderBtn.addEventListener("click", chooseOutputFolder);
  }
  if (downloadOutputFolderInput) {
    downloadOutputFolderInput.addEventListener("click", chooseOutputFolder);
    downloadOutputFolderInput.addEventListener("input", () => {
      selectedOutputDirectory = null;
      downloadOutputFolderInput.removeAttribute("title");
    });
  }

  refreshElements();
  startSimBtn.addEventListener("click", () => {
    if (isSimulatorRunning) {
      startSimBtn.disabled = true;
      startSimBtn.style.opacity = "0.7";
      startSimBtn.innerHTML =
        '<i data-lucide="loader-2" class="spin-animation"></i> <span>Stopping...</span>';
      if (typeof lucide !== "undefined") lucide.createIcons();

      if (currentDownloadId) {
        fetch("/api/download/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ downloadId: currentDownloadId }),
        })
          .then(async (response) => {
            const res = await response.json();
            if (!response.ok || !res.success) {
              throw new Error(
                res.message || res.error || "Could not cancel download.",
              );
            }
          })
          .catch((error) => {
            showToast(
              "Error",
              error.message || "Could not cancel download.",
              "error",
            );
            resetDownloadUI();
          });
      }
      return;
    }

    if (isDownloadRequestPending) return;

    const targetUrl = simulationUrlInput.value.trim();
    if (!targetUrl) {
      showToast("Download Failed", "Target URL is required.", "error");
      return;
    }

    const modeValue = simDownloadMode.value;
    let reqMode, reqRes, reqAudio;

    if (modeValue === "1") {
      reqMode = "audio";
      reqAudio = "mp3";
      reqRes = null;
    } else if (modeValue === "2") {
      reqMode = "audio";
      reqAudio = "flac";
      reqRes = null;
    } else if (modeValue === "3") {
      reqMode = "video";
      reqRes = "best";
      reqAudio = null;
    } else if (modeValue === "4") {
      reqMode = "video";
      reqRes = "1080";
      reqAudio = null;
    } else if (modeValue === "5") {
      reqMode = "video";
      reqRes = "1440";
      reqAudio = null;
    } else if (modeValue === "6") {
      reqMode = "video";
      reqRes = "2160";
      reqAudio = null;
    } else {
      reqMode = "video";
      reqRes = "best";
      reqAudio = null;
    }

    if (simProgressResolution) {
      simProgressResolution.textContent =
        reqMode === "audio" ? "--" : "-- • --";
    }

    const requestOutputDirectory = selectedOutputDirectory;
    const payload = {
      url: targetUrl,
      mode: reqMode,
      resolution: reqRes,
      audioFormat: reqAudio,
      outputFolder: requestOutputDirectory
        ? ""
        : downloadOutputFolderInput?.value?.trim() || "",
      browserFolderSelected: Boolean(requestOutputDirectory),
    };

    isDownloadRequestPending = true;
    pendingOutputDirectoryReady = new Promise((resolve) => {
      resolvePendingOutputDirectoryReady = resolve;
    });
    lastFinishedDownloadId = null;
    startSimBtn.disabled = true;
    startSimBtn.style.opacity = "0.7";
    startSimBtn.innerHTML =
      '<i data-lucide="loader-2" class="spin-animation"></i> <span>Starting...</span>';
    if (typeof lucide !== "undefined") lucide.createIcons();

    fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.error || data.message || "Could not start download.",
          );
        }
        if (!data.downloadId) {
          throw new Error("The backend did not return a download ID.");
        }
        if (lastFinishedDownloadId === data.downloadId) return;

        currentDownloadId = data.downloadId;
        if (requestOutputDirectory) {
          outputDirectoriesByDownload.set(data.downloadId, requestOutputDirectory);
        }
        if (resolvePendingOutputDirectoryReady) {
          resolvePendingOutputDirectoryReady();
          resolvePendingOutputDirectoryReady = null;
          pendingOutputDirectoryReady = null;
        }
        isDownloadRequestPending = false;
        isSimulatorRunning = true;
        startSimBtn.disabled = false;
        startSimBtn.style.opacity = "1";
        startSimBtn.classList.add("btn-danger");
        startSimBtn.innerHTML =
          '<i data-lucide="square"></i> <span>Stop Download</span>';
        if (simProcessPanel) simProcessPanel.classList.remove("hidden");
        if (typeof lucide !== "undefined") lucide.createIcons();
      })
      .catch((error) => {
        if (resolvePendingOutputDirectoryReady) {
          resolvePendingOutputDirectoryReady();
          resolvePendingOutputDirectoryReady = null;
          pendingOutputDirectoryReady = null;
        }
        if (!isDownloadRequestPending && isSimulatorRunning) {
          showToast(
            "Error",
            error.message || "Could not confirm the download request.",
            "error",
          );
          return;
        }
        if (!isDownloadRequestPending) return;

        resetDownloadUI();
        showToast(
          "Error",
          error.message || "Could not reach backend.",
          "error",
        );
      });
  });

  const repoFileTreeItems = document.querySelectorAll(
    "#repoFileTree .tree-item",
  );
  const activeFileName = document.getElementById("activeFileName");
  const activeFileTitle = document.getElementById("activeFileTitle");
  const activeFileDesc = document.getElementById("activeFileDesc");
  const activeFileImports = document.getElementById("activeFileImports");

  const fileMetaDatabase = {
    "Main.java": {
      title: "Application Entry & Interactive CLI",
      desc: "The primary entry point of the Java application. Initializes the YouTubeDownloader, handles user inputs, cleans URLs, displays options (1-6), and orchestrates the download process.",
      code: `import java.io.*;\nimport java.nio.file.*;\nimport java.util.*;\nimport java.util.logging.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        ConsoleRenderer.printBanner();\n    }\n}`,
    },
    Configuration: {
      title: "Internal Static Config Options",
      desc: "Defines static parameters including download paths (AUDIO_PATH, VIDEO_PATH), max retries, concurrent fragments, default extensions, and browser fallbacks list.",
      code: 'public static class Config {\n    public static final String USER_HOME = System.getProperty("user.home");\n    public static final String AUDIO_PATH = Paths.get(USER_HOME, "Downloads", "YouTube_Audio").toString();\n    public static final String VIDEO_PATH = Paths.get(USER_HOME, "Downloads", "YouTube_Video").toString();\n    public static final int MAX_RETRIES = 5;\n    public static final List<String> BROWSERS_TO_TRY = Arrays.asList("chrome", "edge", "brave", "firefox");\n}',
    },
    TerminalRenderer: {
      title: "CLI Console Drawing & Formatting",
      desc: "Detects ANSI colors and Unicode support, handles Windows console limitations, and renders visual steps, errors, headings, and warning banners.",
      code: 'public static class ConsoleRenderer {\n    private static final boolean USE_ANSI = TerminalCapabilities.supportsAnsi();\n    public static synchronized void step(String message) {\n        println(ANSI_BLUE + Icons.ARROW + "  " + message + ANSI_RESET);\n    }\n}',
    },
    ProgressParser: {
      title: "Asynchronous CLI Progress Tracker",
      desc: "Parses newline-delimited output lines from the yt-dlp subprocess in real-time, extracting percentages, speed, and ETA to draw a high-contrast console progress bar.",
      code: 'public static class ProgressParser {\n    private static final Pattern PROGRESS_PATTERN = Pattern.compile("\\\\[download\\\\]\\\\s+([\\\\d\\\\.]+%)\\\\s+of\\\\s+([^\\\\s]+)\\\\s+at\\\\s+([^\\\\s]+)\\\\s+ETA\\\\s+([^\\\\s]+)");\n    public static void parseLine(String line, ProgressBar bar, DownloadStatistics stats) {\n        // parses yt-dlp stdout and updates the progress bar\n    }\n}',
    },
    DownloadStatistics: {
      title: "Runtime Ingestion Statistics",
      desc: "Monitors file sizes, elapsed times, target resolution formats, and destination folder parameters, displaying a formatted completion summary screen upon success.",
      code: 'public static class DownloadStatistics {\n    public long startTime;\n    public long endTime;\n    public String title = "Unknown";\n    public String totalSize = "Unknown";\n    public String getElapsedTime() {\n        long duration = endTime - startTime;\n        return String.format("%02d:%02d", duration / 60000, (duration % 60000) / 1000);\n    }\n}',
    },
    YouTubeDownloader: {
      title: "Subprocess Execution & Resiliency Handler",
      desc: "Launches the underlying yt-dlp binary as an external ProcessBuilder. Automatically falls back to decrypted browser cookies across Chrome, Edge, Firefox, and Brave if blocked.",
      code: "public static class YouTubeDownloader {\n    public Map<String, String> getMetadata(String url) {\n        // executes yt-dlp --dump-json and parses the JSON result\n    }\n}",
    },
    Logger: {
      title: "Persistent Event Logger",
      desc: "Instantiates a persistent java.util.logging.Logger writing system events, warning states, and yt-dlp subprocess trace lines.",
      code: 'private static final Logger logger = Logger.getLogger("yt_downloader");\nstatic {\n    try {\n        Files.createDirectories(Paths.get(Config.LOG_DIR));\n        FileHandler fileHandler = new FileHandler(Config.LOG_DIR + "/yt_downloader.log", true);\n        logger.addHandler(fileHandler);\n    } catch (IOException e) {}\n}',
    },
  };

  repoFileTreeItems.forEach((item) => {
    item.addEventListener("click", () => {
      repoFileTreeItems.forEach((fi) => fi.classList.remove("active"));
      item.classList.add("active");

      const fileName = item.getAttribute("data-file");
      const meta = fileMetaDatabase[fileName];

      if (meta) {
        activeFileName.textContent = fileName;
        activeFileTitle.textContent = meta.title;
        activeFileDesc.textContent = meta.desc;
        activeFileImports.textContent = meta.code;
      }
    });
  });

  function registerCopyButton(btnId, targetTextId, isInnerHtml = false) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener("click", () => {
      const textElement = document.getElementById(targetTextId);
      if (!textElement) return;

      const textToCopy = isInnerHtml
        ? textElement.innerHTML
        : textElement.textContent;

      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          const originalContent = btn.innerHTML;
          btn.innerHTML = `<i data-lucide="check" class="text-success" style="width:14px; height:14px; display:inline-block; vertical-align:middle;"></i> <span style="color:var(--success)">Copied!</span>`;
          if (typeof lucide !== "undefined") {
            lucide.createIcons();
          }

          setTimeout(() => {
            btn.innerHTML = originalContent;
            if (typeof lucide !== "undefined") {
              lucide.createIcons();
            }
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
        });
    });
  }

  registerCopyButton("btnCopyInstallCmd", "installCommand");

  const animateScrollElements = document.querySelectorAll(
    ".feature-card, .timeline-step, .mode-card",
  );

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );

  animateScrollElements.forEach((elem) => {
    elem.classList.add("animate-scroll");
    revealObserver.observe(elem);
  });

  const urlIngestionCard = document.querySelector(".url-ingestion-card");
  if (urlIngestionCard && simulationUrlInput) {
    ["dragenter", "dragover"].forEach((eventName) => {
      urlIngestionCard.addEventListener(
        eventName,
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          urlIngestionCard.classList.add("drag-hover");
        },
        false,
      );
    });

    ["dragleave", "drop"].forEach((eventName) => {
      urlIngestionCard.addEventListener(
        eventName,
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          urlIngestionCard.classList.remove("drag-hover");
        },
        false,
      );
    });

    urlIngestionCard.addEventListener(
      "drop",
      (e) => {
        const dt = e.dataTransfer;
        const droppedText = dt.getData("text/uri-list") || dt.getData("text");

        if (droppedText) {
          const urlMatch = droppedText.match(/https?:\/\/[^\s]+/);
          const extractedUrl = urlMatch ? urlMatch[0] : droppedText;

          simulationUrlInput.value = extractedUrl.trim();

          simulationUrlInput.classList.add("pulse-success");
          setTimeout(() => {
            simulationUrlInput.classList.remove("pulse-success");
          }, 1000);
        }
      },
      false,
    );
  }

  const timelineSteps = document.querySelectorAll(".timeline-step");
  let activeStepIndex = 0;
  let timelineInterval = null;

  function runTimelineAnimation() {
    if (timelineSteps.length === 0) return;

    timelineSteps.forEach((step) => step.classList.remove("active-step"));

    timelineSteps[activeStepIndex].classList.add("active-step");

    activeStepIndex = (activeStepIndex + 1) % timelineSteps.length;
  }

  const timelineSection = document.querySelector(".how-it-works-section");
  if (timelineSteps.length > 0 && timelineSection) {
    const timelineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runTimelineAnimation();
            if (!timelineInterval) {
              timelineInterval = setInterval(runTimelineAnimation, 2500);
            }
          } else {
            if (timelineInterval) {
              clearInterval(timelineInterval);
              timelineInterval = null;
            }
            timelineSteps.forEach((s) => s.classList.remove("active-step"));
            activeStepIndex = 0;
          }
        });
      },
      { threshold: 0.15 },
    );

    timelineObserver.observe(timelineSection);

    if (isDesktop) {
      timelineSteps.forEach((step, idx) => {
        step.addEventListener("mouseenter", () => {
          if (timelineInterval) {
            clearInterval(timelineInterval);
            timelineInterval = null;
          }
          timelineSteps.forEach((s) => s.classList.remove("active-step"));
          step.classList.add("active-step");
          activeStepIndex = (idx + 1) % timelineSteps.length;
        });

        step.addEventListener("mouseleave", () => {
          if (!timelineInterval) {
            timelineInterval = setInterval(runTimelineAnimation, 2500);
          }
        });
      });
    }
  }

  const footerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const footer = document.getElementById("mainFooter");
          if (footer) {
            footer.classList.add("revealed");
          }

        }
      });
    },
    { threshold: 0.1 },
  );

  const footerElem = document.getElementById("mainFooter");
  if (footerElem) {
    footerObserver.observe(footerElem);
  }

  const diagTabBtns = document.querySelectorAll(".diag-tab-btn");
  const flowDiag = document.getElementById("flowDiagTree");
  const classDiag = document.getElementById("classDiagTree");
  if (diagTabBtns && flowDiag && classDiag) {
    diagTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        diagTabBtns.forEach((b) => {
          b.classList.remove("active");
          b.style.color = "var(--text-muted)";
          b.style.background = "none";
          b.style.borderColor = "transparent";
        });
        btn.classList.add("active");
        btn.style.color = "var(--text-primary)";
        btn.style.background = "rgba(var(--primary-rgb), 0.1)";
        btn.style.borderColor = "var(--border)";

        const target = btn.getAttribute("data-tab");
        if (target === "flow") {
          flowDiag.style.display = "flex";
          classDiag.style.display = "none";
        } else {
          flowDiag.style.display = "none";
          classDiag.style.display = "flex";
        }
      });
    });
  }

  if (typeof window.markMainScriptLoaded === "function") {
    window.markMainScriptLoaded();
  }
});
