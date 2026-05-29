# 調査メモ: 保存時に「Unable to download all specified images.」が表示されるバグ

- 日付: 2026-05-29
- 対象: yt-cap（YouTubeサムネイルをEagleに保存するChrome拡張 / Manifest V3）
- 結論: **Eagleとは無関係。成功通知 `chrome.notifications.create` の失敗が、保存失敗として表示されていた。**

---

## 1. 症状

- サムネイル保存を実行すると、Eagleには**画像が正しく保存される**（動作自体は問題ない）。
- にもかかわらず、拡張のオーバーレイ下部に英語で `Unable to download all specified images.` というエラーが表示される。

## 2. 誤診とその経緯（重要）

エラー文言が「ダウンロードできない」系だったため、当初は **Eagleの `addFromURL` がサムネイルをダウンロードできず、その警告を返している** と解釈していた。

この誤った前提のもとで、過去に以下の試行錯誤が行われていた（いずれも的外れ／効果なし）:

- Eagle保存を base64 経由に変更 → revert
- Eagle保存をローカルファイル経由に変更 → revert
- `addFromURL` のbodyに `headers: { referer }` を付与 → 削除
- レスポンスの `status !== "success"` かつメッセージが「unable to download all specified images」を含む場合に**成功扱いにする抑制処理**（`isKnownEagleDownloadWarning`）を追加

**抑制処理は一度も発火していなかった。** Eagleは常に `{"status":"success"}` を返すため、`status !== "success"` の分岐自体に入らなかった。エラー文言の見た目に引きずられて発生源を誤認したのが根本の遠回り要因。

## 3. 切り分け手順（再発時はこの順でやる）

1. **Eagleの実レスポンスを直接確認（curl）**
   - `POST http://localhost:41595/api/item/addFromURL` を、正常URL・404・無効ドメイン・`headers`付き・無効`folderId`・Content-Type違いなど**あらゆる条件**で叩く。
   - 結果: **どの条件でも同期レスポンスは常に `{"status":"success"}`**。`addFromURL` は「URLを渡すだけ」のfire-and-forgetで、実ダウンロードは非同期。成否はレスポンスに乗らない。
   - → この時点で「Eagleがエラー文言を返している」説は否定される。

2. **保存済みアイテムの実体を確認**
   - `GET /api/item/list?orderBy=CREATEDATE` で直近保存を確認 → サムネイルは 1280x720 / 数百KB で**正常にダウンロード済み**。Eagle側の失敗は起きていない。

3. **拡張側にデバッグログを計装**
   - `background.ts`: Eagleへのリクエストbody・生レスポンステキスト・解析結果をログ。
   - `content.ts`: 背景から受け取った `response` をそのままログ。さらに**ビルドタグ**を埋め、古いインスタンス混在を検知。
   - `background.ts` のメッセージ応答に `_bgTag` / `_seq` を刻印し、「どの背景がどの応答を返したか」を物理的に特定。

4. **ログの突き合わせで矛盾を発見**
   - Service Worker側: `raw response text: {"status":"success"}` → `parsed result: success` → なのに `sendResponse ERROR`。
   - content側: `{"ok":false,"error":"Unable to download all specified images.","_bgTag":"...","_seq":1}`。
   - **`status === "success"` で抑制ブロックをスキップした後、`catch` に落ちている** = `status` チェック後の処理が例外を投げている。
   - その位置にあるのは `await notify("…保存しました")`（`chrome.notifications.create`）**だけ**。

## 4. 根本原因

`chrome.notifications.create` は、`iconUrl` で指定した画像を読み込めないと **`Unable to download all specified images.` という例外（Chrome側の文言）** を投げる。

- アイコンファイル（`icons/icon-128.png`）自体は正常なPNG。問題はパス解決。
- **MV3のService Worker内では、相対パス `iconUrl: "icons/icon-128.png"` が解決できず**、画像読み込みに失敗して例外になっていた。
- その例外が `saveThumbnail` を抜けて `onMessage` の `catch` に捕捉され、`{ ok: false, error: "Unable to download all specified images." }` としてcontentに返り、オーバーレイにエラー表示されていた。
- Eagleへの保存自体は通知より前に完了しているため、「保存はできているのにエラーが出る」状態になっていた。

つまりエラー文言の出どころは **Eagleでもサムネイルダウンロードでもなく、成功通知のアイコン読み込み**だった。

## 5. 修正

`src/background.ts` の `notify()` のみ変更:

1. **アイコンを絶対URL化**: `iconUrl: chrome.runtime.getURL("icons/icon-128.png")`
   - MV3 SWでのパス解決失敗を回避。通知が正しくアイコン付きで出るようになる。
2. **通知の例外を握りつぶす（try/catch）**: 通知はあくまで副作用。OS側で通知無効など別要因で失敗しても、**保存の成否判定には絶対に影響させない**。本質的にはこちらが効く。

あわせて、誤診ベースの**デッドコードを削除**:
- `isKnownEagleDownloadWarning` 関数と、`status !== "success"` 分岐内の特例ブロックを削除。
- `extractEagleMessage` 等は、本物のEagleエラー時のメッセージ抽出に使うため残置。

## 6. 教訓

- **エラー文言の意味に引きずられない。** 「download」という単語からEagle/ネットワークを疑ったが、実体は通知APIのアイコン読み込みだった。文言は発生源の特定には使えても、原因の断定には使えない。
- **「成功しているのにエラー」は、本処理の後の副作用（通知・ログ・クリーンアップ）を疑う。** 本処理（保存）が終わった後で例外が出ると、成功が失敗として報告されうる。
- **副作用（通知）は本処理の成否に影響させない。** 通知・分析送信などは try/catch で隔離するのが定石。
- **MV3 Service Workerでは拡張内リソースのパスは `chrome.runtime.getURL()` で絶対URL化する。** 相対パスは文脈によって解決できない。
- **切り分けは「どこまで正常か」を外側から確定させる。** curlでEagle単体、item/listで保存実体、両コンソールのログ突き合わせ、応答へのタグ刻印、と層ごとに潰したことで矛盾点（success応答なのにcatch）が浮かび、原因に到達できた。
