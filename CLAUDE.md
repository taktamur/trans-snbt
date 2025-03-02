# CLAUDE.md - trans-snbt プロジェクトガイド

## ファイル

- extract.json: Minefract のクエストブックの英語と日本語の対を管理する json ファイル
- .snbt: Minecraft のクエストブックのファイル
- original/\*.snbt 翻訳前のクエストブックファイル置き場
- translated/\*.snbt 翻訳後のクエストブックファイル置き場

## コマンド

- snbt ファイルから翻訳ファイルを生成する: `deno run --allow-read --allow-write extract.ts <SNBTファイル> extract.json`
- claude api を使って翻訳ファイルを翻訳: `deno run --allow-read --allow-write --allow-net --allow-env translate.ts <SNBTファイル> extract.json`
- 翻訳ファイルを元に、snbt ファイルを翻訳する: `deno run --allow-read --allow-write create.ts <元のSNBTファイル> <翻訳後のSNBTファイル`
- コード整形: `deno fmt`
- リント: `deno lint`
- 型チェック: `deno check main.ts`
- ロックファイル生成: `deno cache --lock=deno.lock --lock-write deps.ts`

## コードスタイルガイドライン

- **インポート**: deps.ts でインポートマップを使用して依存関係を管理
- **型**: 常に TypeScript のインターフェースと型を使用
- **フォーマット**: Deno のスタイルガイドに従う（deno fmt を使用）
- **エラー処理**: 具体的なエラーメッセージを含む try/catch ブロックを使用
- **環境**: 設定には dotenv と Deno.env.get()を使用
