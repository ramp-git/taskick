# taskick

localStorage に保存するシンプルなタスク管理 Web アプリです。
表示部分は React で描画します。React / ReactDOM は CDN から読み込みます。

## 機能

- トップページ
  - 未完了タスクのみ表示
  - タスク登録日降順で表示
  - ページ下のタスク追加ボタン
- 完了タスク画面
  - 完了タスクのみ表示
  - タスク登録日降順で表示
  - 完了データ全削除
- ページ下メニュー
  - 未完了タスク
  - 完了タスク
  - 設定
- タスク操作
  - 追加
  - 完了 / 未完了切替
  - 編集
  - 削除
- 設定
  - データのエクスポート(JSON)
  - データのインポート(JSON)
  - 全データ削除
  - テーマ切替：ライト / ダーク
  - ストレージ使用状況

## データ保存先

- `localStorage`

## データ構造

```ts
type Task = {
  id: string;
  type: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};
```

## 起動方法

HTTP サーバーで確認する場合は以下を実行してください。
React / ReactDOM は CDN から読み込むため、CDN にアクセスできない環境での動作は未確認です。

```bash
npm install
npm run start
```

## ビルド

```bash
npm run build
```
