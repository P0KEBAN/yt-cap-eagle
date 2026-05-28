# yt-cap

YouTubeの現在の動画サムネイルをEagleへ保存するChrome拡張の技術検証版です。

## Phase 1でできること

- YouTube動画ページ、Shorts、`youtu.be` の動画ID取得
- `maxresdefault`、`sddefault`、`hqdefault` の順でサムネイルURLを解決
- Eagle Web API V1 `POST /api/item/addFromURL` でサムネイルを登録
- ツールバーボタンまたは `Cmd+Shift+Y` / `Ctrl+Shift+Y` で実行

## 使い方

1. Eagleを起動しておく
2. `npm install`
3. `npm run build`
4. Chromeの `chrome://extensions` でデベロッパーモードを有効化
5. 「パッケージ化されていない拡張機能を読み込む」からこのフォルダを選択
6. YouTube動画ページで拡張ボタン、または `Cmd+Shift+Y` を実行

Phase 1では設定画面は未実装です。保存先はEagleのインボックスになります。
