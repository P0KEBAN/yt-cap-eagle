import type {
  SaveThumbnailMessage,
  SaveThumbnailResponse,
  Settings,
  VideoMetadata,
} from "./types";

const DEFAULT_SETTINGS: Settings = {
  eagleHost: "localhost",
  eaglePort: 41595,
  defaultFolderId: "",
};

const THUMBNAIL_QUALITIES = ["maxresdefault", "sddefault", "hqdefault"] as const;

chrome.action.onClicked.addListener((tab) => {
  void injectContentScript(tab);
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "save-thumbnail") {
    return;
  }

  void runOnActiveTab();
});

chrome.runtime.onMessage.addListener(
  (
    message: SaveThumbnailMessage,
    _sender,
    sendResponse: (response: SaveThumbnailResponse) => void,
  ) => {
    if (message?.type !== "YT_CAP_SAVE_THUMBNAIL") {
      return false;
    }

    void saveThumbnail(message.payload)
      .then((thumbnailUrl) => {
        sendResponse({ ok: true, thumbnailUrl });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: toUserFacingError(error),
        });
      });

    return true;
  },
);

async function runOnActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await injectContentScript(tab);
}

async function injectContentScript(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !isSupportedYouTubeUrl(tab.url)) {
    await notify("このページは対応していません");
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["dist/content.js"],
  });
}

function isSupportedYouTubeUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) {
    return false;
  }

  try {
    const url = new URL(rawUrl);

    if (url.hostname === "youtu.be") {
      return Boolean(url.pathname.slice(1));
    }

    if (!["www.youtube.com", "youtube.com", "m.youtube.com"].includes(url.hostname)) {
      return false;
    }

    return url.pathname === "/watch" || url.pathname.startsWith("/shorts/");
  } catch {
    return false;
  }
}

async function saveThumbnail(metadata: VideoMetadata): Promise<string> {
  const settings = await loadSettings();
  const baseUrl = `http://${settings.eagleHost}:${settings.eaglePort}`;

  await assertEagleIsRunning(baseUrl);

  const thumbnailUrl = await resolveThumbnailUrl(metadata.videoId);
  const body = buildAddFromUrlBody(metadata, thumbnailUrl, settings.defaultFolderId);
  const response = await fetch(`${baseUrl}/api/item/addFromURL`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Eagle APIに接続できません (${response.status})`);
  }

  await notify("サムネイルをEagleに保存しました");
  return thumbnailUrl;
}

async function loadSettings(): Promise<Settings> {
  const saved = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  return {
    eagleHost: normalizeHost(saved.eagleHost),
    eaglePort: normalizePort(saved.eaglePort),
    defaultFolderId:
      typeof saved.defaultFolderId === "string" ? saved.defaultFolderId.trim() : "",
  };
}

function normalizeHost(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_SETTINGS.eagleHost;
  }

  return value.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function normalizePort(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return DEFAULT_SETTINGS.eaglePort;
}

async function assertEagleIsRunning(baseUrl: string): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/application/info`);

    if (!response.ok) {
      throw new Error(`Eagle API responded with ${response.status}`);
    }
  } catch {
    throw new Error("Eagleが起動していません");
  }
}

async function resolveThumbnailUrl(videoId: string): Promise<string> {
  for (const quality of THUMBNAIL_QUALITIES) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;

    if (await imageExists(url)) {
      return url;
    }
  }

  throw new Error("サムネイルを取得できませんでした");
}

async function imageExists(url: string): Promise<boolean> {
  try {
    const headResponse = await fetch(url, { method: "HEAD" });

    if (headResponse.ok) {
      return true;
    }

    const getResponse = await fetch(url, { method: "GET" });
    return getResponse.ok;
  } catch {
    return false;
  }
}

function buildAddFromUrlBody(
  metadata: VideoMetadata,
  thumbnailUrl: string,
  defaultFolderId: string,
): Record<string, string> {
  const body: Record<string, string> = {
    url: thumbnailUrl,
    name: metadata.title || "YouTube thumbnail",
    website: metadata.url,
    annotation: [
      `チャンネル: ${metadata.channelName || ""}`,
      `投稿日: ${metadata.uploadDate || ""}`,
      `動画ID: ${metadata.videoId}`,
      `取得日時: ${metadata.capturedAt}`,
    ].join("\n"),
  };

  if (defaultFolderId) {
    body.folderId = defaultFolderId;
  }

  return body;
}

async function notify(message: string): Promise<void> {
  await chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "yt-cap",
    message,
  });
}

function toUserFacingError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "サムネイル保存に失敗しました";
}
