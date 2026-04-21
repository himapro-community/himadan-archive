# Project: himadan-archive

## 1. 開発目的
- Slack無料プランの「90日制限」による過去ログ消失を防ぐ。
- ポッドキャスト「ひまプロ」コミュニティ（ひまプロ談話室）の知見を永続化し、メンバーがいつでもブラウザから閲覧・検索・学習できる環境を構築する。

## 2. 技術スタック (Tech Stack)
- **Runtime:** Node.js (TypeScriptを実行するためのOS上の環境)
- **Backend:** Fastify (Node.js上で動く型安全で爆速なフレームワーク)
- **Language:** TypeScript (フロント・バック共通)
- **Database:** SQLite (Prisma ORM) - Fly.ioのボリュームを利用
- **Frontend:** React + Material UI (MUI) / Vite
- **Deployment:** Fly.io (コンテナベースのホスティング)
- **Design Inspiration:** Google Stitch (Material Design 3) ベース

## 3. 核心仕様 (MVP)
### A. ログ取得 (Crawler/Batch)
- **方法:** Slack Web API を使用。
- **対象:** `social-` で始まる全チャンネル、`general`, `ask-なんでも`。
- **除外:** `times-` で始まるチャンネル（初期フェーズ）。
- **頻度:** 1日1回の差分取得バッチ。
- **初回移行:** 過去90日分をインポートするための、手動実行可能な管理用CLIスクリプトを別途用意する。

### B. 認証・認可 (Zero-Touch Approval)
- **方式:** Slack OAuth 2.0 によるログイン。
- **承認自動化 (案B):** - Slack Team ID: `T08QJNR5BRU` (ひまプロ談話室)
    - ログインユーザーの所属 `team_id` が上記と一致する場合、管理者の手動承認を待たず即座に `is_approved = true` として閲覧を許可する。
    - コミュニティ外のユーザー（リンクを知っているだけの人）は閲覧不可。

### C. フロントエンド・UI/UX (Stitch Inspired)
1. **スレッド表示:** 親メッセージクリックで、MUIのDrawer（横パネル）にスレッド詳細を表示する直感的なUI。
2. **ヒートマップ:** 投稿頻度をGitHubライクなカレンダー形式で可視化し、盛り上がった日を特定可能にする。
3. **チャンネル色分け:** `social-` や `ask-` などのプレフィックスに応じたChipラベルを表示し、視認性を高める。
4. **検索機能:** 全文検索機能を備え、検索結果のキーワードを黄色くハイライト表示する。
5. **ブックマーク:** ブラウザのLocalStorageを利用した、自分専用の「お気に入り」保存機能。
6. **タイポグラフィ:** Google Fonts (Noto Sans JP) 等を使用し、清潔感のあるモダンなエンジニア向けUI。

### D. 画像・動画の扱い (拡張性)
- **初期フェーズ:** SlackのURLをそのまま参照する（バックアップはしない）。
- **将来設計:** Cloudflare R2（S3互換）へのバックアップを容易にするため、DBにはあらかじめ `backup_url` カラムを保持し、将来的にBot Tokenを使って画像をDL/UPする拡張性を担保する。

## 4. 非機能要件
- **コスト:** Fly.io の無料枠（または最小構成）で永続的に運用できること。
- **保守性:** 運用コストを最小化するため、手動承認フローを徹底的に排除する。