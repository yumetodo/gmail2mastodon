# gmail2mastodon

私は彼女のメールをもう見落としたくない。だからmastodonに転送するんだ。

(I don't want to overlook my girlfriend's email anymore. So transfer it to mastodon.)

[私はもう二度と彼女からのメールを見落としたくないのでSlackとMastodonに通知するようにする - Qiita](https://qiita.com/yumetodo/items/78acd1ed63b1f90fe738)

## 使用までの手順(Step to use)

### `setting.json`

Google Driveに`gmail2mastodon_settings`というフォルダを作り、その中に`setting.json`を置きます。

(Create folder and named `gmail2mastodon_settings` then, put `setting.json` in the folder.)

`setting.json`の書式は次のようなものです。

(The format of `setting.json` is below.)

```json
{
  "$schema": "https://raw.githubusercontent.com/yumetodo/gmail2mastodon/master/scheme.json",
  "mastodonInstance": "mstdn.maud.io",
  "mastodonReciveUserId": "@yumetodo@qiitadon.com",
  "maxTootLength": 500,
  "targetEMailAdresses": [
    "xxx@example.com"
  ]
}
```

JSON schemaの支援を受けられるテキストエディタ(VSCodeなど)を利用すると簡単に`setting.json`を書けます。

(You can write `setting.json` easier by using a text editor that has a support of JSON schema.)

### `.clasp.json`

`scriptId`をあなたのものに書き換えてください

(Update `scriptId` to yours.)

![script id](img/script_id.png)

### Properties Service

Web上であなたのスクリプトエディターを開き、ファイル→プロジェクトのプロパティ→スクリプトのプロパティをクリックしてください

(Open your script editor on thr web and click Files > Properties of The Porject > Properties of the Script)

![Properties Service1](https://qiita-user-contents.imgix.net/https%3A%2F%2Fqiita-image-store.s3.ap-northeast-1.amazonaws.com%2F0%2F94177%2Fc06c0e07-c2dc-b912-3588-ce2b128a5b71.png?ixlib=rb-1.2.2&auto=format&gif-q=60&q=75&w=1400&fit=max&s=45fa49b0a0719546319ee2906342d989)

![Properties Service2](https://qiita-user-contents.imgix.net/https%3A%2F%2Fqiita-image-store.s3.ap-northeast-1.amazonaws.com%2F0%2F94177%2F54f0a3fd-c7eb-9fc1-4885-e8d65b55562e.png?ixlib=rb-1.2.2&auto=format&gif-q=60&q=75&w=1400&fit=max&s=2481690ac14d61fc0aac847428aa257c)

- `mastodonToken`: 投稿用のMastodonアカウントで取得したtoken(The token get from the mastodon account to post)
- `lastDate`: `^(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$`

### Deploy

```bash
$ npm ci
$ npm run deploy
```
