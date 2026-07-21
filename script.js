document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  function showToast(titleText, messageText, type = "info") {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast`;

    let iconName = "info";
    if (type === "success") iconName = "check-circle";
    if (type === "error") iconName = "alert-triangle";
    if (type === "warning") iconName = "alert-circle";

    const isDownloadStarted =
      titleText.toLowerCase().includes("download started") ||
      type === "download-started";
    const progressBarHtml = isDownloadStarted
      ? `<div class="toast-progress-bar"></div>`
      : "";

    toast.innerHTML = `
      <div class="toast-icon ${type}">
        <i data-lucide="${iconName}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${titleText}</div>
        <div class="toast-message">${messageText}</div>
      </div>
      <button class="toast-close" aria-label="Close Notification">
        <i data-lucide="x"></i>
      </button>
      ${progressBarHtml}
    `;

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

    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", dismiss);
    }
  }

  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const htmlElement = document.documentElement;

  const savedTheme = localStorage.getItem("yt-downloader-theme") || "dark";
  htmlElement.setAttribute("data-theme", savedTheme);

  const configBlock = document.getElementById("configJsonCodeBlock");

  function updateConfigJson() {
    if (!configBlock) return;

    const themeValue = htmlElement.getAttribute("data-theme") || "dark";
    const downloadMode =
      document.getElementById("simDownloadMode")?.value || "bestvideo";
    const embedMetadata =
      document.getElementById("simEmbedMetadata")?.checked ?? true;
    const writeSubtitles =
      document.getElementById("simWriteSubtitles")?.checked ?? true;
    const autoDeleteChecked =
      document.getElementById("toggleAutoDeleteHistory")?.checked ?? true;

    const configObj = {
      preferred_quality: downloadMode,
      audio_codec: downloadMode.includes("mp3")
        ? "libmp3lame"
        : downloadMode.includes("flac")
          ? "flac"
          : "auto",
      audio_bitrate: downloadMode.includes("mp3") ? 320 : 0,
      theme: themeValue,
      max_retries: 5,
      concurrent_downloads: 3,
      cookies_fallback_priority: [
        "chrome",
        "edge",
        "firefox",
        "brave",
        "opera",
      ],
      download_subtitles: writeSubtitles,
      embed_metadata: embedMetadata,
      embed_thumbnail: embedMetadata,
      output_folder: "./downloads/%(uploader)s/%(title)s",
      overwrite_mode: "skip_existing",
      ffmpeg_path: "auto_detect",
      proxy: "",
      auto_delete_history_24h: autoDeleteChecked,
    };

    configBlock.textContent = JSON.stringify(configObj, null, 2);
  }

  updateConfigJson();

  const inputsToTrack = [
    "simDownloadMode",
    "simEmbedMetadata",
    "simWriteSubtitles",
    "toggleAutoDeleteHistory",
  ];
  inputsToTrack.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", updateConfigJson);
      if (el.tagName === "SELECT") {
        el.addEventListener("input", updateConfigJson);
      }
    }
  });

  themeToggleBtn.addEventListener("click", () => {
    htmlElement.classList.add("theme-transitioning");

    const currentTheme = htmlElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    htmlElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("yt-downloader-theme", newTheme);

    updateConfigJson();

    themeToggleBtn.style.transform = "scale(0.9)";

    setTimeout(() => {
      themeToggleBtn.style.transform = "scale(1)";
    }, 150);

    setTimeout(() => {
      htmlElement.classList.remove("theme-transitioning");
    }, 450);
  });

  const isDesktop = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const navbar = document.getElementById("mainNavbar");
  const navIndicator = document.getElementById("navIndicator");
  const navMenu = document.getElementById("navMenu");
  let lastScrollY = window.scrollY;
  let scrollTicking = false;

  let isNavigating = false;
  let navigationTimeout;
  let isHoveringNavbar = false;

  if (isDesktop) {
    window.addEventListener(
      "mousemove",
      (e) => {
        if (e.clientY < 85) {
          isHoveringNavbar = true;
          if (navbar) {
            navbar.classList.remove("hidden-scroll");
          }
        } else {
          const navbarRect = navbar?.getBoundingClientRect();
          if (navbarRect) {
            if (
              e.clientX >= navbarRect.left &&
              e.clientX <= navbarRect.right &&
              e.clientY >= navbarRect.top &&
              e.clientY <= navbarRect.bottom
            ) {
              isHoveringNavbar = true;
            } else {
              isHoveringNavbar = false;
            }
          } else {
            isHoveringNavbar = false;
          }
        }
      },
      { passive: true },
    );
  }

  function updateNavIndicator() {
    if (!navIndicator || !navMenu) return;
    const activeLink = navMenu.querySelector(".nav-link.active");
    if (activeLink) {
      const activeRect = activeLink.getBoundingClientRect();
      const menuRect = navMenu.getBoundingClientRect();

      const left = activeRect.left - menuRect.left;
      const top = activeRect.top - menuRect.top;
      const width = activeRect.width;
      const height = activeRect.height;

      navIndicator.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      navIndicator.style.width = `${width}px`;
      navIndicator.style.height = `${height}px`;
      navIndicator.style.opacity = "1";
    } else {
      navIndicator.style.opacity = "0";
    }
  }

  function handleScroll() {
    const currentScrollY = window.scrollY;

    if (currentScrollY > 30) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }

    if (isNavigating || isHoveringNavbar) {
      navbar.classList.remove("hidden-scroll");
    } else {
      if (currentScrollY > lastScrollY && currentScrollY > 120) {
        navbar.classList.add("hidden-scroll");
      } else {
        navbar.classList.remove("hidden-scroll");
      }
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

  setTimeout(() => {
    handleScroll();
    updateNavIndicator();
  }, 100);

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
      isNavigating = true;
      if (navbar) {
        navbar.classList.remove("hidden-scroll");
      }
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
        if (navbar) {
          navbar.classList.remove("hidden-scroll");
        }
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

  const sidebarItems = document.querySelectorAll(".sidebar-item");
  const appTabPanels = document.querySelectorAll(".app-tab-panel");

  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
      sidebarItems.forEach((si) => si.classList.remove("active"));
      appTabPanels.forEach((panel) => panel.classList.remove("active"));

      item.classList.add("active");
      const targetTabId = item.getAttribute("data-tab");
      const targetPanel = document.getElementById(targetTabId);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });

  const startSimBtn = document.getElementById("startSimBtn");
  const simulationUrlInput = document.getElementById("simulationUrlInput");
  const simDownloadMode = document.getElementById("simDownloadMode");
  const simProcessPanel = document.getElementById("simProcessPanel");

  const simVideoTitle = document.getElementById("simVideoTitle");
  const simVideoChannel = document.getElementById("simVideoChannel");
  const simVideoDuration = document.getElementById("simVideoDuration");
  const simVideoViewCount = document.getElementById("simVideoViewCount");
  const simVideoFormat = document.getElementById("simVideoFormat");
  const simVideoThumbnail = document.getElementById("simVideoThumbnail");

  const progressStageLabel = document.getElementById("progressStageLabel");
  const progressPercentLabel = document.getElementById("progressPercentLabel");
  const simProgressFill = document.getElementById("simProgressFill");
  const simProgressSpeed = document.getElementById("simProgressSpeed");
  const simProgressETA = document.getElementById("simProgressETA");
  const simProgressSize = document.getElementById("simProgressSize");
  const simProgressResolution = document.getElementById(
    "simProgressResolution",
  );
  const simTickerText = document.getElementById("simTickerText");

  const simulationTerminal = document.getElementById("simulationTerminal");
  const sidebarQueueCount = document.getElementById("sidebarQueueCount");
  const simQueueTableBody = document.getElementById("simQueueTableBody");
  const simHistoryTableBody = document.getElementById("simHistoryTableBody");

  let isSimulatorRunning = false;
  let currentDownloadId = null;
  let eventSource = null;

  function resetDownloadUI() {
      isSimulatorRunning = false;
      currentDownloadId = null;
      startSimBtn.disabled = false;
      startSimBtn.style.opacity = "1";
      startSimBtn.classList.remove("btn-danger");
      startSimBtn.innerHTML = '<i data-lucide="download"></i> <span>START DOWNLOAD</span>';
      
      sidebarQueueCount.textContent = "0";
      sidebarQueueCount.style.background = "var(--border)";
      
      const progressFill = document.getElementById("simProgressFill");
      const progressText = document.getElementById("simProgressText");
      if (progressFill) progressFill.style.width = "0%";
      if (progressText) progressText.textContent = "0%";
      
      const speedStr = document.getElementById("simSpeedStr");
      const etaStr = document.getElementById("simEtaStr");
      const sizeStr = document.getElementById("simSizeStr");
      if (speedStr) speedStr.textContent = "0 KB/s";
      if (etaStr) etaStr.textContent = "--:--";
      if (sizeStr) sizeStr.textContent = "0 MB";

      simQueueTableBody.innerHTML = `
        <tr class="empty-row new-row-fade">
          <td colspan="5">
            <div class="empty-state-cell">
              <i data-lucide="list-video"></i>
              <p>No active downloads in queue. Add URLs in the Dashboard tab.</p>
            </div>
          </td>
        </tr>
      `;
      if (typeof lucide !== "undefined") {
          lucide.createIcons();
      }
  }

  function connectSSE() {
    if (eventSource) return;
    eventSource = new EventSource('/api/stream');
    
    eventSource.addEventListener("DOWNLOAD_STARTED", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.downloadId) currentDownloadId = data.downloadId;
      } catch(err) {}

      isSimulatorRunning = true;
      startSimBtn.disabled = false;
      startSimBtn.style.opacity = "1";
      startSimBtn.classList.add("btn-danger");
      startSimBtn.innerHTML = '<i data-lucide="square"></i> <span>STOP DOWNLOAD</span>';
      if (typeof lucide !== "undefined") lucide.createIcons();
      
      simProcessPanel.classList.remove("hidden");
      
      sidebarQueueCount.textContent = "1";
      sidebarQueueCount.style.background = "var(--primary)";
      
      simVideoTitle.textContent = "Fetching metadata...";
      simVideoChannel.textContent = "...";
      simVideoDuration.textContent = "Duration: ...";
      simVideoViewCount.textContent = "Views: ...";
      
      const selectedMode = simDownloadMode.options[simDownloadMode.selectedIndex].text;
      simVideoFormat.textContent = "Target: " + selectedMode;
      
      simQueueTableBody.innerHTML = `
        <tr id="activeQueueSimRow" class="new-row-fade">
          <td><span class="video-title-bold" id="queueTitleSpan">Pending...</span></td>
          <td><span class="font-mono">${simDownloadMode.value}</span></td>
          <td><span class="badge badge-warning" id="queueStatusBadge">Starting...</span></td>
          <td id="queueSizeCell">Calculating...</td>
          <td>
            <div class="progress-track" style="height:4px; width:100px; margin-bottom:0;">
              <div class="progress-fill" id="queueProgressFill" style="width: 0%"></div>
            </div>
          </td>
        </tr>
      `;
      appendTerminalLine("[INFO] Download started. Handshaking with backend...", "t-blue");
    });
    
    eventSource.addEventListener("METADATA_READY", (e) => {
      try {
        const data = JSON.parse(e.data);
        simVideoTitle.textContent = data.title || "Unknown";
        simVideoChannel.textContent = data.uploader || "Unknown";
        
        let dur = parseInt(data.duration) || 0;
        let mins = Math.floor(dur / 60);
        let secs = dur % 60;
        let timeStr = mins + ":" + (secs < 10 ? "0" : "") + secs;
        simVideoDuration.textContent = "Duration: " + timeStr;
        
        const durationBadge = document.getElementById("simThumbDurationOverlay");
        if (durationBadge) durationBadge.textContent = timeStr;
        
        const overlays = document.getElementById("simThumbOverlays");
        if (overlays) overlays.classList.remove("hidden");
        
        const hdBadge = document.getElementById("simThumbHDBadge");
        const selectedMode = simDownloadMode.options[simDownloadMode.selectedIndex].text;
        if (hdBadge && (selectedMode.includes("1080") || selectedMode.includes("1440") || selectedMode.includes("4K") || selectedMode.includes("Best"))) {
            hdBadge.classList.remove("hidden");
        } else if (hdBadge) {
            hdBadge.classList.add("hidden");
        }
        
        const verifiedBadge = document.getElementById("simChannelVerified");
        if (verifiedBadge) verifiedBadge.classList.remove("hidden");
        
        simVideoViewCount.textContent = "Views: " + (data.view_count || "Unknown");
        
        const fallback = document.getElementById("simThumbFallback");
        const loading = document.getElementById("simThumbLoading");
        const img = document.getElementById("simThumbImg");
        if (fallback) fallback.classList.add("hidden");
        if (img) { img.classList.remove("show"); img.classList.add("hidden"); }
        if (loading) loading.classList.remove("hidden");
        
        const queueTitleSpan = document.getElementById("queueTitleSpan");
        if (queueTitleSpan) queueTitleSpan.textContent = data.title || "Unknown";
        
        if (data.activeCodec && simProgressResolution) {
          simProgressResolution.textContent = data.activeCodec;
        }
        
        showToast("Metadata Ready", `Video information fetched for "${data.title}"`, "info");
        appendTerminalLine("[INFO] Video ID matched: extracting tags and structures.", "t-blue");
      } catch(err) {
        console.error(err);
      }
    });
    
    eventSource.addEventListener("THUMBNAIL_READY", (e) => {
      try {
        const data = JSON.parse(e.data);
        const loading = document.getElementById("simThumbLoading");
        const img = document.getElementById("simThumbImg");
        const fallback = document.getElementById("simThumbFallback");
        
        if (img && data.path) {
          img.src = data.path;
          img.onload = () => {
             if (loading) loading.classList.add("hidden");
             img.classList.remove("hidden");
             setTimeout(() => img.classList.add("show"), 50);
          };
          img.onerror = () => {
             if (loading) loading.classList.add("hidden");
             if (fallback) fallback.classList.remove("hidden");
          };
        } else {
          if (loading) loading.classList.add("hidden");
          if (fallback) fallback.classList.remove("hidden");
        }
      } catch(err) {
        console.error(err);
      }
    });
    
    let progressAnimationFrame = null;
    eventSource.addEventListener("PROGRESS", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (progressAnimationFrame) cancelAnimationFrame(progressAnimationFrame);
        progressAnimationFrame = requestAnimationFrame(() => {
          if (progressStageLabel) progressStageLabel.textContent = "Downloading " + (data.streamType || "Stream") + "...";
          if (progressPercentLabel) progressPercentLabel.textContent = data.percent + "%";
          if (simProgressFill) simProgressFill.style.width = data.percent + "%";
          if (simProgressSpeed) simProgressSpeed.textContent = data.speed;
          if (simProgressETA) simProgressETA.textContent = data.eta;
          if (simProgressSize) simProgressSize.textContent = data.downloadedSize + " / " + data.totalSize;
          if (simProgressResolution && data.activeCodec) simProgressResolution.textContent = data.activeCodec;
          if (simTickerText) simTickerText.textContent = "Current File: " + data.currentFile;
        });
      } catch(err) {}
    });
    
    eventSource.addEventListener("STATUS", (e) => {
      try {
        const data = JSON.parse(e.data);
        appendTerminalLine(data.message, "t-blue");
      } catch(err) {}
    });
    
    eventSource.addEventListener("WARNING", (e) => {
      try {
        const data = JSON.parse(e.data);
        appendTerminalLine(data.message, "t-yellow");
      } catch(err) {}
    });
    
    eventSource.addEventListener("ERROR", (e) => {
      try {
        const data = JSON.parse(e.data);
        appendTerminalLine(data.message, "t-red");
        showToast("Error", data.message, "error");
      } catch(err) {}
    });
    
    eventSource.addEventListener("DOWNLOAD_COMPLETE", (e) => {
      resetDownloadUI();
      
      try {
        const data = JSON.parse(e.data);
        showToast("Download Completed", `Successfully downloaded "${data.title}"`, "success");
        if (typeof confetti === "function") {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#dc2626", "#ef4444", "#f87171", "#ffffff"] });
        }
      } catch(err) {}
    });
    
    eventSource.addEventListener("DOWNLOAD_FAILED", (e) => {
      resetDownloadUI();
      
      try {
        const data = JSON.parse(e.data);
        showToast("Download Failed", data.message, "error");
        appendTerminalLine("[ERROR] " + data.message, "t-red");
      } catch(err) {}
    });
  }

  connectSSE();

  const detectClipboardBtn = document.getElementById("detectClipboardBtn");
  detectClipboardBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.includes("http") || text.includes("youtu"))) {
          simulationUrlInput.value = text;
          detectClipboardBtn.style.color = "var(--primary)";
          appendTerminalLine("[INFO] Ingesting clipboard contents: " + text, "t-blue");
          setTimeout(() => { detectClipboardBtn.style.color = "var(--text-secondary)"; }, 800);
      } else {
          showToast("Clipboard Empty", "No valid URL found in clipboard.", "warning");
      }
    } catch(err) {
      showToast("Clipboard Error", "Could not read clipboard.", "error");
    }
  });

  if (startSimBtn && isDesktop) {
    startSimBtn.classList.add("magnetic-btn");
    startSimBtn.addEventListener("mousemove", (e) => {
      const rect = startSimBtn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      startSimBtn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    startSimBtn.addEventListener("mouseleave", () => {
      startSimBtn.style.transform = `translate(0px, 0px)`;
    });
  }

  startSimBtn.addEventListener("click", () => {
    if (isSimulatorRunning) {
      startSimBtn.disabled = true;
      startSimBtn.style.opacity = "0.7";
      startSimBtn.innerHTML = '<i data-lucide="loader-2" class="spin-animation"></i> <span>Stopping...</span>';
      if (typeof lucide !== "undefined") lucide.createIcons();
      
      if (currentDownloadId) {
          fetch('/api/download/cancel', {
              method: 'POST',
              body: JSON.stringify({ downloadId: currentDownloadId })
          }).then(r => r.json()).then(res => {
              if (!res.success) {
                  showToast("Error", "Could not cancel download.", "error");
                  resetDownloadUI();
              }
          }).catch(err => {
              showToast("Error", "Could not cancel download.", "error");
              resetDownloadUI();
          });
      }
      return;
    }

    const targetUrl = simulationUrlInput.value.trim();
    if (!targetUrl) {
      appendTerminalLine(
        "[ERROR] Missing required parameter: Target URL input is blank.",
        "t-yellow"
      );
      showToast("Download Failed", "Target URL is required.", "error");
      return;
    }

    const modeValue = simDownloadMode.value;
    let reqMode, reqRes, reqAudio;
    
    if (modeValue === "1") { reqMode = "audio"; reqAudio = "mp3"; reqRes = null; }
    else if (modeValue === "2") { reqMode = "audio"; reqAudio = "flac"; reqRes = null; }
    else if (modeValue === "3") { reqMode = "video"; reqRes = "best"; reqAudio = null; }
    else if (modeValue === "4") { reqMode = "video"; reqRes = "1080"; reqAudio = null; }
    else if (modeValue === "5") { reqMode = "video"; reqRes = "1440"; reqAudio = null; }
    else if (modeValue === "6") { reqMode = "video"; reqRes = "2160"; reqAudio = null; }
    else { reqMode = "video"; reqRes = "best"; reqAudio = null; }

    if (simProgressResolution) {
      simProgressResolution.textContent = (reqMode === "audio") ? "--" : "-- • --";
    }

    const payload = {
        url: targetUrl,
        mode: reqMode,
        resolution: reqRes,
        audioFormat: reqAudio,
        metadata: document.getElementById("simEmbedMetadata")?.checked ?? true,
        subtitles: document.getElementById("simWriteSubtitles")?.checked ?? true
    };
    
    fetch('/api/download', {
        method: 'POST',
        body: JSON.stringify(payload)
    }).catch(err => {
        showToast("Error", "Could not reach backend.", "error");
    });
  });

  function appendTerminalLine(text, cssClass) {
    if (!simulationTerminal) return;
    const line = document.createElement("div");
    line.className = "terminal-line";

    let formattedText = text;
    formattedText = formattedText.replace(/\x1B\[91m/g, '<span class="t-red">');
    formattedText = formattedText.replace(/\x1B\[92m/g, '<span class="t-green">');
    formattedText = formattedText.replace(/\x1B\[93m/g, '<span class="t-yellow">');
    formattedText = formattedText.replace(/\x1B\[94m/g, '<span class="t-blue">');
    formattedText = formattedText.replace(/\x1B\[95m/g, '<span class="t-purple">');
    formattedText = formattedText.replace(/\x1B\[96m/g, '<span class="t-cyan">');
    formattedText = formattedText.replace(/\x1B\[1m/g, '<b>');
    formattedText = formattedText.replace(/\x1B\[0m/g, '</span></b>');
    formattedText = formattedText.replace(/\x1B\[G/g, '');
    formattedText = formattedText.replace(/\x1B\[2K/g, '');
    formattedText = formattedText.replace(/\r/g, '');
    
    // Some lines might have closing spans but not opening spans if they were split,
    // but the above is a naive implementation. For terminal output, it usually works.
    
    if (text.includes("[INFO]")) {
      line.innerHTML =
        `<span class="t-blue">[INFO]</span> ` + formattedText.replace("[INFO]", "");
    } else if (text.includes("[SUCCESS]")) {
      line.innerHTML =
        `<span class="t-green">[SUCCESS]</span> ` +
        formattedText.replace("[SUCCESS]", "");
    } else if (text.includes("[WARNING]")) {
      line.innerHTML =
        `<span class="t-yellow">[WARNING]</span> ` +
        formattedText.replace("[WARNING]", "");
    } else {
      line.innerHTML = `<span class="${cssClass || 't-blue'}"></span> ` + formattedText;
    }

    simulationTerminal.appendChild(line);
    simulationTerminal.scrollTop = simulationTerminal.scrollHeight;
  }

  // ==========================================================================
  // UNIFIED DOWNLOAD HISTORY DATA STORE (Single Source of Truth)
  // ==========================================================================
  // Clean Core Downloader State
  appendTerminalLine("[INFO] VidForge Engine initialized.", "t-blue");

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
      code: "import java.io.*;\nimport java.nio.file.*;\nimport java.util.*;\nimport java.util.logging.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        ConsoleRenderer.printBanner();\n        // Option menu and downloader orchestration\n    }\n}",
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
      code: 'public static class ProgressParser {\n    private static final Pattern PROGRESS_PATTERN = Pattern.compile("\\\\\\\[download\\\\\\\]\\\\\\\\s+([\\\\\\\\d\\\\\\\\.]+%)\\\\\\\\s+of\\\\\\\\s+([^\\\\\\\\s]+)\\\\\\\\s+at\\\\\\\\s+([^\\\\\\\\s]+)\\\\\\\\s+ETA\\\\\\\\s+([^\\\\\\\\s]+)");\n    public static void parseLine(String line, ProgressBar bar, DownloadStatistics stats) {\n        // Real-time regex matching and status parsing\n    }\n}',
    },
    DownloadStatistics: {
      title: "Runtime Ingestion Statistics",
      desc: "Monitors file sizes, elapsed times, target resolution formats, and destination folder parameters, displaying a formatted completion summary screen upon success.",
      code: 'public static class DownloadStatistics {\n    public long startTime;\n    public long endTime;\n    public String title = "Unknown";\n    public String totalSize = "Unknown";\n    public String getElapsedTime() {\n        long duration = endTime - startTime;\n        return String.format("%02d:%02d", duration / 60000, (duration % 60000) / 1000);\n    }\n}',
    },
    YouTubeDownloader: {
      title: "Subprocess Execution & Resiliency Handler",
      desc: "Launches the underlying yt-dlp binary as an external ProcessBuilder. Automatically falls back to decrypted browser cookies across Chrome, Edge, Firefox, and Brave if blocked.",
      code: "public static class YouTubeDownloader {\n    public Map<String, String> getMetadata(String url) {\n        // Runs yt-dlp --dump-json to extract details\n    }\n    public void download(String url, String mode, String resolution, String audioFmt, Map<String, String> meta) {\n        // Configures command line arguments and runs ProcessBuilder\n    }\n}",
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

  registerCopyButton("btnCopyConfigJson", "configJsonCodeBlock");
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

          appendTerminalLine(
            "[INFO] Ingested URL via system Drag-and-Drop stream: " +
              extractedUrl.trim(),
            "t-green",
          );
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

  const footerStatValues = document.querySelectorAll(".footer-stat-value");
  let footerStatsAnimated = false;

  const footerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const footer = document.getElementById("mainFooter");
          if (footer) {
            footer.classList.add("revealed");
          }

          if (!footerStatsAnimated) {
            animateFooterStats();
            footerStatsAnimated = true;
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

  function animateFooterStats() {
    footerStatValues.forEach((stat) => {
      const target = parseFloat(stat.getAttribute("data-target"));
      const suffix = stat.getAttribute("data-suffix") || "";
      const decimals = parseInt(stat.getAttribute("data-decimal")) || 0;
      const duration = 2000;
      const startTime = performance.now();

      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeProgress = progress * (2 - progress);
        const currentValue = easeProgress * target;

        stat.textContent = currentValue.toFixed(decimals) + suffix;

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          stat.textContent = target.toFixed(decimals) + suffix;
        }
      }

      requestAnimationFrame(updateCounter);
    });
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
