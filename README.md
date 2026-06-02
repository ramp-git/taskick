# taskick

localStorage に保存するシンプルなタスク管理 Web アプリです。
表示部分は React で描画します。React / ReactDOM は CDN から読み込みます。

## 機能

- タスク一覧
  - 未完了タスク / 完了タスクの表示
  - 今日 / 期限切れ / 期限なしの状況表示
    - 期限入力項目は未確認のため、現在は全タスクを「期限なし」として扱います。
- タスク操作
  - 追加
  - 完了 / 未完了切替
  - 編集
  - 削除
  - 上下ボタンによる並び替え
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
