type Settings = {
  eagleHost: string;
  eaglePort: number;
  defaultFolderId: string;
};

const DEFAULT_SETTINGS: Settings = {
  eagleHost: "localhost",
  eaglePort: 41595,
  defaultFolderId: "",
};

const form = requireElement<HTMLFormElement>("#settings-form");
const hostInput = requireElement<HTMLInputElement>("#eagle-host");
const portInput = requireElement<HTMLInputElement>("#eagle-port");
const folderInput = requireElement<HTMLInputElement>("#default-folder-id");
const testButton = requireElement<HTMLButtonElement>("#test-connection");
const statusElement = requireElement<HTMLElement>("#status");

void initialize();

async function initialize(): Promise<void> {
  const settings = await loadSettings();
  hostInput.value = settings.eagleHost;
  portInput.value = String(settings.eaglePort);
  folderInput.value = settings.defaultFolderId;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveSettings();
  });

  testButton.addEventListener("click", () => {
    void testConnection();
  });
}

async function loadSettings(): Promise<Settings> {
  const saved = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  return {
    eagleHost:
      typeof saved.eagleHost === "string"
        ? saved.eagleHost
        : DEFAULT_SETTINGS.eagleHost,
    eaglePort: normalizePort(saved.eaglePort),
    defaultFolderId:
      typeof saved.defaultFolderId === "string"
        ? saved.defaultFolderId
        : DEFAULT_SETTINGS.defaultFolderId,
  };
}

async function saveSettings(): Promise<void> {
  const settings = readFormSettings();
  await chrome.storage.sync.set(settings);
  setStatus("保存しました", "success");
}

async function testConnection(): Promise<void> {
  const settings = readFormSettings();
  setStatus("接続確認中...");

  try {
    const response = await fetch(
      `http://${settings.eagleHost}:${settings.eaglePort}/api/application/info`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setStatus("Eagle APIに接続できました", "success");
  } catch {
    setStatus("Eagle APIに接続できません", "error");
  }
}

function readFormSettings(): Settings {
  return {
    eagleHost: normalizeHost(hostInput.value),
    eaglePort: normalizePort(portInput.value),
    defaultFolderId: folderInput.value.trim(),
  };
}

function normalizeHost(value: string): string {
  return (value.trim() || DEFAULT_SETTINGS.eagleHost)
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
