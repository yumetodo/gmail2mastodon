export interface Gmail2MastodonSettingFile {
  /**
   * max Toot length on your instance
   */
  maxTootLength?: number;
  /**
   * E-Mail adresses that you want to notify
   */
  targetEMailAdresses?: string[];
  /**
   * The mastodon instance this bot use
   */
  mastodonInstance?: string;
  /**
   * Your userid that recive notification
   */
  mastodonReciveUserId?: string;
}

interface DateLike {
  /** Gets the year using Universal Coordinated Time (UTC). */
  getUTCFullYear(): number;
  /** Gets the month of a Date object using Universal Coordinated Time (UTC). */
  getUTCMonth(): number;
  /** Gets the day-of-the-month, using Universal Coordinated Time (UTC). */
  getUTCDate(): number;
  /** Gets the day of the week using Universal Coordinated Time (UTC). */
  getUTCDay(): number;
  /** Gets the hours value in a Date object using Universal Coordinated Time (UTC). */
  getUTCHours(): number;
  /** Gets the minutes of a Date object using Universal Coordinated Time (UTC). */
  getUTCMinutes(): number;
  /** Gets the seconds of a Date object using Universal Coordinated Time (UTC). */
  getUTCSeconds(): number;
  /** Gets the time value in milliseconds. */
  getTime(): number;
}

const concatEMailAdresses = (EMailAdresses: string[]) => EMailAdresses.join(' OR ');
type DateConstructorArgumentApplyArrayType = [number, number, number?, number?, number?];
const isDateConstructorArgumentApplyArrayType = (
  arr: (number | undefined)[]
): arr is DateConstructorArgumentApplyArrayType =>
  2 <= arr.length &&
  arr.length <= 6 &&
  typeof arr[0] === 'number' &&
  typeof arr[1] === 'number' &&
  arr.every(e => typeof e === 'number' || typeof e === 'undefined');
const strToDate = (s: string) => {
  const splitted = /^(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(s);
  if (null == splitted || 7 !== splitted.length) {
    throw new Error(`date format is invalid: ${s}`);
  }
  splitted.shift();
  const parsed = splitted.map(d => parseInt(d));
  if (!isDateConstructorArgumentApplyArrayType(parsed)) {
    throw new Error(`date format is invalid: ${s}`);
  }
  parsed[1] -= 1;
  return new Date(Date.UTC.apply(null, parsed));
};
const dateToStr = (d: DateLike) =>
  `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()} ` +
  `${d.getUTCHours()}:${d.getUTCMinutes()}:${d.getUTCSeconds()}`;
const dateToQuery = (d: DateLike) => `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
//https://github.com/yumetodo/es-string-algorithm/blob/3a79d4e0c01096fab89cdf93db6dac2e27f31e13/src/index.ts#L129
//https://qiita.com/YusukeHirao/items/2f0fb8d5bbb981101be0#iv-ii-%E3%82%B5%E3%83%AD%E3%82%B2%E3%83%BC%E3%83%88%E3%83%9A%E3%82%A2%E3%81%AB%E5%AF%BE%E5%BF%9C%E3%81%97%E3%81%9F%E9%85%8D%E5%88%97%E5%8C%96
/**
 * Create part of the `s`
 * @param s string
 * @param pos copy start position
 * @param n copy length
 * @returns part of the `s` in range of `[pos...rlast]` (`rlast` is the smaller of `pos + n` and `std.size(s)`)
 * @throws {RangeError} When `pos` or `n` is negative or `pos` > `std.size(s)`
 */
const substr = (s: string, pos = 0, n?: number): string => {
  if (pos < 0) {
    throw new RangeError('std.substr: pos < 0');
  }
  if (typeof n === 'number' && n < 0) {
    throw new RangeError('std.substr: n < 0');
  }
  const arr = s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
  if (arr.length < pos) {
    throw new RangeError(`std.substr: pos (which is ${pos}) > std.size(s) (which is ${arr.length})`);
  }
  return arr.slice(pos, typeof n === 'number' ? pos + n : undefined).join('');
};
const getFile = (parentName: string, name: string) => {
  const files = DriveApp.searchFiles(`title = "${name}"`);
  while (files.hasNext()) {
    const file = files.next();
    if (name !== file.getName()) continue;
    //gmail2mastodon_settings
    const parents = file.getParents();
    if (!parents.hasNext()) continue;
    const parent = parents.next();
    if (parentName === parent.getName()) return file;
  }
  throw new Error('no such file: ');
};
const readJson = (parentName = 'gmail2mastodon_settings', jsonName = 'setting.json') => {
  const file = getFile(parentName, jsonName);
  const content = file.getBlob().getDataAsString();
  if (!content) return;
  return JSON.parse(content);
};
export function main() {
  const properties = PropertiesService.getScriptProperties();
  const lastDateStr = properties.getProperty('lastDate');
  if (null == lastDateStr) {
    console.error('missing lastDate');
    return -1;
  }
  const lastDate = strToDate(lastDateStr);
  const mastodonToken = ScriptProperties.getProperty('mastodonToken');
  if (null == mastodonToken) {
    console.error('missing mastodonToken');
    return -1;
  }
  const setting: Gmail2MastodonSettingFile = readJson();
  if (
    null == setting.targetEMailAdresses ||
    null == setting.mastodonReciveUserId ||
    null == setting.mastodonInstance ||
    null == setting.maxTootLength
  ) {
    console.error('invalid setting file');
    return -1;
  }
  const query = `after:${dateToQuery(lastDate)} from:(${concatEMailAdresses(setting.targetEMailAdresses)})`;
  const threads = GmailApp.search(query);
  const nextLastDate = Date.now();
  const messages = GmailApp.getMessagesForThreads(threads);
  for (const t of messages) {
    for (const m of t) {
      if (!m.isUnread() || m.getDate().getTime() < lastDate.getTime()) continue;
      const postText =
        setting.mastodonReciveUserId + '\\n' + `${dateToStr(m.getDate())} ${m.getSubject()}` + '\\n' + m.getBody();
      UrlFetchApp.fetch(`https://${setting.mastodonInstance}/api/v1/statuses`, {
        method: 'post',
        contentType: 'application/json',
        // limit content length by maxTootLength
        payload: `{"status":"${substr(postText, 0, setting.maxTootLength)}","visibility":"direct"}`,
        headers: { Authorization: 'Bearer ' + mastodonToken },
      });
    }
  }
  properties.setProperty('lastDate', dateToStr(new Date(nextLastDate)));
}
