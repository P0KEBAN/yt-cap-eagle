(() => {
  type VideoMetadata = {
    videoId: string;
    title: string;
    url: string;
    channelName: string;
    uploadDate: string;
    capturedAt: string;
  };

  type SaveRequest = VideoMetadata & {
    thumbnailUrl: string;
    targetFolder: "default" | "inbox";
  };

  type SaveThumbnailMessage = {
    type: "YT_CAP_SAVE_THUMBNAIL";
    payload: SaveRequest;
  };

  type SaveThumbnailResponse =
    | {
        ok: true;
        thumbnailUrl: string;
      }
    | {
        ok: false;
        error: string;
      };

  // このスクリプトは executeScript で通常スクリプトとして注入されるため import が使えない。
  // src/i18n.ts と文言を同期させること（ここはオーバーレイで使う最小限のみ）。
  type Locale = "en" | "ja";
  type LanguageSetting = "auto" | "en" | "ja";

  const MESSAGES: Record<Locale, Record<string, string>> = {
    en: {
      unsupportedPage: "This page is not supported",
      loading: "Loading...",
      thumbnailLoading: "Thumbnail is still loading",
      saving: "Saving...",
      saved: "Saved",
      saveHint: "Enter to save / Cmd+Enter for inbox",
      thumbnailFailed: "Could not fetch the thumbnail",
    },
    ja: {
      unsupportedPage: "このページは対応していません",
      loading: "読み込み中...",
      thumbnailLoading: "サムネイルを読み込み中です",
      saving: "保存中...",
      saved: "保存しました",
      saveHint: "Enterで保存 / Cmd+Enterでインボックス",
      thumbnailFailed: "サムネイルを取得できませんでした",
    },
  };

  const YOUTUBE_WATCH_HOSTS = new Set([
    "www.youtube.com",
    "youtube.com",
    "m.youtube.com",
  ]);
  const OVERLAY_ID = "yt-cap-overlay";
  const THUMBNAIL_QUALITIES = [
    "maxresdefault",
    "sddefault",
    "hqdefault",
  ] as const;

  void (async () => {
    const locale = await resolveContentLocale();
    showThumbnailOverlay(MESSAGES[locale]);
  })();

  async function resolveContentLocale(): Promise<Locale> {
    let setting: LanguageSetting = "auto";

    try {
      const saved = await chrome.storage.sync.get({ language: "auto" });

      if (
        saved.language === "en" ||
        saved.language === "ja" ||
        saved.language === "auto"
      ) {
        setting = saved.language;
      }
    } catch {
      // 設定が読めない場合は auto 扱いのままにする。
    }

    if (setting === "en" || setting === "ja") {
      return setting;
    }

    return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
  }

  function showThumbnailOverlay(m: Record<string, string>): void {
    const existing = document.getElementById(OVERLAY_ID);

    if (existing) {
      existing.remove();
      restoreScroll();
    }

    let metadata: VideoMetadata;

    try {
      metadata = collectVideoMetadata(window.location.href);
    } catch {
      window.alert(m.unsupportedPage);
      return;
    }

    const state = {
      qualityIndex: 0,
      loadedThumbnailUrl: "",
      saving: false,
    };

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const panel = document.createElement("div");
    panel.className = "yt-cap-panel";

    const image = document.createElement("img");
    image.className = "yt-cap-image";
    image.alt = "YouTube thumbnail preview";

    const status = document.createElement("div");
    status.className = "yt-cap-status";
    status.textContent = m.loading;

    panel.append(image, status);
    overlay.append(panel);
    document.documentElement.append(overlay);
    document.documentElement.classList.add("yt-cap-scroll-lock");

    const cleanup = (): void => {
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      restoreScroll();
    };

    const setStatus = (
      message: string,
      variant: "normal" | "error" | "success" = "normal",
    ): void => {
      status.textContent = message;
      status.dataset.variant = variant;
    };

    const save = async (targetFolder: "default" | "inbox"): Promise<void> => {
      if (state.saving) {
        return;
      }

      if (!state.loadedThumbnailUrl) {
        setStatus(m.thumbnailLoading, "error");
        return;
      }

      state.saving = true;
      setStatus(m.saving);

      const response = await sendSaveMessage({
        ...metadata,
        thumbnailUrl: state.loadedThumbnailUrl,
        targetFolder,
      });

      state.saving = false;

      if (!response.ok) {
        setStatus(response.error, "error");
        return;
      }

      setStatus(m.saved, "success");
      window.setTimeout(cleanup, 700);
    };

    const tryNextThumbnail = (): void => {
      state.qualityIndex += 1;

      if (state.qualityIndex >= THUMBNAIL_QUALITIES.length) {
        state.loadedThumbnailUrl = "";
        setStatus(m.thumbnailFailed, "error");
        return;
      }

      image.src = buildThumbnailUrl(
        metadata.videoId,
        THUMBNAIL_QUALITIES[state.qualityIndex],
      );
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup();
        return;
      }

      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      void save(event.metaKey ? "inbox" : "default");
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup();
      }
    });

    image.addEventListener("load", () => {
      state.loadedThumbnailUrl = image.currentSrc || image.src;
      setStatus(m.saveHint);
    });
    image.addEventListener("error", tryNextThumbnail);
    document.addEventListener("keydown", onKeyDown, true);

    image.src = buildThumbnailUrl(
      metadata.videoId,
      THUMBNAIL_QUALITIES[state.qualityIndex],
    );
  }

  function restoreScroll(): void {
    document.documentElement.classList.remove("yt-cap-scroll-lock");
  }

  function collectVideoMetadata(rawUrl: string): VideoMetadata {
    const videoId = extractVideoId(rawUrl);

    if (!videoId) {
      throw new Error("このページは対応していません");
    }

    return {
      videoId,
      title: extractTitle(),
      url: normalizeVideoUrl(videoId),
      channelName: extractChannelName(),
      uploadDate: extractUploadDate(),
      capturedAt: new Date().toISOString(),
    };
  }

  function extractVideoId(rawUrl: string): string | null {
    const url = new URL(rawUrl);

    if (YOUTUBE_WATCH_HOSTS.has(url.hostname) && url.pathname === "/watch") {
      return normalizeVideoId(url.searchParams.get("v"));
    }

    if (
      YOUTUBE_WATCH_HOSTS.has(url.hostname) &&
      url.pathname.startsWith("/shorts/")
    ) {
      return normalizeVideoId(url.pathname.split("/")[2]);
    }

    if (url.hostname === "youtu.be") {
      return normalizeVideoId(url.pathname.slice(1).split("/")[0]);
    }

    return null;
  }

  function normalizeVideoId(
    candidate: string | null | undefined,
  ): string | null {
    if (!candidate) {
      return null;
    }

    const trimmed = candidate.trim();
    return /^[a-zA-Z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
  }

  function normalizeVideoUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  function buildThumbnailUrl(
    videoId: string,
    quality: (typeof THUMBNAIL_QUALITIES)[number],
  ): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
  }

  function extractTitle(): string {
    const heading =
      document.querySelector<HTMLHeadingElement>("h1.ytd-watch-metadata") ??
      document.querySelector<HTMLHeadingElement>("h1.title");
    const headingText = heading?.textContent?.trim();

    if (headingText) {
      return headingText;
    }

    return (
      document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim() ||
      "YouTube thumbnail"
    );
  }

  function extractChannelName(): string {
    const selectors = [
      "ytd-watch-metadata ytd-channel-name a",
      "#owner #channel-name a",
      "ytd-video-owner-renderer #channel-name a",
    ];

    return findFirstText(selectors);
  }

  function extractUploadDate(): string {
    const selectors = [
      "ytd-watch-info-text #info-container yt-formatted-string",
      "#info-strings yt-formatted-string",
      "ytd-watch-metadata #info-strings yt-formatted-string",
    ];

    return findFirstText(selectors);
  }

  function findFirstText(selectors: string[]): string {
    for (const selector of selectors) {
      const text = document.querySelector(selector)?.textContent?.trim();

      if (text) {
        return text;
      }
    }

    return "";
  }

  function sendSaveMessage(
    payload: SaveRequest,
  ): Promise<SaveThumbnailResponse> {
    const message: SaveThumbnailMessage = {
      type: "YT_CAP_SAVE_THUMBNAIL",
      payload,
    };

    return chrome.runtime.sendMessage(message);
  }
})();
