// 東京時間 (JST) で日付/時刻を整形するユーティリティ。
// サーバー (Vercel = UTC) とブラウザでタイムゾーンが異なると表示がズレるため、
// 試合時刻・イベント日時など日本ローカル基準で見せたい値は必ずこのヘルパーを使う。

const JST = 'Asia/Tokyo'

type DateInput = string | number | Date

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

// JST の各要素を取り出す。
//   year/month/day/hour: 数値（非ゼロ埋め）
//   hourStr/minute: 2桁ゼロ埋め文字列（"09", "05"）
//   weekday: 曜日インデックス（0=日 .. 6=土）
export function jstParts(input: DateInput) {
  const d = input instanceof Date ? input : new Date(input)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(d)
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === t)?.value ?? ''
  const hour = Number(get('hour')) % 24 // 環境によっては真夜中が "24" になるため正規化
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour,
    hourStr: String(hour).padStart(2, '0'),
    minute: get('minute'), // "05" のようにゼロ埋め済み
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  }
}

// "M/D H:mm" 東京時間（試合一覧などの日時表示）
export function formatMatchDateTime(input: DateInput): string {
  const p = jstParts(input)
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`
}

// "YYYY/M/D" 東京時間（toLocaleDateString('ja-JP') 相当）
export function formatDateJST(input: DateInput): string {
  const p = jstParts(input)
  return `${p.year}/${p.month}/${p.day}`
}

// "YYYY/M/D HH:mm" 東京時間（掲載期間など日付＋時刻）
export function formatDateTimeJST(input: DateInput): string {
  const p = jstParts(input)
  return `${p.year}/${p.month}/${p.day} ${p.hourStr}:${p.minute}`
}

// "YYYY-MM-DD" 東京時間（カレンダーの日付キーなど）
export function toJSTDateKey(input: DateInput): string {
  const p = jstParts(input)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

// 保存済みの絶対時刻 → JST の壁時計 "YYYY-MM-DDTHH:mm"（<input type="datetime-local"> の value 用）
export function toJSTDateTimeLocal(input: DateInput): string {
  const p = jstParts(input)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${p.hourStr}:${p.minute}`
}

// datetime-local の値（JST の壁時計 "YYYY-MM-DDTHH:mm"）→ UTC の ISO 文字列。
// ブラウザのタイムゾーンに関係なく常に JST として解釈する（日本はサマータイム無し = 固定 UTC+9）。
export function jstWallClockToISO(local: string): string {
  const withSeconds = local.length === 16 ? `${local}:00` : local
  return new Date(`${withSeconds}+09:00`).toISOString()
}

// JST の「その月の1日 00:00」を UTC の ISO 文字列で返す。
// month は 1-12 だが 0（前年12月）や 13（翌年1月）も繰り上げ/繰り下げして受け付ける。
// サーバー (UTC) で new Date(y, m, 1) を使うと UTC の月初 = JST 月初の9時間後になり、
// 月初9時間分の試合が集計から漏れるため、月次集計の境界は必ずこれを使う。
export function jstMonthStartISO(year: number, month: number): string {
  const y = year + Math.floor((month - 1) / 12)
  const m = ((((month - 1) % 12) + 12) % 12) + 1
  return jstWallClockToISO(`${y}-${String(m).padStart(2, '0')}-01T00:00`)
}
