import os
import sys
import json
import re
import time
import shutil
from glob import glob
from typing import List, Dict, Optional, Tuple
import anthropic
import difflib

def load_all_json():
    """all.jsonを読み込む。ファイルが存在しない場合は新規作成する"""
    if os.path.exists('all.json'):
        with open('all.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"descriptions": []}

def save_all_json(data):
    """all.jsonを保存する"""
    with open('all.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def extract_descriptions(content):
    """SNBTファイルからdescriptionを抽出する"""
    pattern = r'description: \[([\s\S]*?)\]'
    matches = re.finditer(pattern, content)
    descriptions = []
    
    for match in matches:
        # description配列の内容を取得
        desc_content = match.group(1).strip()
        # 各行を処理
        lines = [line.strip().strip('"') for line in desc_content.split('\n')]
        # 空文字とスペースのみの行を除外
        non_empty_lines = [line for line in lines if line and not line.isspace()]
        descriptions.extend(non_empty_lines)
    
    return descriptions

def create_backup(file_path: str) -> bool:
    """SNBTファイルのバックアップを作成する
    
    Args:
        file_path: バックアップを作成するファイルのパス
        
    Returns:
        bool: バックアップの作成が成功したかどうか
    """
    backup_path = f"{file_path}.bak"
    
    # バックアップが既に存在する場合は作成しない
    if os.path.exists(backup_path):
        print(f"ℹ️ {os.path.basename(backup_path)} は既に存在します")
        return False
    
    try:
        shutil.copy2(file_path, backup_path)
        print(f"✅ バックアップを作成しました: {os.path.basename(backup_path)}")
        return True
    except Exception as e:
        print(f"❌ バックアップの作成に失敗しました: {str(e)}")
        return False

def process_snbt_files(directory):
    """SNBTファイルを処理する"""
    # all.jsonを読み込む
    all_data = load_all_json()
    existing_descriptions = {item["en"]: item for item in all_data["descriptions"]}
    
    # SNBTファイルを処理
    snbt_files = glob(os.path.join(directory, "*.snbt"))
    for snbt_file in snbt_files:
        # バックアップを作成
        create_backup(snbt_file)
        filename = os.path.basename(snbt_file)
        print(f"📄 {filename} の処理を開始します...")
        
        try:
            with open(snbt_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # descriptionを抽出
            descriptions = extract_descriptions(content)
            
            # 新しい説明文を追加
            for desc in descriptions:
                # 空文字は除外
                if desc and desc not in existing_descriptions:
                    new_entry = {
                        "file": filename,
                        "en": desc,
                        "ja": ""
                    }
                    all_data["descriptions"].append(new_entry)
                    existing_descriptions[desc] = new_entry
        
        except Exception as e:
            print(f"❌ {filename} の処理中にエラーが発生しました: {str(e)}")
            continue
    
    # 更新されたデータを保存
    save_all_json(all_data)
    print("\n✅ フェーズ1が完了しました")
    print("📝 all.json が更新されました")

def get_untranslated_entries(data: Dict) -> List[Dict]:
    """未翻訳のエントリを取得する"""
    # 空のen文字列は除外し、未翻訳のエントリのみを返す
    return [entry for entry in data["descriptions"] if entry["ja"] == "" and entry["en"]]

def chunk_entries(entries: List[Dict], chunk_size: int = 10) -> List[List[Dict]]:
    """エントリを指定サイズのチャンクに分割する"""
    return [entries[i:i + chunk_size] for i in range(0, len(entries), chunk_size)]

# 使用するモデルの定義
CLAUDE_MODEL = "claude-3-5-haiku-20241022"

def create_claude_client() -> anthropic.Anthropic:
    """Claude APIクライアントを作成する"""
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
    return anthropic.Anthropic(api_key=api_key)

def translate_with_claude(client: anthropic.Anthropic, text: str) -> Optional[str]:
    """Claude APIを使用して翻訳を行う"""
    try:
        # 翻訳プロンプトを作成
        prompt = f"""
あなたはMinecraftのmodpackのクエストブックの翻訳を担当しています。
以下の英文を日本語に翻訳してください。ゲーマーにとって自然な日本語になるようにしてください。
&aなどのMinecraft特殊記法はそのまま保持してください。

英文: {text}

翻訳文のみを出力してください。
"""
        
        # 翻訳を実行
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1000,
            temperature=0,
            system="You are a professional translator specializing in Minecraft and gaming content.",
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text.strip()
    
    except Exception as e:
        print(f"❌ 翻訳エラー: {str(e)}")
        return None

def translate_entries(entries: List[Dict]) -> None:
    """エントリを翻訳する"""
    try:
        client = create_claude_client()
        for entry in entries:
            print(f"🔄 翻訳中: {entry['en']}")
            translated = translate_with_claude(client, entry['en'])
            
            if translated:
                entry['ja'] = translated
                print(f"✅ 翻訳完了: {translated}")
            else:
                entry['ja'] = ""
                print("❌ 翻訳に失敗しました。次回の実行時に再試行します")
            
            # APIレート制限を考慮して少し待機
            time.sleep(1)
    
    except Exception as e:
        print(f"❌ 翻訳処理中にエラーが発生しました: {str(e)}")

def show_diff(old_content: str, new_content: str, filename: str) -> None:
    """ファイルの差分を表示する
    
    Args:
        old_content: 変更前の内容
        new_content: 変更後の内容
        filename: ファイル名（表示用）
    """
    # 差分を計算
    diff = list(difflib.unified_diff(
        old_content.splitlines(keepends=True),
        new_content.splitlines(keepends=True),
        fromfile=f"{filename} (変更前)",
        tofile=f"{filename} (変更後)",
        n=3  # 前後3行のコンテキストを表示
    ))
    
    if diff:
        print(f"\n📊 {filename} の変更内容:")
        for line in diff:
            # 削除行は赤、追加行は緑で表示
            if line.startswith('+'):
                print(f"\033[92m{line}\033[0m", end='')  # 緑色
            elif line.startswith('-'):
                print(f"\033[91m{line}\033[0m", end='')  # 赤色
            else:
                print(line, end='')
        print()  # 空行を追加
    else:
        print(f"ℹ️ {filename} に変更はありません")

def apply_translations(file_path: str, translations: Dict) -> bool:
    """翻訳済みテキストをSNBTファイルに適用する
    
    Args:
        file_path: 更新するSNBTファイルのパス
        translations: 翻訳データ（all.jsonの内容）
        
    Returns:
        bool: 更新が成功したかどうか
    """
    try:
        # バックアップファイルから内容を読み込む
        backup_path = f"{file_path}.bak"
        with open(backup_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # ファイル名に対応する翻訳エントリを取得
        filename = os.path.basename(file_path)
        file_translations = {
            entry["en"]: entry["ja"]
            for entry in translations["descriptions"]
            if entry["file"] == filename and entry["ja"]
        }
        
        if not file_translations:
            print(f"ℹ️ {filename} の翻訳データが見つかりません")
            return False
        
        # descriptionブロックを検出して翻訳を適用
        def replace_description(match):
            desc_content = match.group(0)  # description: [...]全体を取得
            for en, ja in file_translations.items():
                # 英語テキストを日本語に置換（引用符付きで検索・置換）
                desc_content = desc_content.replace(f'"{en}"', f'"{ja}"')
            return desc_content
        
        # 翻訳を適用
        pattern = r'description: \[([\s\S]*?)\]'
        updated_content = re.sub(pattern, replace_description, content)
        
        # 差分を表示（更新前と更新後の内容を比較）
        show_diff(content, updated_content, filename)
        
        # 変更がある場合のみファイルを更新
        if updated_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            print(f"✅ {filename} の翻訳を適用しました")
            return True
        return False
            
    except Exception as e:
        print(f"❌ {filename} の更新中にエラーが発生しました: {str(e)}")
        return False

def process_translations():
    """翻訳処理を実行する"""
    # all.jsonを読み込む
    all_data = load_all_json()
    
    # 未翻訳エントリを取得
    untranslated = get_untranslated_entries(all_data)
    if not untranslated:
        print("✨ 未翻訳のエントリはありません")
        return
    
    print(f"🔍 {len(untranslated)}件の未翻訳エントリを見つけました")
    
    # 10エントリごとに処理
    chunks = chunk_entries(untranslated)
    for i, chunk in enumerate(chunks, 1):
        print(f"\n📚 チャンク {i}/{len(chunks)} の処理を開始します...")
        translate_entries(chunk)
        
        # 10チャンクごとにファイルを保存
        save_all_json(all_data)
        print(f"💾 進捗を保存しました。{i * 10 if i < len(chunks) else len(untranslated)}件完了")

def parse_args():
    """コマンドライン引数をパースする"""
    import argparse
    parser = argparse.ArgumentParser(description='SNBTファイルの翻訳処理')
    parser.add_argument('directory', help='SNBTファイルのあるディレクトリパス')
    parser.add_argument('-p', '--phase',
                        choices='123',
                        help='実行するフェーズを指定（1: SNBT抽出, 2: 翻訳, 3: バックアップ）。省略時は全フェーズを実行')
    return parser.parse_args()

def main():
    """メイン処理"""
    args = parse_args()
    
    if not os.path.isdir(args.directory):
        print(f"❌ エラー: {args.directory} はディレクトリではありません")
        sys.exit(1)
    
    # Phase 2のみ実行時の警告
    if args.phase == '2' and not os.path.exists('all.json'):
        print("⚠️ 警告: all.jsonが存在しません。Phase 1を先に実行してください。")
        sys.exit(1)
    
    # フェーズの実行制御
    if not args.phase or args.phase == '1':
        process_snbt_files(args.directory)
    
    if not args.phase or args.phase == '2':
        process_translations()
    
    if not args.phase or args.phase == '3':
        print("\n📝 フェーズ3: バックアップと翻訳適用を開始します...")
        
        # all.jsonを読み込む
        all_data = load_all_json()
        
        # SNBTファイルを処理
        snbt_files = glob(os.path.join(args.directory, "*.snbt"))
        for snbt_file in snbt_files:
            # バックアップの存在確認のみ行い、翻訳は常に適用する
            create_backup(snbt_file)
            apply_translations(snbt_file, all_data)

if __name__ == "__main__":
    main()
