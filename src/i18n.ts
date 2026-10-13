import type { LanguageSetting } from "./types";

export type Locale = "en" | "ja";

export type Messages = {
  // options page
  pageTitle: string;
  shortcut: string;
  shortcutNotSet: string;
  shortcutChange: string;
  shortcutHint: string;
  eagleHost: string;
  eaglePort: string;
  defaultFolderId: string;
  folderHint: string;
  language: string;
  languageAuto: string;
  save: string;
  testConnection: string;
  saved: string;
  settingsSaveFailed: string;
  testing: string;
  connectOk: string;
  connectFail: string;
  // overlay (content script)
  loading: string;
  thumbnailLoading: string;
  saving: string;
  saveHint: string;
  thumbnailFailed: string;
  // background
  unsupportedPage: string;
  cannotRunHere: string;
  savedToEagle: string;
  eagleNotRunning: string;
  cannotConnectEagle: string;
  saveToEagleFailed: string;
  saveFailed: string;
  // Eagle annotation labels
  annotationChannel: string;
  annotationUploaded: string;
  annotationVideoId: string;
  annotationCapturedAt: string;
};

export const MESSAGES: Record<Locale, Messages> = {
  en: {
    pageTitle: "yt-cap for Eagle Settings",
    shortcut: "Keyboard shortcut",
    shortcutNotSet: "Not set",
    shortcutChange: "Set shortcut",
    shortcutHint:
      "Shortcut keys are changed in the browser's settings. Even without a shortcut, you can use yt-cap for Eagle by clicking its icon in the toolbar.",
    eagleHost: "Eagle API host",
    eaglePort: "Eagle API port",
    defaultFolderId: "Default folder (link or ID)",
    folderHint:
      "Right-click a folder in Eagle, choose \"Copy Link\", and paste it here as-is — the folder ID is extracted automatically (entering the ID directly also works). If left empty, saving with Enter also goes to the inbox.",
    language: "Language",
    languageAuto: "Auto (follow browser)",
    save: "Save",
    testConnection: "Test connection",
    saved: "Saved",
    settingsSaveFailed: "Could not save the settings",
    testing: "Connecting...",
    connectOk: "Connected to Eagle API",
    connectFail: "Cannot connect to Eagle API",
    loading: "Loading...",
    thumbnailLoading: "Thumbnail is still loading",
    saving: "Saving...",
    saveHint: "Enter to save / Cmd+Enter for inbox",
    thumbnailFailed: "Could not fetch the thumbnail",
    unsupportedPage: "This page is not supported",
    cannotRunHere: "Cannot run on this page",
    savedToEagle: "Saved the thumbnail to Eagle",
    eagleNotRunning: "Eagle is not running",
    cannotConnectEagle: "Cannot connect to Eagle API",
    saveToEagleFailed: "Failed to save to Eagle",
    saveFailed: "Failed to save the thumbnail",
    annotationChannel: "Channel",
    annotationUploaded: "Uploaded",
    annotationVideoId: "Video ID",
    annotationCapturedAt: "Captured",
  },
  ja: {
    pageTitle: "yt-cap for Eagle 設定",
    shortcut: "ショートカットキー",
    shortcutNotSet: "未設定",
    shortcutChange: "ショートカットを設定",
    shortcutHint:
      "ショートカットキーはブラウザの設定画面で変更します。未設定でも、ツールバーの yt-cap for Eagle アイコンをクリックすれば同じように使えます。",
    eagleHost: "Eagle APIホスト",
    eaglePort: "Eagle APIポート",
    defaultFolderId: "デフォルト保存先フォルダ（リンクまたはID）",
    folderHint:
      "Eagleで保存先のフォルダを右クリック →「リンクをコピー」を選び、そのまま貼り付けてください。フォルダIDだけを自動で取り出します（IDを直接入力してもOKです）。空欄の場合、Enter保存もインボックスに入ります。",
    language: "言語",
    languageAuto: "自動（ブラウザに合わせる）",
    save: "保存",
    testConnection: "接続テスト",
    saved: "保存しました",
    settingsSaveFailed: "設定を保存できませんでした",
    testing: "接続確認中...",
    connectOk: "Eagle APIに接続できました",
    connectFail: "Eagle APIに接続できません",
    loading: "読み込み中...",
    thumbnailLoading: "サムネイルを読み込み中です",
    saving: "保存中...",
    saveHint: "Enterで保存 / Cmd+Enterでインボックス",
    thumbnailFailed: "サムネイルを取得できませんでした",
    unsupportedPage: "このページは対応していません",
    cannotRunHere: "このページでは実行できません",
    savedToEagle: "サムネイルをEagleに保存しました",
    eagleNotRunning: "Eagleが起動していません",
    cannotConnectEagle: "Eagle APIに接続できません",
    saveToEagleFailed: "Eagleへの保存に失敗しました",
    saveFailed: "サムネイル保存に失敗しました",
    annotationChannel: "チャンネル",
    annotationUploaded: "投稿日",
    annotationVideoId: "動画ID",
    annotationCapturedAt: "取得日時",
  },
};

/**
 * 言語設定とブラウザUI言語から実際に使うロケールを決定する。
 * "auto" のときだけブラウザ言語を見て、ja始まりなら日本語、それ以外は英語。
 */
export function resolveLocale(
  setting: LanguageSetting,
  uiLanguage: string,
): Locale {
  if (setting === "en" || setting === "ja") {
    return setting;
  }

  return uiLanguage.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}
