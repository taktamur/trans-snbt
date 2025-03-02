# CLAUDE.md - trans-snbt プロジェクトガイド

このプロジェクトは、Minecraft のクエストブック（SNBT形式）を翻訳するためのツールセットです。SNBT ファイルから翻訳対象テキストを抽出し、Claude API で翻訳後、再度 SNBT ファイルに組み込みます。

## ファイル構成

- `src/translate.ts`: SNBT ファイルからテキストを抽出し、Claude API を使って翻訳する
- `src/extract.ts`: SNBT ファイルから翻訳対象テキストを抽出するツール
- `src/storage.ts`: SNBTファイルと翻訳データを連携する機能
- `src/lib/translation.ts`: 翻訳データの読み書きを行うユーティリティ関数
- `src/lib/snbt.ts`: SNBTファイルを処理するクラスとテキスト抽出機能
- `trans.json`: 翻訳データを管理する JSON ファイル（.gitignore に含まれる）
- `*.snbt`: Minecraft のクエストブックのファイル
- `chapters/*.snbt`: 翻訳前のクエストブックファイル置き場
- `trans-chapters/*.snbt`: 翻訳後のクエストブックファイル置き場
- `sample.snbt`: SNBT ファイルのサンプル

## 開発コマンド

- 翻訳対象テキスト抽出: `deno run --allow-read --allow-write src/extract.ts <SNBTファイル> <出力JSONファイル>`
- 翻訳処理: `deno run --allow-read --allow-write --allow-net --allow-env src/translate.ts <SNBTファイル>`
  - 必要な環境変数: `ANTHROPIC_API_KEY` (Claude API 用)
  - 翻訳データは `trans.json` に保存される
- コード整形: `deno fmt`
- リント: `deno lint`
- 型チェック: `deno check src/*.ts`
- 個別ファイル実行: `deno run --allow-read --allow-write src/<ファイル名>.ts`
- 依存関係更新: `deno cache --lock=deno.lock --lock-write`
- Rakeタスク:
  - 全SNBT抽出: `rake extract` (chapters/*.snbtから翻訳用JSONを生成)
  - クリーンアップ: `rake clear` (trans-chaptersディレクトリとtrans.jsonを削除)

## コードスタイル規約

- **型安全**: 必ず明示的な型定義（interface/type）を使用し、`unknown` 型のエラーは適切に処理
- **命名規則**: キャメルケース（変数/関数）、パスカルケース（クラス/インタフェース）を使用
- **エラー処理**: try/catch で例外を捕捉し、具体的なエラーメッセージを提供
- **フォーマット**: Deno 標準（`deno fmt`）に従い、セミコロン省略、ダブルクォート使用
- **コメント**: 関数には目的を説明するコメントを、複雑なロジックには処理内容を記述
- **非同期処理**: async/await パターンを使用し、Promise チェーンは避ける
- **API 呼び出し**: 指数バックオフと再試行の仕組みを実装し、レート制限や過負荷状態に対応する
