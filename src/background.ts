import type {
  SaveRequest,
  SaveThumbnailMessage,
  SaveThumbnailResponse,
  Settings,
} from "./types";

const DEFAULT_SETTINGS: Settings = {
  eagleHost: "localhost",
  eaglePort: 41595,
  defaultFolderId: "",
};

const THUMBNAIL_QUALITIES = [
  "maxresdefault",
  "sddefault",
  "hqdefault",
] as const;

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

async function injectContentScript(
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  if (!tab?.id || !isInjectablePage(tab.url)) {
    await notify("このページは対応していません");
    return;
  }

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["src/overlay.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["dist/content.js"],
    });
  } catch {
    await notify("このページでは実行できません");
  }
}

function isInjectablePage(rawUrl: string | undefined): boolean {
  return (
    !rawUrl || rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
  );
}

async function saveThumbnail(request: SaveRequest): Promise<string> {
  const settings = await loadSettings();
  const baseUrl = `http://${settings.eagleHost}:${settings.eaglePort}`;

  await assertEagleIsRunning(baseUrl);

  const folderId =
    request.targetFolder === "default" ? settings.defaultFolderId : "";
  const thumbnailUrls = buildThumbnailFallbackUrls(
    request.videoId,
    request.thumbnailUrl,
  );
  let lastError: unknown;

  for (const thumbnailUrl of thumbnailUrls) {
    let dataUrl: string;
    let download: TemporaryDownload | null = null;

    try {
      dataUrl = await fetchThumbnailDataUrl(thumbnailUrl);
      download = await downloadTemporaryThumbnail(
        dataUrl,
        request.videoId,
        getImageExtension(dataUrl),
      );
      await addThumbnailFromPath(
        baseUrl,
        request,
        download.filename,
        thumbnailUrl,
        folderId,
      );
      await notify("サムネイルをEagleに保存しました");
      return thumbnailUrl;
    } catch (error) {
      lastError = error;
      continue;
    } finally {
      if (download) {
        await removeTemporaryDownload(download.id);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("サムネイルを取得できませんでした");
}

async function addThumbnailFromPath(
  baseUrl: string,
  request: SaveRequest,
  filePath: string,
  sourceThumbnailUrl: string,
  folderId: string,
): Promise<void> {
  const body = buildAddFromUrlBody(
    request,
    filePath,
    sourceThumbnailUrl,
    folderId,
  );
  const response = await fetch(`${baseUrl}/api/item/addFromPath`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const result = await parseEagleResponse(response);

  if (!response.ok) {
    throw new Error(
      result.message || `Eagle APIに接続できません (${response.status})`,
    );
  }

  if (result.status !== "success") {
    throw new Error(result.message || "Eagleへの保存に失敗しました");
  }
}

async function loadSettings(): Promise<Settings> {
  const saved = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  return {
    eagleHost: normalizeHost(saved.eagleHost),
    eaglePort: normalizePort(saved.eaglePort),
    defaultFolderId:
      typeof saved.defaultFolderId === "string"
        ? saved.defaultFolderId.trim()
        : "",
  };
}

function normalizeHost(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_SETTINGS.eagleHost;
  }

  return value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
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

function buildThumbnailFallbackUrls(
  videoId: string,
  preferredUrl: string,
): string[] {
  return [
    preferredUrl,
    ...THUMBNAIL_QUALITIES.map(
      (quality) => `https://img.youtube.com/vi/${videoId}/${quality}.jpg`,
    ),
  ].filter((url, index, urls) => Boolean(url) && urls.indexOf(url) === index);
}

function buildAddFromUrlBody(
  metadata: SaveRequest,
  filePath: string,
  sourceThumbnailUrl: string,
  defaultFolderId: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    path: filePath,
    name: metadata.title || "YouTube thumbnail",
    website: metadata.url,
    annotation: [
      `チャンネル: ${metadata.channelName || ""}`,
      `投稿日: ${metadata.uploadDate || ""}`,
      `動画ID: ${metadata.videoId}`,
      `サムネイルURL: ${sourceThumbnailUrl}`,
      `取得日時: ${metadata.capturedAt}`,
    ].join("\n"),
  };

  if (defaultFolderId) {
    body.folderId = defaultFolderId;
  }

  return body;
}

async function parseEagleResponse(
  response: Response,
): Promise<{ status: string; message?: string }> {
  try {
    const result = (await response.json()) as {
      status?: unknown;
      message?: unknown;
    };

    return {
      status: typeof result.status === "string" ? result.status : "success",
      message: typeof result.message === "string" ? result.message : undefined,
    };
  } catch {
    return { status: "success" };
  }
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

async function fetchThumbnailDataUrl(thumbnailUrl: string): Promise<string> {
  const response = await fetch(thumbnailUrl);

  if (!response.ok) {
    throw new Error(`サムネイルを取得できませんでした (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";

  if (!contentType.startsWith("image/")) {
    throw new Error("サムネイルを取得できませんでした");
  }

  const buffer = await response.arrayBuffer();
  return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

type TemporaryDownload = {
  id: number;
  filename: string;
};

async function downloadTemporaryThumbnail(
  dataUrl: string,
  videoId: string,
  extension: string,
): Promise<TemporaryDownload> {
  const id = await chrome.downloads.download({
    url: dataUrl,
    filename: `yt-cap-temp/${videoId}-${Date.now()}.${extension}`,
    conflictAction: "uniquify",
    saveAs: false,
  });
  const filename = await waitForDownloadComplete(id);

  return { id, filename };
}

function waitForDownloadComplete(downloadId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let timeoutId: number | undefined;

    const cleanup = (): void => {
      chrome.downloads.onChanged.removeListener(handleChanged);

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };

    const handleChanged = (delta: chrome.downloads.DownloadDelta): void => {
      if (delta.id !== downloadId || !delta.state?.current) {
        return;
      }

      if (delta.state.current === "complete") {
        cleanup();
        void chrome.downloads.search({ id: downloadId }).then(([item]) => {
          if (item?.filename) {
            resolve(item.filename);
            return;
          }

          reject(new Error("一時ファイルの保存先を取得できませんでした"));
        });
        return;
      }

      if (delta.state.current === "interrupted") {
        cleanup();
        reject(new Error("サムネイルの一時保存に失敗しました"));
      }
    };

    chrome.downloads.onChanged.addListener(handleChanged);
    timeoutId = globalThis.setTimeout(() => {
      cleanup();
      reject(new Error("サムネイルの一時保存がタイムアウトしました"));
    }, 15000);

    void chrome.downloads.search({ id: downloadId }).then(([item]) => {
      if (item?.state === "complete" && item.filename) {
        cleanup();
        resolve(item.filename);
        return;
      }

      if (item?.state === "interrupted") {
        cleanup();
        reject(new Error("サムネイルの一時保存に失敗しました"));
      }
    });
  });
}

async function removeTemporaryDownload(downloadId: number): Promise<void> {
  try {
    await chrome.downloads.removeFile(downloadId);
    await chrome.downloads.erase({ id: downloadId });
  } catch {
    await chrome.downloads.erase({ id: downloadId });
  }
}

function getImageExtension(dataUrl: string): string {
  const match = /^data:image\/([a-z0-9.+-]+);base64,/i.exec(dataUrl);
  const type = match?.[1]?.toLowerCase();

  if (type === "jpeg" || type === "jpg") {
    return "jpg";
  }

  if (type === "png" || type === "webp" || type === "gif") {
    return type;
  }

  return "jpg";
}
