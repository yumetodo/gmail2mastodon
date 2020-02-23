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
const strToDate = (s: string) => {
  const splitted = /^(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(s);
  if (7 !== splitted.length) {
    throw new Error(`The value stored in script propaties is invalid: ${s}`);
  }
  splitted.shift();
  const parsed = splitted.map(d => parseInt(d));
  parsed[1] -= 1;
  return new Date(Date.UTC.apply(null, parsed));
};
const dateToStr = (d: DateLike) =>
  `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()} ` +
  `${d.getUTCHours()}:${d.getUTCMinutes()}:${d.getUTCSeconds()}`;
const dateToQuery = (d: DateLike) => `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
//https://github.com/yumetodo/es-string-algorithm/blob/3a79d4e0c01096fab89cdf93db6dac2e27f31e13/src/index.ts#L129
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
  let i = 0;
  let l = 0;
  let begin = 0;
  for (const c of s) {
    if (i === pos) {
      if (typeof n === 'number' && 0 === n) {
        return '';
      }
      begin = l;
    } else if (typeof n === 'number' && i === pos + n) {
      return s.substring(begin, l);
    }
    l += c.length;
    ++i;
  }
  if (i < pos) {
    throw new RangeError(`std.substr: pos (which is ${pos}) > std.size(s) (which is ${i})`);
  }
  if (0 === n) {
    return '';
  }
  return s.substring(begin);
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
  const lastDate = strToDate(properties.getProperty('lastDate'));
  const mastodonToken = ScriptProperties.getProperty('mastodonToken');
  if (null == mastodonToken) {
    console.error('missing mastodonToken');
    return -1;
  }
  const setting: Gmail2MastodonSettingFile = readJson();
  const query = `after:${dateToQuery(lastDate)} from:(${concatEMailAdresses(setting.targetEMailAdresses)})`;
  const threads = GmailApp.search(query);
  const nextLastDate = Date.now();
  const messages = GmailApp.getMessagesForThreads(threads);
  for (const t of messages) {
    for (const m of t) {
      if (!m.isUnread() || m.getDate().getTime() < lastDate.getTime()) continue;
      const postText = `${setting.mastodonReciveUserId}
${dateToStr(m.getDate())} ${m.getSubject()}
${m.getBody()}`;
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
