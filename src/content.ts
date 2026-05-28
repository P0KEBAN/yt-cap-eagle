import type {
  SaveThumbnailMessage,
  SaveThumbnailResponse,
  VideoMetadata,
} from "./types";

const YOUTUBE_WATCH_HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com"]);

void saveCurrentVideoThumbnail();

async function saveCurrentVideoThumbnail(): Promise<void> {
  try {
    const metadata = collectVideoMetadata(window.location.href);
    const response = await sendSaveMessage(metadata);

    if (response.ok) {
      window.alert("サムネイルをEagleに保存しました");
      return;
    }

    window.alert(response.error);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "サムネイル保存に失敗しました");
  }
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

  if (YOUTUBE_WATCH_HOSTS.has(url.hostname) && url.pathname.startsWith("/shorts/")) {
    return normalizeVideoId(url.pathname.split("/")[2]);
  }

  if (url.hostname === "youtu.be") {
    return normalizeVideoId(url.pathname.slice(1).split("/")[0]);
  }

  return null;
}

function normalizeVideoId(candidate: string | null | undefined): string | null {
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.trim();
  return /^[a-zA-Z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
}

function normalizeVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function extractTitle(): string {
  const heading =
    document.querySelector<HTMLHeadingElement>("h1.ytd-watch-metadata") ??
    document.querySelector<HTMLHeadingElement>("h1.title");
  const headingText = heading?.textContent?.trim();

  if (headingText) {
    return headingText;
  }

  return document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim() || "YouTube thumbnail";
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

function sendSaveMessage(metadata: VideoMetadata): Promise<SaveThumbnailResponse> {
  const message: SaveThumbnailMessage = {
    type: "YT_CAP_SAVE_THUMBNAIL",
    payload: metadata,
  };

  return chrome.runtime.sendMessage(message);
}
