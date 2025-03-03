# trans-snbt

Minecraft クエストブック（SNBT 形式）を Claude API を使って翻訳するツールセット。

## 概要

このプロジェクトは、Minecraft のクエストブック（SNBT形式）を英語から日本語へ翻訳するための
ツールセットです。SNBT ファイルから翻訳対象テキストを抽出し、Claude API で翻訳後、
再度 SNBT ファイルに組み込みます。

## 機能

- SNBT ファイルからテキストを抽出
- Claude API を使用した高品質な翻訳
- 翻訳テキストの SNBT ファイルへの埋め込み
- 翻訳データの管理と再利用

## 必要条件

- [Deno](https://deno.land/) 1.x 以上
- Anthropic Claude API キー
- Ruby (Rake タスク実行用)

## インストール

```bash
git clone https://github.com/yourusername/trans-snbt.git
cd trans-snbt
```

## 使い方

### 環境変数設定

```bash
export ANTHROPIC_API_KEY="your_api_key_here"
```

### 基本的な使い方

1. 翻訳対象の SNBT ファイルを `chapters/` ディレクトリに配置
2. 翻訳用の JSON ファイル作成:
   ```
   rake extract
   ```
3. 翻訳の実行:
   ```
   rake translate
   ```
4. 翻訳を SNBT ファイルに適用:
   ```
   rake apply
   ```
5. 翻訳された SNBT ファイルは `trans-chapters/` ディレクトリに生成されます

すべての処理を一度に実行:
```
rake all
```

### その他のコマンド

- 個別ファイルからの抽出:
  ```
  deno run --allow-read --allow-write src/extract.ts <SNBTファイル> <出力JSONファイル>
  ```
- 個別の翻訳:
  ```
  deno run --allow-read --allow-write --allow-net --allow-env src/translate.ts <翻訳JSONファイル>
  ```
- 個別の翻訳適用:
  ```
  deno run --allow-read --allow-write src/apply.ts <SNBTファイル> <翻訳JSONファイル> <出力SNBTファイル>
  ```
- 依存関係更新:
  ```
  deno cache --lock=deno.lock --lock-write
  ```
- クリーンアップ:
  ```
  rake clear
  ```

## ファイル構成

- `src/translate.ts`: SNBT ファイルからテキストを抽出し、Claude API で翻訳
- `src/extract.ts`: SNBT ファイルから翻訳対象テキストを抽出するツール
- `src/apply.ts`: 翻訳データをSNBTファイルに適用するツール
- `src/storage.ts`: SNBT ファイルと翻訳データを連携する機能
- `src/lib/translation.ts`: 翻訳データの読み書きを行うユーティリティ関数
- `src/lib/snbt.ts`: SNBT ファイルを処理するクラスとテキスト抽出機能
- `trans.json`: 翻訳データを管理する JSON ファイル
- `chapters/*.snbt`: 翻訳前のクエストブックファイル置き場
- `trans-chapters/*.snbt`: 翻訳後のクエストブックファイル置き場

## ライセンス

MIT