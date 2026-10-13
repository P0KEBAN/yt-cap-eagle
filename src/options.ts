import {
  getMessages,
  resolveLocale,
  type Locale,
  type Messages,
} from "./i18n.js";
import type { LanguageSetting, Settings } from "./types";

const DEFAULT_SETTINGS: Settings = {
  eagleHost: "localhost",
  eaglePort: 41595,
  defaultFolderId: "",
  language: "auto",
};
const ALLOWED_EAGLE_HOSTS = new Set(["localhost", "127.0.0.1"]);

const form = requireElement<HTMLFormElement>("#settings-form");
const hostInput = requireElement<HTMLInputElement>("#eagle-host");
const portInput = requireElement<HTMLInputElement>("#eagle-port");
const folderInput = requireElement<HTMLInputElement>("#default-folder-id");
const languageSelect = requireElement<HTMLSelectElement>("#language");
const testButton = requireElement<HTMLButtonElement>("#test-connection");
const statusElement = requireElement<HTMLElement>("#status");
const shortcutValueElement = requireElement<HTMLElement>("#shortcut-value");
const openShortcutsButton =
  requireElement<HTMLButtonElement>("#open-shortcuts");

// manifest.json の commands のキーと合わせること。
const SHORTCUT_COMMAND = "save-thumbnail";
const SHORTCUTS_URL = "chrome://extensions/shortcuts";

let messages: Messages = getMessages("en");
let currentShortcut = "";

void initialize();

async function initialize(): Promise<void> {
  const settings = await loadSettings();
  hostInput.value = settings.eagleHost;
  portInput.value = String(settings.eaglePort);
  folderInput.value = settings.defaultFolderId;
  languageSelect.value = settings.language;

  applyLanguage(settings.language);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveSettings();
  });

  testButton.addEventListener("click", () => {
    void testConnection();
  });

  // 言語の選択を変えたら即座に画面表示へ反映する（保存前のプレビュー）。
  languageSelect.addEventListener("change", () => {
    applyLanguage(languageSelect.value as LanguageSetting);
  });

  openShortcutsButton.addEventListener("click", () => {
    void chrome.tabs.create({ url: SHORTCUTS_URL });
  });

  // ブラウザの設定画面でキーを変えて戻ってきたときに、表示を最新にする。
  window.addEventListener("focus", () => {
    void refreshShortcut();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refreshShortcut();
    }
  });

  await refreshShortcut();
}

async function refreshShortcut(): Promise<void> {
  try {
    const commands = await chrome.commands.getAll();
    currentShortcut =
      commands.find((command) => command.name === SHORTCUT_COMMAND)
        ?.shortcut ?? "";
  } catch {
    currentShortcut = "";
  }

  renderShortcut();
}

function renderShortcut(): void {
  shortcutValueElement.textContent = currentShortcut || messages.shortcutNotSet;
  shortcutValueElement.dataset.state = currentShortcut ? "set" : "unset";
}

function applyLanguage(setting: LanguageSetting): void {
  const locale = resolveLocale(setting, navigator.language);
  messages = getMessages(locale);
  translateDocument(locale);
  renderShortcut();
}

function translateDocument(locale: Locale): void {
  const m = getMessages(locale);

  document.documentElement.lang = locale;

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-i18n]"),
  );

  for (const element of elements) {
    const key = element.dataset.i18n as keyof Messages | undefined;

    if (key && key in m) {
      element.textContent = m[key];
    }
  }

  document.title = m.pageTitle;
}

async function loadSettings(): Promise<Settings> {
  const saved = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  return {
    eagleHost: normalizeHost(saved.eagleHost),
    eaglePort: normalizePort(saved.eaglePort),
    defaultFolderId:
      typeof saved.defaultFolderId === "string"
        ? saved.defaultFolderId
        : DEFAULT_SETTINGS.defaultFolderId,
    language: normalizeLanguage(saved.language),
  };
}

async function saveSettings(): Promise<void> {
  const settings = readFormSettings();

  try {
    await chrome.storage.sync.set(settings);
  } catch (error) {
    console.warn("yt-cap: 設定を保存できませんでした", error);
    setStatus(messages.settingsSaveFailed, "error");
    return;
  }

  // 正規化後の値（許可外のホストや不正なポートは既定値に戻る）を入力欄へ戻す。
  hostInput.value = settings.eagleHost;
  portInput.value = String(settings.eaglePort);
  folderInput.value = settings.defaultFolderId;
  applyLanguage(settings.language);
  setStatus(messages.saved, "success");
}

async function testConnection(): Promise<void> {
  const settings = readFormSettings();
  setStatus(messages.testing);

  try {
    const response = await fetch(
      `http://${settings.eagleHost}:${settings.eaglePort}/api/application/info`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setStatus(messages.connectOk, "success");
  } catch {
    setStatus(messages.connectFail, "error");
  }
}

function readFormSettings(): Settings {
  return {
    eagleHost: normalizeHost(hostInput.value),
    eaglePort: normalizePort(portInput.value),
    defaultFolderId: folderInput.value.trim(),
    language: normalizeLanguage(languageSelect.value),
  };
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

function normalizeLanguage(value: unknown): LanguageSetting {
  return value === "en" || value === "ja" || value === "auto"
    ? value
    : DEFAULT_SETTINGS.language;
}

function setStatus(
  message: string,
  variant: "normal" | "error" | "success" = "normal",
): void {
  statusElement.textContent = message;
  statusElement.dataset.variant = variant;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Options page is missing ${selector}`);
  }

  return element;
}
