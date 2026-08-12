# 生産管理ミニマムシミュレーター

受注情報を入力すると、それが各ドメイン（受注・マスタ・調達・在庫・生産・出荷）へ伝播し出荷に至るまでの流れを、
動くシミュレーターとして可視化する教材アプリ。小型コンベア装置（多階層BOM）を題材にしている。

## セットアップ

```
npm install
npm run dev
```

## テスト

```
npm test
```

`docs/design.md` §9-1（クリティカルパス演習）・§9-2（優先順位ルール演習）の日数表を自動テストとして
再現しており、ドメインロジックの検証に使っている。GitHub ActionsでPR発行時に自動実行される
（`.github/workflows/test.yml`）。

## GitHub Pagesへの公開

バックエンドを持たない静的SPAなので、そのままGitHub Pagesで公開できる。
リポジトリの Settings → Pages → Source は **GitHub Actions** に設定済み。

`master` ブランチにpushすると `.github/workflows/deploy.yml` が `npm run build` の成果物（`dist/`）を
自動でPagesにデプロイする（`workflow_dispatch` で手動実行も可能）。公開URLは
`https://<ユーザー名またはOrg名>.github.io/mini-simulator/`
（プロジェクトサイトなのでリポジトリ名がパスに入る）。

`vite.config.ts` の `base: "/mini-simulator/"` はこの公開パスに合わせて設定してある。
リポジトリ名を変更した場合はここも合わせて変更すること。ルーティングライブラリは使っておらず
（タブ切り替えはコンポーネントstateのみ）、SPA用の404リダイレクト対策は不要。

## ドキュメント

- **[docs/design.md](./docs/design.md)** — フル仕様書。業務ルール・画面設計・演習シナリオなど、
  この壁打ちで確定した内容すべて
- **[docs/implementation-plan.md](./docs/implementation-plan.md)** — 実装計画
- **[CLAUDE.md](./CLAUDE.md)** — Claude Codeでの実装を続ける際の作業指示・現在の実装状況

ドメインロジック（受注〜出荷のシミュレーション）、メイン画面（受注入力・受注一覧ガントチャート・在庫・
出荷実績・出来事ログ）、マスタ編集画面、取消確認モーダルまで一通り実装済み。詳細はCLAUDE.mdの
「現在の実装状況」「次にやるべきこと」を参照。
