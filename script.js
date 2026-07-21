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
  let simulatedItemCounter = 0;

  const videoMockDatabase = [
    {
      title: "Lofi Girl - Synthwave Radio (Beats to Chill/Study to)",
      channel: "Lofi Girl",
      duration: "Live Stream",
      views: "18.4M views",
      thumb:
        "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=60",
    },
    {
      title: "How I Built an Audio Synthesizer in Java in 24 hours",
      channel: "DevCraft Diaries",
      duration: "14:25",
      views: "124K views",
      thumb:
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=60",
    },
    {
      title: "Framer Motion Advanced Animation Tutorial 2026",
      channel: "DesignCode",
      duration: "32:10",
      views: "412K views",
      thumb:
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&auto=format&fit=crop&q=60",
    },
    {
      title: "Rick Astley - Never Gonna Give You Up (Official Video)",
      channel: "Rick Astley",
      duration: "3:32",
      views: "1.4B views",
      thumb:
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=60",
    },
  ];

  const detectClipboardBtn = document.getElementById("detectClipboardBtn");
  detectClipboardBtn.addEventListener("click", () => {
    const urls = [
      "https://www.youtube.com/watch?v=LofiGirlSynthwave",
      "https://www.youtube.com/watch?v=DevSynth24h",
      "https://www.youtube.com/watch?v=FramerAdvanced2026",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ];
    const randomIndex = Math.floor(Math.random() * urls.length);
    simulationUrlInput.value = urls[randomIndex];

    detectClipboardBtn.style.color = "var(--primary)";
    appendTerminalLine(
      "[INFO] Ingesting clipboard contents: " + urls[randomIndex],
      "t-blue",
    );
    setTimeout(() => {
      detectClipboardBtn.style.color = "var(--text-secondary)";
    }, 800);
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
      appendTerminalLine(
        "[WARNING] Download task currently in progress. Queue locked.",
        "t-yellow",
      );
      showToast(
        "Queue Locked",
        "A download task is already in progress.",
        "warning",
      );
      return;
    }

    const targetUrl = simulationUrlInput.value.trim();
    if (!targetUrl) {
      appendTerminalLine(
        "[ERROR] Missing required parameter: Target URL input is blank.",
        "t-yellow",
      );
      showToast(
        "Download Failed to Start",
        "Missing required parameter: Target URL input is blank.",
        "error",
      );
      return;
    }

    isSimulatorRunning = true;
    startSimBtn.disabled = true;
    startSimBtn.style.opacity = "0.5";
    simProcessPanel.classList.remove("hidden");

    let pickedVideo = videoMockDatabase[3];
    if (targetUrl.includes("Lofi") || targetUrl.includes("lofi")) {
      pickedVideo = videoMockDatabase[0];
    } else if (targetUrl.includes("Synth") || targetUrl.includes("synth")) {
      pickedVideo = videoMockDatabase[1];
    } else if (targetUrl.includes("Framer") || targetUrl.includes("framer")) {
      pickedVideo = videoMockDatabase[2];
    } else {
      pickedVideo =
        videoMockDatabase[Math.floor(Math.random() * videoMockDatabase.length)];
    }

    showToast(
      "Download Started",
      `Initialized yt-dlp pipeline for "${pickedVideo.title}"`,
      "info",
    );

    simVideoTitle.textContent = pickedVideo.title;
    simVideoChannel.textContent = pickedVideo.channel;
    simVideoDuration.textContent = "Duration: " + pickedVideo.duration;
    simVideoViewCount.textContent = "Views: " + pickedVideo.views;

    const selectedMode =
      simDownloadMode.options[simDownloadMode.selectedIndex].text;
    simVideoFormat.textContent = "Target: " + selectedMode;
    simVideoThumbnail.style.backgroundImage = `url('${pickedVideo.thumb}')`;

    sidebarQueueCount.textContent = "1";
    sidebarQueueCount.style.background = "var(--primary)";

    simQueueTableBody.innerHTML = `
      <tr id="activeQueueSimRow" class="new-row-fade">
        <td><span class="video-title-bold">${pickedVideo.title}</span></td>
        <td><span class="font-mono">${simDownloadMode.value}</span></td>
        <td><span class="badge badge-warning" id="queueStatusBadge">Downloading...</span></td>
        <td id="queueSizeCell">Calculating...</td>
        <td>
          <div class="progress-track" style="height:4px; width:100px; margin-bottom:0;">
            <div class="progress-fill" id="queueProgressFill" style="width: 0%"></div>
          </div>
        </td>
      </tr>
    `;

    runDownloadStages(pickedVideo);
  });

  function runDownloadStages(video) {
    const stages = [
      {
        progress: 5,
        stage: "Parsing URL arguments...",
        speed: "0.0 MB/s",
        eta: "--:--",
        size: "Calculating...",
        log: "[INFO] Parsing raw ingestion command parameters. Validating youtube.com matches...",
      },
      {
        progress: 12,
        stage: "Resolving safe browser session...",
        speed: "0.0 MB/s",
        eta: "00:15",
        size: "Checking...",
        log: "[INFO] Handshaking secure player indices. Decrypting Chrome browser cookies fallbacks...",
      },
      {
        progress: 24,
        stage: "Querying video metadata...",
        speed: "124 KB/s",
        eta: "00:12",
        size: "Checking...",
        log: "[INFO] Video ID matched: extracting tags, description blocks, and structural JSON maps.",
      },
      {
        progress: 38,
        stage: "Fetching video chunks...",
        speed: "34.2 MB/s",
        eta: "00:08",
        size: "184.2 MB",
        log: "[INFO] Resolving AVC1/VP9 video format. Initiating thread segment download pipeline...",
      },
      {
        progress: 56,
        stage: "Streaming video stream...",
        speed: "41.8 MB/s",
        eta: "00:05",
        size: "184.2 MB",
        log: "[INFO] Chunk writing index 142/250 - verified byte range successfully.",
      },
      {
        progress: 72,
        stage: "Extracting highest audio codec...",
        speed: "22.1 MB/s",
        eta: "00:02",
        size: "184.2 MB",
        log: "[INFO] Video chunk download completed. Downloading audio segments: Opus high-fidelity...",
      },
      {
        progress: 85,
        stage: "Merging audio & video channels...",
        speed: "0.0 MB/s",
        eta: "00:01",
        size: "192.5 MB",
        log: "[INFO] Linking post-processors: FFmpeg mapping starting for video track + audio track...",
      },
      {
        progress: 92,
        stage: "Embedding covers & tags...",
        speed: "0.0 MB/s",
        eta: "00:00",
        size: "192.8 MB",
        log: "[INFO] Mapping album tags, thumbnail covers, lyrics frames and chapter blocks...",
      },
      {
        progress: 98,
        stage: "Finishing archiving tasks...",
        speed: "0.0 MB/s",
        eta: "00:00",
        size: "192.8 MB",
        log: "[INFO] Deleting temporary files on disk. Committing downloaded details to persistent logs...",
      },
      {
        progress: 100,
        stage: "Archive Completed successfully!",
        speed: "0.0 MB/s",
        eta: "00:00",
        size: "192.8 MB",
        log:
          "[SUCCESS] media file saved as: downloads/" +
          video.title.substring(0, 20) +
          "...",
      },
    ];

    let currentStageIndex = 0;

    function executeNextStage() {
      if (currentStageIndex >= stages.length) {
        isSimulatorRunning = false;
        startSimBtn.disabled = false;
        startSimBtn.style.opacity = "1";
        sidebarQueueCount.textContent = "0";
        sidebarQueueCount.style.background = "var(--border)";

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

        appendDownloadToHistory(video, stages[stages.length - 1].size);
        showToast(
          "Download Completed",
          `Successfully downloaded and archived "${video.title}"`,
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
        return;
      }

      const cs = stages[currentStageIndex];

      progressStageLabel.textContent = cs.stage;
      progressPercentLabel.textContent = cs.progress + "%";
      simProgressFill.style.width = cs.progress + "%";
      simProgressSpeed.textContent = cs.speed;
      simProgressETA.textContent = cs.eta;
      simProgressSize.textContent = cs.size;
      simTickerText.textContent = cs.log;

      const queueProgressFill = document.getElementById("queueProgressFill");
      const queueStatusBadge = document.getElementById("queueStatusBadge");
      const queueSizeCell = document.getElementById("queueSizeCell");
      if (queueProgressFill) queueProgressFill.style.width = cs.progress + "%";
      if (queueSizeCell) queueSizeCell.textContent = cs.size;
      if (queueStatusBadge && cs.progress === 100) {
        queueStatusBadge.className = "badge badge-success";
        queueStatusBadge.textContent = "Finished";
      }

      const logClass = cs.log.includes("[SUCCESS]") ? "t-green" : "t-blue";
      appendTerminalLine(cs.log, logClass);

      currentStageIndex++;
      const stageDelay = cs.progress === 85 || cs.progress === 92 ? 1800 : 900;
      setTimeout(executeNextStage, stageDelay);
    }

    executeNextStage();
  }

  function appendTerminalLine(text, cssClass) {
    if (!simulationTerminal) return;
    const line = document.createElement("div");
    line.className = "terminal-line";

    if (text.includes("[INFO]")) {
      line.innerHTML =
        `<span class="t-blue">[INFO]</span> ` + text.replace("[INFO]", "");
    } else if (text.includes("[SUCCESS]")) {
      line.innerHTML =
        `<span class="t-green">[SUCCESS]</span> ` +
        text.replace("[SUCCESS]", "");
    } else if (text.includes("[WARNING]")) {
      line.innerHTML =
        `<span class="t-yellow">[WARNING]</span> ` +
        text.replace("[WARNING]", "");
    } else {
      line.innerHTML = `<span class="${cssClass}">[INFO]</span> ` + text;
    }

    simulationTerminal.appendChild(line);
    simulationTerminal.scrollTop = simulationTerminal.scrollHeight;
  }

  function appendDownloadToHistory(video, size) {
    const today = new Date().toISOString().replace("T", " ").substring(0, 16);
    const isAudio =
      simDownloadMode.value.includes("mp3") ||
      simDownloadMode.value.includes("flac");
    const formatBadgeClass = isAudio ? "badge-success" : "badge-primary";
    const formatLabel = isAudio
      ? "Audio (" + simDownloadMode.value.toUpperCase() + ")"
      : "Video (" + simDownloadMode.value.toUpperCase() + ")";

    const autoDeleteChecked =
      document.getElementById("toggleAutoDeleteHistory")?.checked ?? true;
    let autoDeleteLabelHtml = "";
    if (autoDeleteChecked) {
      autoDeleteLabelHtml = `<div style="margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; font-size: 10px; padding: 2px 6px; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.25); color: var(--primary); border-radius: 4px;" title="This completed download is scheduled to be auto-purged in 24 hours."><i data-lucide="clock" style="width: 10px; height: 10px;"></i> Auto-delete 24h</div>`;
    }

    const newRow = document.createElement("tr");
    newRow.className = "new-row-fade row-completion-glow";
    newRow.innerHTML = `
      <td style="text-align: center; vertical-align: middle;">
        <label class="custom-checkbox-container">
          <input type="checkbox" class="history-item-checkbox">
          <span class="custom-checkbox-mark"></span>
        </label>
      </td>
      <td>
        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
          <span class="video-title-bold">${video.title}</span>
          ${autoDeleteLabelHtml}
        </div>
      </td>
      <td><span class="badge ${formatBadgeClass}">${formatLabel}</span></td>
      <td>${size}</td>
      <td>${today}</td>
      <td>
        <div class="action-btn-cell">
          <button class="btn-table-action" title="Open Folder"><i data-lucide="folder-open"></i></button>
          <button class="btn-table-action" title="Re-download"><i data-lucide="refresh-cw"></i></button>
          <button class="btn-table-action btn-delete-row" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;

    if (simHistoryTableBody.firstChild) {
      simHistoryTableBody.insertBefore(newRow, simHistoryTableBody.firstChild);
    } else {
      simHistoryTableBody.appendChild(newRow);
    }

    if (historyEmptyRow) {
      historyEmptyRow.classList.add("hidden");
    }
    if (historySelectAll) {
      historySelectAll.checked = false;
    }
    updateBulkActionsBar();

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    appendTerminalLine(
      "[SUCCESS] Download completed successfully. Local manifest updated.",
      "t-green",
    );
  }

  const historySearch = document.getElementById("historySearch");
  const historyFilterFormat = document.getElementById("historyFilterFormat");

  function filterHistoryRows() {
    const query = historySearch.value.toLowerCase().trim();
    const formatFilter = historyFilterFormat.value;
    const rows = simHistoryTableBody.querySelectorAll("tr");

    rows.forEach((row) => {
      if (row.classList.contains("empty-row")) return;

      const titleText = row
        .querySelector(".video-title-bold")
        .textContent.toLowerCase();
      const badgeText = row.querySelector(".badge").textContent.toLowerCase();

      let matchesSearch = titleText.includes(query);
      let matchesFormat = true;

      if (formatFilter === "mp3") {
        matchesFormat =
          badgeText.includes("audio") || badgeText.includes("mp3");
      } else if (formatFilter === "mp4") {
        matchesFormat =
          badgeText.includes("video") ||
          badgeText.includes("mp4") ||
          badgeText.includes("1080p") ||
          badgeText.includes("4k");
      }

      if (matchesSearch && matchesFormat) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });

    if (historySelectAll) {
      historySelectAll.checked = false;
    }
    updateBulkActionsBar();
  }

  if (historySearch) historySearch.addEventListener("input", filterHistoryRows);
  if (historyFilterFormat)
    historyFilterFormat.addEventListener("change", filterHistoryRows);

  const historySelectAll = document.getElementById("historySelectAll");
  const bulkActionsBar = document.getElementById("historyBulkActionsBar");
  const selectedCountBadge = document.getElementById(
    "historySelectedCountBadge",
  );
  const btnBulkReDownload = document.getElementById("btnBulkReDownload");
  const btnBulkDelete = document.getElementById("btnBulkDelete");
  const historyEmptyRow = document.getElementById("historyEmptyRow");

  function updateBulkActionsBar() {
    if (!simHistoryTableBody || !bulkActionsBar || !selectedCountBadge) return;

    const checkedBoxes = simHistoryTableBody.querySelectorAll(
      ".history-item-checkbox:checked",
    );
    const totalCount = checkedBoxes.length;

    selectedCountBadge.textContent = totalCount;

    if (totalCount > 1) {
      bulkActionsBar.classList.remove("hidden");
    } else {
      bulkActionsBar.classList.add("hidden");
    }

    const rows = simHistoryTableBody.querySelectorAll("tr");
    rows.forEach((row) => {
      if (row.classList.contains("empty-row")) return;
      const cb = row.querySelector(".history-item-checkbox");
      if (cb && cb.checked) {
        row.classList.add("selected-row");
      } else {
        row.classList.remove("selected-row");
      }
    });

    if (historySelectAll) {
      const visibleCheckboxes = Array.from(
        simHistoryTableBody.querySelectorAll("tr"),
      )
        .filter(
          (tr) =>
            tr.style.display !== "none" && !tr.classList.contains("empty-row"),
        )
        .map((tr) => tr.querySelector(".history-item-checkbox"))
        .filter(Boolean);

      if (
        visibleCheckboxes.length > 0 &&
        visibleCheckboxes.every((cb) => cb.checked)
      ) {
        historySelectAll.checked = true;
      } else {
        historySelectAll.checked = false;
      }
    }
  }

  if (historySelectAll) {
    historySelectAll.addEventListener("change", () => {
      const isChecked = historySelectAll.checked;
      const visibleRows = Array.from(
        simHistoryTableBody.querySelectorAll("tr"),
      ).filter(
        (tr) =>
          tr.style.display !== "none" && !tr.classList.contains("empty-row"),
      );

      visibleRows.forEach((tr) => {
        const cb = tr.querySelector(".history-item-checkbox");
        if (cb) {
          cb.checked = isChecked;
        }
      });
      updateBulkActionsBar();
    });
  }

  if (simHistoryTableBody) {
    simHistoryTableBody.addEventListener("change", (e) => {
      if (e.target.classList.contains("history-item-checkbox")) {
        updateBulkActionsBar();
      }
    });
  }

  function checkHistoryEmptyState() {
    if (!simHistoryTableBody || !historyEmptyRow) return;
    const rows = Array.from(simHistoryTableBody.querySelectorAll("tr")).filter(
      (tr) => !tr.classList.contains("empty-row"),
    );

    if (rows.length === 0) {
      historyEmptyRow.classList.remove("hidden");
    } else {
      historyEmptyRow.classList.add("hidden");
    }
  }

  if (simHistoryTableBody) {
    simHistoryTableBody.addEventListener("click", (e) => {
      const actionBtn = e.target.closest(".btn-table-action");
      if (!actionBtn) return;

      const row = actionBtn.closest("tr");
      const titleElement = row.querySelector(".video-title-bold");
      if (!titleElement) return;
      const titleText = titleElement.textContent;

      if (
        actionBtn.title === "Re-download" ||
        actionBtn.querySelector('[data-lucide="refresh-cw"]') ||
        actionBtn.innerHTML.includes("refresh-cw")
      ) {
        triggerSingleReDownload(titleText);
      } else if (
        actionBtn.title === "Open Folder" ||
        actionBtn.querySelector('[data-lucide="folder-open"]') ||
        actionBtn.innerHTML.includes("folder-open")
      ) {
        triggerOpenFolder(row, titleText);
      } else if (
        actionBtn.title === "Delete" ||
        actionBtn.querySelector('[data-lucide="trash-2"]') ||
        actionBtn.innerHTML.includes("trash-2")
      ) {
        triggerSingleDelete(row, titleText);
      }
    });
  }

  function triggerSingleReDownload(title) {
    appendTerminalLine(
      "[INFO] Initiating re-download simulation for: " + title,
      "t-blue",
    );

    simulationUrlInput.value =
      "https://www.youtube.com/watch?v=" +
      title.replace(/[^a-zA-Z0-9]/g, "").substring(0, 11);

    const dashboardTabBtn = document.querySelector(
      '.sidebar-item[data-tab="tab-dashboard"]',
    );
    if (dashboardTabBtn) dashboardTabBtn.click();

    setTimeout(() => {
      startSimBtn.click();
    }, 400);
  }

  function triggerOpenFolder(row, title) {
    row.style.transition = "background-color 0.15s ease";
    row.style.backgroundColor = "rgba(var(--primary-rgb), 0.15)";

    setTimeout(() => {
      row.style.backgroundColor = "";
      updateBulkActionsBar();
    }, 500);

    appendTerminalLine(
      "[SUCCESS] Opening local media folder: ./downloads/" +
        title.substring(0, 20).replace(/\s+/g, "_") +
        "/",
      "t-green",
    );
  }

  function triggerSingleDelete(row, title) {
    appendTerminalLine(
      "[INFO] Pruning single record from history manifest: " + title,
      "t-blue",
    );

    row.style.transition = "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
    row.style.opacity = "0";
    row.style.transform = "translateX(-20px)";

    setTimeout(() => {
      row.remove();
      checkHistoryEmptyState();
      updateBulkActionsBar();
      appendTerminalLine(
        "[SUCCESS] Successfully pruned entry: " + title,
        "t-green",
      );
      showToast(
        "Record Deleted",
        `Successfully removed "${title}" from history.`,
        "success",
      );
    }, 400);
  }

  if (btnBulkDelete) {
    btnBulkDelete.addEventListener("click", () => {
      const checkedRows = Array.from(
        simHistoryTableBody.querySelectorAll("tr"),
      ).filter((tr) => {
        const cb = tr.querySelector(".history-item-checkbox");
        return cb && cb.checked;
      });

      if (checkedRows.length === 0) return;

      appendTerminalLine(
        "[INFO] Bulk deleting " +
          checkedRows.length +
          " selected records from history manifest...",
        "t-blue",
      );

      checkedRows.forEach((row) => {
        row.style.transition = "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
        row.style.opacity = "0";
        row.style.transform = "translateX(-20px)";

        setTimeout(() => {
          row.remove();
          checkHistoryEmptyState();
        }, 400);
      });

      setTimeout(() => {
        appendTerminalLine(
          "[SUCCESS] Successfully pruned history manifest. " +
            checkedRows.length +
            " entries removed securely.",
          "t-green",
        );
        if (historySelectAll) historySelectAll.checked = false;
        updateBulkActionsBar();
        showToast(
          "Records Deleted",
          `Successfully deleted ${checkedRows.length} items from history.`,
          "success",
        );
      }, 450);
    });
  }

  if (btnBulkReDownload) {
    btnBulkReDownload.addEventListener("click", () => {
      const checkedRows = Array.from(
        simHistoryTableBody.querySelectorAll("tr"),
      ).filter((tr) => {
        const cb = tr.querySelector(".history-item-checkbox");
        return cb && cb.checked;
      });

      if (checkedRows.length === 0) return;

      appendTerminalLine(
        "[INFO] Multi-threaded bulk scheduler initialized. Queuing " +
          checkedRows.length +
          " items for sequential archival...",
        "t-blue",
      );
      showToast(
        "Bulk Downloads Started",
        `Multi-threaded scheduler queued ${checkedRows.length} items for archival.`,
        "info",
      );

      const queueTabBtn = document.querySelector(
        '.sidebar-item[data-tab="tab-queue"]',
      );
      if (queueTabBtn) queueTabBtn.click();

      simQueueTableBody.innerHTML = checkedRows
        .map((row, index) => {
          const title = row.querySelector(".video-title-bold").textContent;
          const formatBadge = row.querySelector(".badge");
          const format = formatBadge ? formatBadge.textContent : "Video";
          return `
          <tr class="new-row-fade bulk-queue-row" data-index="${index}">
            <td><span class="video-title-bold">${title}</span></td>
            <td><span class="font-mono">${format}</span></td>
            <td><span class="badge badge-warning queue-item-status">Pending...</span></td>
            <td class="queue-item-size">-- MB</td>
            <td>
              <div class="progress-track" style="height:4px; width:100px; margin-bottom:0;">
                <div class="progress-fill queue-item-progress" style="width: 0%"></div>
              </div>
            </td>
          </tr>
        `;
        })
        .join("");

      if (typeof lucide !== "undefined") {
        lucide.createIcons();
      }

      let currentBulkIndex = 0;

      function processNextBulkDownload() {
        if (currentBulkIndex >= checkedRows.length) {
          appendTerminalLine(
            "[SUCCESS] Bulk re-download queue completed! All " +
              checkedRows.length +
              " files synchronized.",
            "t-green",
          );
          showToast(
            "Bulk Sync Completed",
            `Successfully synchronized ${checkedRows.length} files.`,
            "success",
          );

          setTimeout(() => {
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
            sidebarQueueCount.textContent = "0";
            sidebarQueueCount.style.background = "var(--border)";
            if (typeof lucide !== "undefined") {
              lucide.createIcons();
            }
          }, 1500);

          checkedRows.forEach((row) => {
            const cb = row.querySelector(".history-item-checkbox");
            if (cb) cb.checked = false;
          });
          if (historySelectAll) historySelectAll.checked = false;
          updateBulkActionsBar();
          return;
        }

        const currentQueueRow = simQueueTableBody.querySelector(
          `.bulk-queue-row[data-index="${currentBulkIndex}"]`,
        );
        if (!currentQueueRow) return;

        const statusBadge = currentQueueRow.querySelector(".queue-item-status");
        const progressFill = currentQueueRow.querySelector(
          ".queue-item-progress",
        );
        const sizeCell = currentQueueRow.querySelector(".queue-item-size");
        const title =
          currentQueueRow.querySelector(".video-title-bold").textContent;

        statusBadge.textContent = "Downloading...";
        statusBadge.className = "badge badge-warning queue-item-status";

        sidebarQueueCount.textContent = (
          checkedRows.length - currentBulkIndex
        ).toString();
        sidebarQueueCount.style.background = "var(--primary)";

        appendTerminalLine(
          "[INFO] Archiving item [" +
            (currentBulkIndex + 1) +
            "/" +
            checkedRows.length +
            "]: " +
            title,
          "t-blue",
        );

        let progressVal = 0;
        const progressInterval = setInterval(() => {
          progressVal += 10;
          if (progressVal > 100) progressVal = 100;

          progressFill.style.width = progressVal + "%";

          if (progressVal === 10) {
            sizeCell.textContent = "Calculating...";
          } else if (progressVal === 40) {
            sizeCell.textContent = "Checking bytes...";
          } else if (progressVal === 70) {
            sizeCell.textContent =
              (Math.random() * 200 + 50).toFixed(1) + " MB";
          }

          if (progressVal === 100) {
            clearInterval(progressInterval);
            statusBadge.textContent = "Finished";
            statusBadge.className = "badge badge-success queue-item-status";
            appendTerminalLine(
              "[SUCCESS] Item synced to downloads folder successfully.",
              "t-green",
            );
            showToast(
              "Item Synced",
              `Successfully archived "${title}"`,
              "success",
            );

            currentBulkIndex++;
            setTimeout(processNextBulkDownload, 800);
          }
        }, 120);
      }

      processNextBulkDownload();
    });
  }

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
