(() => {
  const embeddedPage = window.self !== window.top;
  const standalonePage = document.body.dataset.page;

  if (standalonePage && !embeddedPage) {
    window.location.replace(`index.html?page=${encodeURIComponent(standalonePage)}`);
    return;
  }

  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-button");
  const nav = document.querySelector(".site-nav");

  if (header && menuButton && nav) {
    const setMenu = (open) => {
      header.dataset.open = String(open);
      menuButton.setAttribute("aria-expanded", String(open));
    };

    menuButton.addEventListener("click", () => {
      setMenu(header.dataset.open !== "true");
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenu(false);
    });
  }

  if (embeddedPage) {
    const homeLink = document.querySelector(".brand-name");
    if (homeLink) {
      homeLink.addEventListener("click", (event) => {
        event.preventDefault();
        window.parent.postMessage({ type: "caizhu-home" }, "*");
      });
    }
    window.parent.postMessage({ type: "caizhu-route", page: standalonePage }, "*");
  }

  const contentFrame = document.querySelector(".content-frame");
  if (contentFrame) {
    const allowedPages = new Set(["course.html", "vlog.html", "reflections.html", "paper.html", "gallery.html"]);

    const updateShellUrl = (page, replace = false) => {
      try {
        const nextUrl = new URL(window.location.href);
        if (page) nextUrl.searchParams.set("page", page);
        else nextUrl.searchParams.delete("page");
        const method = replace ? "replaceState" : "pushState";
        window.history[method]({ page: page || null }, "", nextUrl);
      } catch {
        // File URLs can restrict History API updates in some browsers.
      }
    };

    const showContentPage = (page, updateHistory = true) => {
      if (!allowedPages.has(page)) return;
      contentFrame.hidden = false;
      document.body.classList.add("content-open");
      if (!contentFrame.src.endsWith(`/${page}`)) contentFrame.src = page;
      if (updateHistory) updateShellUrl(page);
    };

    const showHome = (updateHistory = true) => {
      contentFrame.hidden = true;
      document.body.classList.remove("content-open");
      if (updateHistory) updateShellUrl(null);
      const brandLink = document.querySelector(".brand-name");
      if (brandLink) brandLink.focus({ preventScroll: true });
    };

    document.querySelectorAll('a[target="content-frame"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const page = link.getAttribute("href");
        if (!allowedPages.has(page)) return;
        event.preventDefault();
        showContentPage(page);
      });
    });

    window.addEventListener("message", (event) => {
      if (event.source !== contentFrame.contentWindow || !event.data) return;
      if (event.data.type === "caizhu-home") showHome();
      if (event.data.type === "caizhu-route" && allowedPages.has(event.data.page)) {
        updateShellUrl(event.data.page, true);
      }
    });

    window.addEventListener("popstate", () => {
      const page = new URLSearchParams(window.location.search).get("page");
      if (allowedPages.has(page)) showContentPage(page, false);
      else showHome(false);
    });

    const initialPage = new URLSearchParams(window.location.search).get("page");
    if (allowedPages.has(initialPage)) showContentPage(initialPage, false);
  }

  const heroVideos = Array.from(document.querySelectorAll("[data-hero-video]"));
  if (heroVideos.length) {
    const playbackRate = 1.5;
    const fadeDuration = 1400;
    let activeIndex = 0;
    let transitioning = false;
    let finishTimer;

    const playSafely = async (video) => {
      try {
        await video.play();
        return true;
      } catch {
        return false;
      }
    };

    heroVideos.forEach((video) => {
      video.defaultPlaybackRate = playbackRate;
      video.playbackRate = playbackRate;
      video.loop = false;
    });

    const crossfade = async () => {
      if (transitioning || heroVideos.length < 2) return;

      const outgoing = heroVideos[activeIndex];
      const nextIndex = (activeIndex + 1) % heroVideos.length;
      const incoming = heroVideos[nextIndex];
      transitioning = true;
      if (incoming.readyState >= 1) incoming.currentTime = 0;
      incoming.playbackRate = playbackRate;

      const started = await playSafely(incoming);
      if (!started) {
        outgoing.loop = true;
        transitioning = false;
        return;
      }

      outgoing.loop = false;

      requestAnimationFrame(() => {
        incoming.classList.add("is-active");
        outgoing.classList.remove("is-active");
      });

      window.clearTimeout(finishTimer);
      finishTimer = window.setTimeout(() => {
        outgoing.pause();
        outgoing.currentTime = 0;
        activeIndex = nextIndex;
        transitioning = false;
      }, fadeDuration);
    };

    heroVideos.forEach((video) => {
      video.addEventListener("timeupdate", () => {
        if (video !== heroVideos[activeIndex] || transitioning || !Number.isFinite(video.duration)) return;
        const mediaLeadTime = (fadeDuration / 1000) * playbackRate;
        if (video.duration - video.currentTime <= mediaLeadTime) crossfade();
      });

      video.addEventListener("ended", () => {
        if (video === heroVideos[activeIndex] && !transitioning) crossfade();
      });
    });

    const firstVideo = heroVideos[0];
    const beginPlayback = () => playSafely(firstVideo);
    if (firstVideo.readyState >= 2) beginPlayback();
    else firstVideo.addEventListener("canplay", beginPlayback, { once: true });
  }

  const galleryItems = Array.from(document.querySelectorAll(".gallery-item[data-gallery-src]"));
  if (galleryItems.length) {
    const galleryDialog = document.createElement("dialog");
    const galleryImage = document.createElement("img");
    const galleryClose = document.createElement("button");
    galleryDialog.className = "gallery-lightbox";
    galleryDialog.setAttribute("aria-label", "照片大图预览");
    galleryClose.className = "gallery-lightbox-close";
    galleryClose.type = "button";
    galleryClose.textContent = "关闭";
    galleryDialog.append(galleryClose, galleryImage);
    document.body.append(galleryDialog);

    const closeGallery = () => {
      if (typeof galleryDialog.close === "function") galleryDialog.close();
      else galleryDialog.removeAttribute("open");
    };

    galleryItems.forEach((item) => {
      item.addEventListener("click", () => {
        const thumbnail = item.querySelector("img");
        galleryImage.src = item.dataset.gallerySrc;
        galleryImage.alt = thumbnail ? thumbnail.alt : "井冈山实践照片";
        if (typeof galleryDialog.showModal === "function") galleryDialog.showModal();
        else galleryDialog.setAttribute("open", "");
      });
    });

    galleryClose.addEventListener("click", closeGallery);
    galleryDialog.addEventListener("click", (event) => {
      if (event.target === galleryDialog) closeGallery();
    });
  }

  if (embeddedPage) {
    const controlledMedia = Array.from(document.querySelectorAll("video[controls], audio[controls]"));
    controlledMedia.forEach((media) => {
      media.addEventListener("play", () => {
        window.parent.postMessage({ type: "caizhu-content-media", state: "playing" }, "*");
      });
      media.addEventListener("pause", () => {
        window.parent.postMessage({ type: "caizhu-content-media", state: "stopped" }, "*");
      });
      media.addEventListener("ended", () => {
        window.parent.postMessage({ type: "caizhu-content-media", state: "stopped" }, "*");
      });
    });
    window.addEventListener("pagehide", () => {
      window.parent.postMessage({ type: "caizhu-content-media", state: "stopped" }, "*");
    });
    return;
  }

  const backgroundMusic = document.querySelector("#background-music") || document.createElement("audio");
  const musicToggle = document.createElement("button");
  const musicNote = document.createElement("span");
  const musicTimeKey = "caizhu-background-music-time";
  let autoplayBlocked = false;
  let musicPausedForContent = false;
  let shouldPlay = true;

  const readSession = (key) => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeSession = (key, value) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Some file:// and privacy modes do not expose session storage.
    }
  };

  backgroundMusic.id = "background-music";
  backgroundMusic.src = "assets/audio/eternal-crown.mp3";
  backgroundMusic.autoplay = true;
  backgroundMusic.loop = true;
  backgroundMusic.preload = "auto";
  backgroundMusic.muted = false;
  backgroundMusic.volume = 0.2;
  backgroundMusic.setAttribute("aria-hidden", "true");

  musicToggle.className = "music-toggle";
  musicToggle.type = "button";
  musicToggle.dataset.playing = "false";
  musicToggle.dataset.blocked = "false";
  musicNote.className = "music-note";
  musicNote.setAttribute("aria-hidden", "true");
  musicNote.textContent = "♪";
  musicToggle.append(musicNote);
  if (!backgroundMusic.isConnected) document.body.append(backgroundMusic);
  document.body.append(musicToggle);

  const updateMusicControl = () => {
    const playing = !backgroundMusic.paused;
    musicToggle.dataset.playing = String(playing);
    musicToggle.dataset.blocked = String(autoplayBlocked && !playing);
    musicToggle.setAttribute("aria-pressed", String(playing));
    musicToggle.setAttribute("aria-label", playing ? "暂停背景音乐" : "播放背景音乐");
    musicToggle.title = playing ? "暂停背景音乐" : "播放背景音乐";
  };

  const playBackgroundMusic = async () => {
    if (!shouldPlay) return false;
    try {
      await backgroundMusic.play();
      autoplayBlocked = false;
      updateMusicControl();
      return true;
    } catch {
      autoplayBlocked = true;
      updateMusicControl();
      return false;
    }
  };

  backgroundMusic.addEventListener("loadedmetadata", () => {
    const storedTime = Number.parseFloat(readSession(musicTimeKey));
    if (Number.isFinite(storedTime) && storedTime > 0 && Number.isFinite(backgroundMusic.duration)) {
      backgroundMusic.currentTime = storedTime % backgroundMusic.duration;
    }
    if (shouldPlay) playBackgroundMusic();
  }, { once: true });

  backgroundMusic.addEventListener("play", updateMusicControl);
  backgroundMusic.addEventListener("pause", updateMusicControl);
  backgroundMusic.addEventListener("error", updateMusicControl);

  musicToggle.addEventListener("click", async () => {
    if (backgroundMusic.paused) {
      shouldPlay = true;
      await playBackgroundMusic();
    } else {
      shouldPlay = false;
      backgroundMusic.pause();
    }
    updateMusicControl();
  });

  const unlockEvents = ["pointerdown", "touchstart", "keydown"];
  const removeUnlockListeners = () => {
    unlockEvents.forEach((eventName) => {
      document.removeEventListener(eventName, unlockMusic, true);
    });
  };

  const unlockMusic = async (event) => {
    if (event.target instanceof Element && event.target.closest(".music-toggle")) return;
    if (!shouldPlay || !backgroundMusic.paused) {
      removeUnlockListeners();
      return;
    }
    const started = await playBackgroundMusic();
    if (started) removeUnlockListeners();
  };
  unlockEvents.forEach((eventName) => {
    document.addEventListener(eventName, unlockMusic, { capture: true, passive: eventName !== "keydown" });
  });

  window.addEventListener("pageshow", () => {
    if (shouldPlay && backgroundMusic.paused) playBackgroundMusic();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && shouldPlay && backgroundMusic.paused) {
      playBackgroundMusic();
    }
  });

  window.addEventListener("message", (event) => {
    if (!contentFrame || event.source !== contentFrame.contentWindow || event.data?.type !== "caizhu-content-media") return;
    if (event.data.state === "playing") {
      musicPausedForContent = shouldPlay && !backgroundMusic.paused;
      if (musicPausedForContent) backgroundMusic.pause();
      return;
    }
    if (event.data.state === "stopped" && musicPausedForContent) {
      musicPausedForContent = false;
      if (shouldPlay) playBackgroundMusic();
    }
  });

  window.addEventListener("pagehide", () => {
    writeSession(musicTimeKey, String(backgroundMusic.currentTime || 0));
  });

  updateMusicControl();
  if (shouldPlay) playBackgroundMusic();
})();
