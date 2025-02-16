# SNBT Translation Tool

Minecraft の modpack にあるクエストブックを日本語化するためのツールです。

## 使用方法

基本的な使用方法：

```bash
python snbt-trans.py <SNBTファイルのディレクトリ>
```

特定のフェーズのみを実行する場合：

```bash
python snbt-trans.py -p <フェーズ番号> <SNBTファイルのディレクトリ>
```

オプション：

- `-p`, `--phase`: 実行するフェーズを指定（1: SNBT 抽出, 2: 翻訳, 3: バックアップと翻訳適用）
  - 省略時は全フェーズを実行
  - `1`: Phase 1（SNBT 抽出）のみを実行
  - `2`: Phase 2（翻訳処理）のみを実行
  - `3`: Phase 3（バックアップと翻訳適用）のみを実行

使用例：

```bash
# 全フェーズを実行
python snbt-trans.py chapters

# Phase 1（SNBT抽出）のみを実行
python snbt-trans.py -p 1 chapters

# Phase 2（翻訳処理）のみを実行
python snbt-trans.py -p 2 chapters
```

注意事項：

- Phase 2 を単独で実行する場合、事前に Phase 1 が実行済みであることを確認してください
- all.json が存在しない場合、Phase 1 の実行が必要です

## 環境設定

1. 必要なパッケージのインストール

   ```bash
   pip install anthropic
   ```

2. 環境変数の設定
   ```bash
   export ANTHROPIC_API_KEY="your-api-key"
   ```

## 機能概要

このツールは以下の手順で SNBT ファイルの翻訳を行います：

1. SNBT ファイルから description の英文を抽出
2. Claude API を使用して日本語に翻訳
3. 翻訳した内容で SNBT ファイルを更新

## 実装状況

### Phase 1: SNBT ファイルの処理 ✅

- SNBT ファイルから description の抽出
- all.json の管理（新規作成/更新）
- 未翻訳エントリの管理

### Phase 2: 翻訳処理 ✅

- Claude API を使用した翻訳機能の実装
- Minecraft 特殊記法（&a など）の保持
- 10 エントリごとの進捗保存
- エラーハンドリング

### Phase 3: バックアップと翻訳適用 ✅

- SNBT ファイルのバックアップ作成機能
- `{元ファイル名}.bak`形式でバックアップを作成
- 既存バックアップの保護（上書きなし）
- 翻訳済みテキストの適用
  - all.json の翻訳データを使用
  - SNBT ファイル内の英語テキストを日本語に置換
- 翻訳前後の差分表示
  - バックアップファイルと更新後のファイルの差分を表示
  - 変更された部分を強調表示して確認が容易

## 技術仕様

### データ管理

翻訳データは all.json で管理されます：

```json
{
  "descriptions": [
    {
      "file": "utilities.snbt",
      "en": "The &aChisel&f mod allows you to add a lot of variety to your builds. The tool itself has &bno durability&f, so feel free to go wild with it.",
      "ja": "&aチゼル&fモッドを使うと、建築物にさまざまな変化を加えることができます。このツール自体は&b耐久性がない&fので、思い切って使い倒してください。"
    }
  ]
}
```

### 処理フロー

1. **SNBT ファイルの処理**

   - chapters/\*.snbt から description の文字列を抽出
   - 正規表現パターン: `description: \[([\s\S]*?)\]`
   - 新規の英文を all.json に追加

2. **翻訳処理**

   - 未翻訳エントリを 10 件ずつ処理
   - Minecraft 特殊記法（&a など）を保持
   - 進捗を自動保存（途中再開可能）

3. **ファイル更新**
   - 更新前に`{元ファイル名}.bak`形式でバックアップを作成（既存バックアップは保護）
   - 翻訳済みの日本語で description を更新
   - 翻訳前後の差分を表示
     - 変更前（英語）と変更後（日本語）の内容を比較
     - 追加・削除・変更された行を色分けして表示
     - Minecraft 特殊記法（&a など）の保持を確認

### バックアップ管理

- バックアップファイル名：`{元ファイル名}.bak`（例：utilities.snbt.bak）
- バックアップのタイミング：SNBT ファイル更新前
- バックアップポリシー：
  - バックアップファイルが存在しない場合のみ作成
  - 既存のバックアップは保護（上書きなし）

### エラーハンドリング

- ファイル読み書きエラー → エラーメッセージを表示して次へ
- 正規表現マッチ失敗 → 該当ファイルをスキップ
- 翻訳失敗 → 空文字で保存し、次回実行時に再試行

## 開発メモ

### 2024-02-16

- Phase 1 の実装完了
  - SNBT ファイルの読み込みと解析
  - description 配列の抽出
  - all.json の管理機能
- Phase 2 の実装
  - Claude API を使用した翻訳機能
  - 10 エントリごとの進捗保存
  - Minecraft 特殊記法の保持機能
- Phase 3 の実装
  - SNBT ファイルのバックアップ機能の追加
  - 既存バックアップの保護機能
  - 翻訳済みテキストの適用機能
    - all.json の翻訳データを使用した置換処理
    - SNBT ファイル更新機能
