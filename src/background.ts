import {
  getMessages,
  resolveLocale,
  type Locale,
  type Messages,
} from "./i18n.js";
import type {
  LanguageSetting,
  SaveRequest,
  SaveThumbnailMessage,
  SaveThumbnailResponse,
  Settings,
} from "./types";

const DEFAULT_SETTINGS: Settings = {
  eagleHost: "localhost",
  eaglePort: 41595,
  defaultFolderId: "",
  language: "auto",
};

const THUMBNAIL_QUALITIES = [
  "maxresdefault",
  "sddefault",
  "hqdefault",
] as const;
const ALLOWED_EAGLE_HOSTS = new Set(["localhost", "127.0.0.1"]);
const KNOWN_EAGLE_DOWNLOAD_WARNING = "Unable to download all specified images.";

type ParsedEagleResponse = {
  status?: string;
  message?: string;
  hasSavedItemEvidence: boolean;
};

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

    void currentLocale().then((locale) => {
      void saveThumbnail(message.payload, locale)
        .then((thumbnailUrl) => {
          sendResponse({ ok: true, thumbnailUrl });
        })
        .catch((error) => {
          sendResponse({
            ok: false,
            error: toUserFacingError(error, locale),
          });
        });
    });

    return true;
  },
);

async function currentLocale(): Promise<Locale> {
  const settings = await loadSettings();
  return resolveLocale(settings.language, chrome.i18n.getUILanguage());
}

async function runOnActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await injectContentScript(tab);
}

async function injectContentScript(
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  const m = getMessages(await currentLocale());

  if (!tab?.id || !isInjectablePage(tab.url)) {
    await notify(m.unsupportedPage);
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
    await notify(m.cannotRunHere);
  }
}

function isInjectablePage(rawUrl: string | undefined): boolean {
  return (
    !rawUrl || rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
  );
}

async function saveThumbnail(
  request: SaveRequest,
  locale: Locale,
): Promise<string> {
  const settings = await loadSettings();
  const m = getMessages(locale);
  const baseUrl = `http://${settings.eagleHost}:${settings.eaglePort}`;

  await assertEagleIsRunning(baseUrl, m);

  const thumbnailUrl =
    request.thumbnailUrl || (await resolveThumbnailUrl(request.videoId, m));
  const folderId =
    request.targetFolder === "default" ? settings.defaultFolderId : "";
  const body = buildAddFromUrlBody(request, thumbnailUrl, folderId, m);
  const response = await fetch(`${baseUrl}/api/item/addFromURL`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${m.cannotConnectEagle} (${response.status})`);
  }

  const result = await parseEagleResponse(response);

  if (!isSuccessfulEagleSave(result)) {
    throw new Error(result.message || m.saveToEagleFailed);
  }

  await notify(m.savedToEagle);
  return thumbnailUrl;
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
    language: normalizeLanguage(saved.language),
  };
}

function normalizeLanguage(value: unknown): LanguageSetting {
  return value === "en" || value === "ja" || value === "auto"
    ? value
    : DEFAULT_SETTINGS.language;
}

function normalizeHost(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_SETTINGS.eagleHost;
  }

  const host = value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");

  return ALLOWED_EAGLE_HOSTS.has(host) ? host : DEFAULT_SETTINGS.eagleHost;
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

async function assertEagleIsRunning(
  baseUrl: string,
  m: Messages,
): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/application/info`);

    if (!response.ok) {
      throw new Error(`Eagle API responded with ${response.status}`);
    }
  } catch {
    throw new Error(m.eagleNotRunning);
  }
}

async function resolveThumbnailUrl(
  videoId: string,
  m: Messages,
): Promise<string> {
  for (const quality of THUMBNAIL_QUALITIES) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;

    if (await imageExists(url)) {
      return url;
    }
  }

  throw new Error(m.thumbnailFailed);
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
  metadata: SaveRequest,
  thumbnailUrl: string,
  defaultFolderId: string,
  m: Messages,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    url: thumbnailUrl,
    name: metadata.title || "YouTube thumbnail",
    website: metadata.url,
    annotation: [
      `${m.annotationChannel}: ${metadata.channelName || ""}`,
      `${m.annotationUploaded}: ${metadata.uploadDate || ""}`,
      `${m.annotationVideoId}: ${metadata.videoId}`,
      `${m.annotationCapturedAt}: ${metadata.capturedAt}`,
    ].join("\n"),
  };

  if (defaultFolderId) {
    body.folderId = defaultFolderId;
  }

  return body;
}

async function parseEagleResponse(
  response: Response,
): Promise<ParsedEagleResponse> {
  try {
    const result = (await response.json()) as Record<string, unknown>;

    if (!isRecord(result)) {
      return {
        hasSavedItemEvidence: false,
      };
    }

    return {
      status: typeof result.status === "string" ? result.status : undefined,
      message: extractEagleMessage(result),
      hasSavedItemEvidence: hasSavedItemEvidence(result.data),
    };
  } catch {
    return {
      hasSavedItemEvidence: false,
    };
  }
}

function isSuccessfulEagleSave(result: ParsedEagleResponse): boolean {
  if (result.status === "success") {
    return (
      !isKnownEagleDownloadWarning(result.message) ||
      result.hasSavedItemEvidence
    );
  }

  return (
    isKnownEagleDownloadWarning(result.message) && result.hasSavedItemEvidence
  );
}

function isKnownEagleDownloadWarning(message: string | undefined): boolean {
  return Boolean(message?.includes(KNOWN_EAGLE_DOWNLOAD_WARNING));
}

function hasSavedItemEvidence(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasSavedItemEvidence);
  }

  if (!isRecord(value)) {
    return false;
  }

  if (firstString(value.id, value.itemId)) {
    return true;
  }

  return hasSavedItemEvidence(value.item);
}

async function notify(message: string): Promise<void> {
  // 通知の失敗（アイコン読み込み不可・OS側で通知無効など）は保存成否に影響させない。
  // MV3のService Workerでは相対パスのiconUrlが解決できず例外になることがあるため、
  // chrome.runtime.getURL で絶対URLに解決したうえで、例外は握りつぶす。
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title: "yt-cap",
      message,
    });
  } catch (error) {
    console.warn("yt-cap: 通知の表示に失敗しました", error);
  }
}

function toUserFacingError(error: unknown, locale: Locale): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return getMessages(locale).saveFailed;
}

function extractEagleMessage(
  result: Record<string, unknown>,
): string | undefined {
  const directMessage = firstString(
    result.message,
    result.error,
    result.data,
    result.warning,
  );

  if (directMessage) {
    return directMessage;
  }

  if (isRecord(result.data)) {
    return firstString(
      result.data.message,
      result.data.error,
      result.data.warning,
    );
  }

  return undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
