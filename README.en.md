<div align="center">

<img src="icons/icon-128.png" alt="yt-cap-eagle" width="128" height="128">

# yt-cap-eagle

**Save YouTube thumbnails to [Eagle](https://eagle.cool/) with a single keystroke**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Eagle](https://img.shields.io/badge/Eagle-API%20V1-0AC18E?style=for-the-badge)](https://eagle.cool/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

[日本語](README.md) | **English**

---

Press **`⌘⇧Y`** on any YouTube video page to preview and save the highest-quality thumbnail directly to Eagle.

</div>

> [!NOTE]
> **Not using Eagle?** There is a separate version, [**yt-cap**](https://github.com/P0KEBAN/yt-cap), that downloads the thumbnail as a plain image file instead. Use that one if you want it without Eagle.

<br>

## ✨ Features

| | Feature | Description |
|:---|:---|:---|
| 🖼️ | **Hi-res thumbnails** | Automatically resolves the best quality: `maxresdefault` → `sddefault` → `hqdefault` |
| ⌨️ | **Keyboard shortcut** | `⌘⇧Y` / `Ctrl+Shift+Y` to instantly show the preview |
| 👁️ | **Preview before save** | Confirm the thumbnail, then `Enter` to save or `Escape` to cancel |
| 📂 | **Flexible destination** | `Enter` for default folder, `⌘Enter` for inbox |
| 🎯 | **Broad URL support** | Works on regular videos, Shorts, and `youtu.be` short links |
| 🔧 | **Settings page** | Configure the language, Eagle API connection, and default folder |

<br>

## 🔧 Tech Stack

```
Chrome Extension (Manifest V3)
├── TypeScript 5.4          … Type-safe development
├── Eagle Web API V1        … Thumbnail registration
├── Chrome Scripting API    … Content script injection
├── Chrome Storage API      … Persistent settings
└── Chrome Notifications    … Save completion alerts
```

<br>

## 🚀 Setup

### Prerequisites

- [Eagle](https://eagle.cool/) installed and running
- [Node.js](https://nodejs.org/) installed
- Google Chrome or any Chromium-based browser

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/P0KEBAN/yt-cap-eagle.git
cd yt-cap-eagle

# 2. Install dependencies
npm install

# 3. Build TypeScript
npm run build
```

### Load into Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the cloned folder

> [!TIP]
> After making code changes, run `npm run build` and click the **reload button** on `chrome://extensions`.

<br>

## 📖 Usage

```
                ┌──────────────────────────────┐
                │   Open a YouTube video page   │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │   ⌘⇧Y  or  toolbar button    │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │   Thumbnail preview appears   │
                └──────────────┬───────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐
          │  Enter: Save     │   │  Escape: Cancel │
          │  ⌘Enter: Inbox   │   │                 │
          └─────────────────┘   └─────────────────┘
```

### Initial Setup

1. **Right-click** the extension icon → select **"Options"**
2. The current shortcut key is shown at the top ("Not set" if none is assigned)
3. Configure the Eagle API connection (the defaults, `localhost` / `41595`, normally work as-is)
4. Click **"Test connection"** to verify

> [!NOTE]
> The extension requests `⌘⇧Y` (`Ctrl+Shift+Y` on Windows/Linux) as a suggestion, but **it may not be assigned automatically** (for example, when another extension or Chrome itself already uses that key). If nothing happens when you press the shortcut, assign it from the **"Set shortcut"** button on the options page, or from `chrome://extensions/shortcuts`.
>
> Even without a shortcut, you can use yt-cap by clicking its icon in the toolbar.

### Changing the Default Save Folder

You can change the thumbnail save destination by setting the **"Default folder ID"** in the options page.

1. In the Eagle app, **right-click** the folder you want to save to
2. Select **"Copy Link"**
3. From the copied URL (e.g. `http://localhost:41595/folder?id=XXXXX`), copy the **`XXXXX` part (the folder ID)**
4. Paste it into the "Default folder ID" field in the options page and save

> [!TIP]
> Leave the folder ID empty to save to Eagle's default location.

<br>

## 📁 Project Structure

```
yt-cap-eagle/
├── 📄 manifest.json        … Chrome extension manifest (MV3)
├── 📦 package.json          … npm config & build scripts
├── ⚙️ tsconfig.json         … TypeScript configuration
├── 🎨 icons/                … Extension icons (16/48/128px)
├── 📂 src/
│   ├── background.ts       … Service Worker (main logic)
│   ├── content.ts           … Content script (preview UI)
│   ├── i18n.ts              … Internationalization (en/ja)
│   ├── options.html         … Options page HTML
│   ├── options.ts           … Options page logic
│   ├── options.css          … Options page styles
│   ├── overlay.css          … Preview overlay styles
│   └── types.ts             … Type definitions
└── 📂 dist/                 … Build output (generated)
```

<br>

## 🛠️ Development

```bash
# Type-check only
npm run typecheck

# Build
npm run build
```

<br>

## 🔀 Other Versions

| | Saves to | Best for |
|:---|:---|:---|
| **yt-cap-eagle** (this repository) | Your [Eagle](https://eagle.cool/) library | People who manage assets in Eagle |
| [**yt-cap**](https://github.com/P0KEBAN/yt-cap) | The browser's downloads folder | People who want plain image files, without Eagle |

<br>

## ⚠️ Known Limitations

- Saving will fail if the Eagle desktop app is **not running**
- Only works on YouTube pages
- Thumbnails may not be available for private or age-restricted videos

<br>

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<br>

---

<div align="center">

**[⬆ Back to top](#yt-cap-eagle)**

Made with ❤️ for [Eagle](https://eagle.cool/) users

</div>
