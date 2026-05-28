# yt-cap

YouTubeの現在の動画サムネイルをEagleへ保存するChrome拡張です。

## 現在できること

- YouTube動画ページ、Shorts、`youtu.be` の動画ID取得
- `maxresdefault`、`sddefault`、`hqdefault` の順でサムネイルURLを解決
- Eagle Web API V1 `POST /api/item/addFromURL` でサムネイルを登録
- `Cmd+Shift+Y` / `Ctrl+Shift+Y` でサムネイルプレビューを表示
- `Enter` でデフォルト保存先、`Cmd+Enter` でインボックスに保存
- ツールバーボタンからもサムネイルプレビューを表示
- 拡張機能の右クリックメニューから設定画面を開く

## 使い方

1. Eagleを起動しておく
2. `npm install`
3. `npm run build`
4. Chromeの `chrome://extensions` でデベロッパーモードを有効化
5. 「パッケージ化されていない拡張機能を読み込む」からこのフォルダを選択
6. 変更後は `chrome://extensions` の yt-cap で更新ボタンを押す
7. 拡張機能を右クリックして「オプション」から設定画面を開く
8. 「接続テスト」でEagle APIにつながることを確認
9. YouTube動画ページで `Cmd+Shift+Y` を実行
10. プレビューが出たら `Enter` で保存、`Escape` でキャンセル

Chromeがショートカットを割り当てていない場合は、`chrome://extensions/shortcuts` で yt-cap のショートカットを設定します。Manifestの `suggested_key` は候補であり、Chrome側の状態によっては自動設定されません。
