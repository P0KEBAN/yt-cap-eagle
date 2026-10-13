/**
 * 設定欄に入力された値から Eagle のフォルダIDを取り出す。
 * Eagle の「リンクをコピー」で得られるリンクをそのまま貼り付けられるようにするため、
 * 次の形式を受け付ける。どれにも当てはまらなければ、入力をIDそのものとして扱う。
 *   - http://localhost:41595/folder?id=XXXXX
 *   - eagle://folder/XXXXX
 */
export function normalizeFolderId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const input = value.trim();
  const fromQuery = input.match(/[?&]id=([^&#\s]+)/);

  if (fromQuery) {
    return safeDecode(fromQuery[1]);
  }

  const fromEagleScheme = input.match(/^eagle:\/\/folder\/([^/?#\s]+)/i);

  if (fromEagleScheme) {
    return safeDecode(fromEagleScheme[1]);
  }

  return input;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
