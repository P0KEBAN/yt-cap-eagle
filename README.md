<div align="center">

<img src="icons/icon-128.png" alt="yt-cap-eagle" width="128" height="128">

# yt-cap-eagle

**YouTubeサムネイルをワンキーで[Eagle](https://eagle.cool/)に保存するChrome拡張**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Eagle](https://img.shields.io/badge/Eagle-API%20V1-0AC18E?style=for-the-badge)](https://eagle.cool/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**日本語** | [English](README.en.md)

---

YouTube動画ページを閲覧中に **`⌘⇧Y`** を押すだけで、最高画質のサムネイルをプレビュー＆Eagleに保存できます。

</div>

> [!NOTE]
> **Eagleを使っていない方へ**: サムネイルを画像ファイルとしてそのままダウンロードする別バージョン [**yt-cap**](https://github.com/P0KEBAN/yt-cap) があります。Eagleなしで使いたい場合はそちらをどうぞ。

<br>

## ✨ 特徴

| | 機能 | 説明 |
|:---|:---|:---|
| 🖼️ | **高画質サムネイル取得** | `maxresdefault` → `sddefault` → `hqdefault` の順で最適な画質を自動解決 |
| ⌨️ | **キーボードショートカット** | `⌘⇧Y` / `Ctrl+Shift+Y` でプレビューを即表示 |
| 👁️ | **プレビュー付き保存** | 保存前にサムネイルを確認、`Enter` で保存・`Escape` でキャンセル |
| 📂 | **保存先の選択** | `Enter` でデフォルトフォルダ、`⌘Enter` でインボックスに保存 |
| 🎯 | **幅広いURL対応** | 通常の動画ページ、Shorts、`youtu.be` 短縮URLすべてに対応 |
| 🔧 | **設定画面** | 言語・Eagle APIの接続先・デフォルト保存先フォルダを設定可能 |

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
2. いちばん上に、現在のショートカットキーが表示されます（割り当てがなければ「未設定」）
3. Eagle APIの接続先を設定（通常は初期値の `localhost` / `41595` のままで大丈夫です）
4. 「**接続テスト**」ボタンでEagle APIへの接続を確認

> [!NOTE]
> 拡張機能は `⌘⇧Y`（Windows/Linuxは `Ctrl+Shift+Y`）を候補として申請していますが、**自動では割り当てられないことがあります**（ほかの拡張機能やChrome自体が同じキーを使っている場合など）。ショートカットを押しても何も起きないときは、設定画面の **「ショートカットを設定」** ボタン、または `chrome://extensions/shortcuts` から割り当ててください。
>
> ショートカットを設定しなくても、ツールバーの yt-cap アイコンをクリックすれば同じように使えます。

### デフォルト保存先の変更

設定画面の「**デフォルト保存先フォルダ**」を指定すると、サムネイルの保存先フォルダを変更できます。

1. Eagle アプリで保存先にしたいフォルダを **右クリック**
2. 「**リンクをコピー**」を選択
3. 設定画面の「デフォルト保存先フォルダ」欄に **そのまま貼り付けて** 保存

貼り付けたリンク（例: `http://localhost:41595/folder?id=XXXXX`）から、フォルダIDの部分（`XXXXX`）だけが自動で取り出されます。フォルダIDを直接入力しても構いません。

> [!TIP]
> 欄を空にすると、Eagle側のデフォルトの場所に保存されます。

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
│   ├── folderId.ts          … フォルダリンクからのID取り出し
│   ├── i18n.ts              … 国際化 (en/ja)
│   ├── options.html         … 設定画面HTML
│   ├── options.ts           … 設定画面ロジック
│   ├── options.css          … 設定画面スタイル
│   ├── overlay.css          … プレビューオーバーレイスタイル
│   └── types.ts             … 型定義
└── 📂 dist/                 … ビルド出力 (生成ファイル)
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

## 🔀 別バージョン

| | 保存先 | こんな人向け |
|:---|:---|:---|
| **yt-cap-eagle**（このリポジトリ） | [Eagle](https://eagle.cool/) のライブラリ | Eagleで素材を管理している |
| [**yt-cap**](https://github.com/P0KEBAN/yt-cap) | ブラウザのダウンロードフォルダ | Eagleを使わず、画像ファイルとして保存したい |

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

**[⬆ トップへ戻る](#yt-cap-eagle)**

Made with ❤️ for [Eagle](https://eagle.cool/) users

</div>
