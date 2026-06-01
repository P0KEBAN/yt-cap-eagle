<div align="center">

# 🎬 yt-cap-eagle

**YouTubeサムネイルをワンキーで[Eagle](https://eagle.cool/)に保存するChrome拡張**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Eagle](https://img.shields.io/badge/Eagle-API%20V1-0AC18E?style=for-the-badge)](https://eagle.cool/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

YouTube動画ページを閲覧中に **`⌘⇧Y`** を押すだけで、最高画質のサムネイルをプレビュー＆Eagleに保存できます。

**[🇺🇸 English README](README.md)**

</div>

<br>

## ✨ 特徴

| | 機能 | 説明 |
|:---|:---|:---|
| 🖼️ | **高画質サムネイル取得** | `maxresdefault` → `sddefault` → `hqdefault` の順で最適な画質を自動解決 |
| ⌨️ | **キーボードショートカット** | `⌘⇧Y` / `Ctrl+Shift+Y` でプレビューを即表示 |
| 👁️ | **プレビュー付き保存** | 保存前にサムネイルを確認、`Enter` で保存・`Escape` でキャンセル |
| 📂 | **保存先の選択** | `Enter` でデフォルトフォルダ、`⌘Enter` でインボックスに保存 |
| 🎯 | **幅広いURL対応** | 通常の動画ページ、Shorts、`youtu.be` 短縮URLすべてに対応 |
| 🔧 | **設定画面** | 拡張機能の右クリックメニューからEagle API接続先などを設定可能 |

<br>

## 🔧 技術スタック

```
Chrome Extension (Manifest V3)
├── TypeScript 5.4          … 型安全な開発
├── Eagle Web API V1        … サムネイル登録
├── Chrome Scripting API    … コンテンツスクリプト注入
├── Chrome Storage API      … 設定の永続化
└── Chrome Notifications    … 保存完了通知
```

<br>

## 🚀 セットアップ

### 前提条件

- [Eagle](https://eagle.cool/) がインストール・起動済みであること
- [Node.js](https://nodejs.org/) がインストール済みであること
- Google Chrome / Chromium系ブラウザ

### インストール手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/P0KEBAN/yt-cap-eagle.git
cd yt-cap-eagle

# 2. 依存関係をインストール
npm install

# 3. TypeScriptをビルド
npm run build
```

### Chromeへの登録

1. `chrome://extensions` を開く
2. **デベロッパーモード** を有効化（右上のトグル）
3. **「パッケージ化されていない拡張機能を読み込む」** をクリック
4. クローンしたフォルダを選択

> [!TIP]
> コードを変更した場合は `npm run build` を実行し、`chrome://extensions` で拡張機能の **更新ボタン** を押してください。

<br>

## 📖 使い方

```
                ┌──────────────────────────────┐
                │    YouTube動画ページを開く      │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │   ⌘⇧Y  or ツールバーボタン     │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │   サムネイルプレビューが表示     │
                └──────────────┬───────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐
          │  Enter: 保存     │   │  Escape: 取消   │
          │  ⌘Enter: 受信箱  │   │                 │
          └─────────────────┘   └─────────────────┘
```

### 初回設定

1. 拡張機能アイコンを **右クリック** →「**オプション**」を選択
2. Eagle APIの接続先を設定
3. 「**接続テスト**」ボタンでEagle APIへの接続を確認

> [!NOTE]
> ショートカットが動作しない場合は `chrome://extensions/shortcuts` で `yt-cap` のショートカットキーを手動設定してください。Manifestの `suggested_key` はあくまで候補で、Chrome側の状態により自動設定されない場合があります。

### デフォルト保存先の変更

設定画面の「**デフォルト保存先フォルダID**」を指定すると、サムネイルの保存先フォルダを変更できます。

1. Eagle アプリで保存先にしたいフォルダを **右クリック**
2. 「**リンクをコピー**」を選択
3. コピーされたURL（例: `http://localhost:41595/folder?id=XXXXX`）から **`XXXXX` 部分（フォルダID）** をコピー
4. 設定画面の「デフォルト保存先フォルダID」欄に貼り付けて保存

> [!TIP]
> フォルダIDを空にすると、Eagle側のデフォルトの場所に保存されます。

<br>

## 📁 プロジェクト構成

```
yt-cap-eagle/
├── 📄 manifest.json        … Chrome拡張のマニフェスト (MV3)
├── 📦 package.json          … npm設定・ビルドスクリプト
├── ⚙️ tsconfig.json         … TypeScript設定
├── 🎨 icons/                … 拡張機能アイコン (16/48/128px)
├── 📂 src/
│   ├── background.ts       … Service Worker (メインロジック)
│   ├── content.ts           … コンテンツスクリプト (プレビューUI)
│   ├── i18n.ts              … 国際化 (en/ja)
│   ├── options.html         … 設定画面HTML
│   ├── options.ts           … 設定画面ロジック
│   ├── options.css          … 設定画面スタイル
│   ├── overlay.css          … プレビューオーバーレイスタイル
│   └── types.ts             … 型定義
├── 📂 dist/                 … ビルド出力 (生成ファイル)
└── 📂 docs/                 … 開発メモ・要件定義
```

<br>

## 🛠️ 開発

```bash
# 型チェックのみ実行
npm run typecheck

# ビルド
npm run build
```

<br>

## ⚠️ 既知の制限事項

- Eagle デスクトップアプリが **起動していない** 場合は保存に失敗します
- YouTube以外のサイトでは動作しません
- プライベート動画・年齢制限付き動画はサムネイルが取得できない場合があります

<br>

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

<br>

---

<div align="center">

**[⬆ トップへ戻る](#-yt-cap-eagle)**

Made with ❤️ for [Eagle](https://eagle.cool/) users

</div>
