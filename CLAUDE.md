# CLAUDE.md - trans-snbt プロジェクトガイド

## ファイル構成

- `extract.json`: Minecraft のクエストブックの英語と日本語の対を管理する JSON ファイル
- `trans.json`: 翻訳処理用の JSON ファイル（.gitignore に含まれる）
- `*.snbt`: Minecraft のクエストブックのファイル
- `chapters/*.snbt`: 翻訳前のクエストブックファイル置き場
- `trans-chapters/*.snbt`: 翻訳後のクエストブックファイル置き場
- `sample.snbt`: SNBT ファイルのサンプル

## 開発コマンド

- SNBT から翻訳用 JSON 生成: `deno run --allow-read --allow-write extract.ts <SNBTファイル> extract.json`
- 翻訳 API 実行: `deno run --allow-read --allow-write --allow-net --allow-env translate.ts extract.json`
- 翻訳済み SNBT 生成: `deno run --allow-read --allow-write create.ts <元SNBTファイル> <出力SNBTファイル>`
- コード整形: `deno fmt`
- リント: `deno lint`
- 型チェック: `deno check *.ts`
- 個別ファイル実行: `deno run --allow-read --allow-write <ファイル名>.ts`
- 依存関係更新: `deno cache --lock=deno.lock --lock-write deps.ts`

## コードスタイル規約

- **インポート**: `deps.ts` で依存関係を一元管理し、直接 URL からのインポートは避ける
- **型安全**: 必ず明示的な型定義（interface/type）を使用し、`unknown` 型のエラーは適切に処理
- **命名規則**: キャメルケース（変数/関数）、パスカルケース（クラス/インタフェース）を使用
- **エラー処理**: try/catch で例外を捕捉し、具体的なエラーメッセージを提供
- **フォーマット**: Deno 標準（`deno fmt`）に従い、セミコロン省略、ダブルクォート使用
- **コメント**: 関数には目的を説明するコメントを、複雑なロジックには処理内容を記述
- **非同期処理**: async/await パターンを使用し、Promise チェーンは避ける
