import { exists } from "https://deno.land/std/fs/mod.ts";

/**
 * 翻訳データの項目を表すインターフェース
 */
export interface TranslationItem {
  en: string;
  ja?: string;
}

/**
 * 翻訳データ全体を表すインターフェース（オブジェクト形式）
 */
export interface TranslationData {
  [key: string]: TranslationItem;
}

/**
 * 従来の翻訳データの配列形式
 */
export interface TranslationArray extends Array<TranslationItem> {}

/**
 * SNBTファイルからテキストを抽出する
 * @param filePath SNBTファイルのパス
 * @returns 抽出されたテキストの配列
 */
export async function extractTextFromSnbt(filePath: string): Promise<string[]> {
  // SNBTファイルが存在するか確認
  if (!(await exists(filePath))) {
    throw new Error(`SNBTファイル "${filePath}" が見つかりません。`);
  }

  // SNBTファイルを読み込む
  const content = await Deno.readTextFile(filePath);
  
  // 抽出したテキストを返す
  return extractDescriptions(content);
}

/**
 * SNBT形式の文字列から説明文を抽出する
 * @param content SNBT形式の文字列
 * @returns 抽出されたテキストの配列
 */
export function extractDescriptions(content: string): string[] {
  const matches: string[] = [];
  const descriptionBlocks =
    content.match(/description:\s*\[([\s\S]*?)\]/g) || [];

  for (const block of descriptionBlocks) {
    // 各ブロック内の引用符で囲まれた文字列を抽出
    const stringMatches = block.match(/"([^"\\]*(\\.[^"\\]*)*)"/g) || [];
    for (const stringMatch of stringMatches) {
      // 引用符を削除して配列に追加
      matches.push(stringMatch.slice(1, -1));
    }
  }

  // 空文字と重複を削除
  return matches
    .filter((line) => line.trim() !== "") // 空行を削除
    .filter((line, index, self) => self.indexOf(line) === index); // 重複を削除
}

/**
 * JSONファイルから翻訳データを読み込む
 * @param filePath JSONファイルのパス
 * @returns 翻訳データオブジェクト
 */
export async function loadTranslationFile(filePath: string): Promise<TranslationData> {
  try {
    const content = await Deno.readTextFile(filePath);
    
    // JSONの形式を確認し、必要に応じて変換する
    const parsed = JSON.parse(content);
    
    // 配列形式の場合はオブジェクト形式に変換
    if (Array.isArray(parsed)) {
      const result: TranslationData = {};
      for (const item of parsed) {
        if (item.en) {
          result[item.en] = {
            en: item.en,
            ja: item.ja || item.translated || "",
          };
        }
      }
      return result;
    }
    
    return parsed as TranslationData;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`ファイルの読み込みエラー: ${errorMessage}`);
    throw error;
  }
}

/**
 * 翻訳データをJSONファイルに保存する
 * @param filePath 保存先ファイルパス
 * @param data 翻訳データオブジェクト
 * @param format データ形式 ('object'または'array')
 */
export async function saveTranslationFile(
  filePath: string,
  data: TranslationData,
  format: 'object' | 'array' = 'object'
): Promise<void> {
  try {
    let saveData: any;
    
    // 指定された形式に変換
    if (format === 'array') {
      // オブジェクトから配列へ変換
      saveData = Object.values(data);
    } else {
      // そのままオブジェクト形式で保存
      saveData = data;
    }
    
    await Deno.writeTextFile(filePath, JSON.stringify(saveData, null, 2));
    console.log(`翻訳データを${filePath}に保存しました`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`ファイルの保存エラー: ${errorMessage}`);
    throw error;
  }
}

/**
 * 翻訳データを既存のファイルから読み込むか、存在しない場合は新規作成する
 * @param filePath 読み込むファイルのパス
 * @returns 翻訳データオブジェクト
 */
export async function getOrCreateTranslationData(filePath: string): Promise<TranslationData> {
  let translationData: TranslationData = {};
  
  if (await exists(filePath)) {
    try {
      console.log(`既存の翻訳データを読み込んでいます...`);
      translationData = await loadTranslationFile(filePath);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`警告: 既存の翻訳ファイルの読み込みに失敗しました: ${errorMessage}`);
      translationData = {};
    }
  }
  
  return translationData;
}

/**
 * SNBTファイルから翻訳テキストを抽出し、既存の翻訳データと統合する
 * @param snbtFilePath SNBTファイルのパス
 * @param translationFilePath 翻訳データファイルのパス (オプション)
 * @returns 更新された翻訳データ
 */
export async function extractAndMergeTranslations(
  snbtFilePath: string,
  translationFilePath?: string
): Promise<TranslationData> {
  // SNBTファイルからテキストを抽出
  const extractedTexts = await extractTextFromSnbt(snbtFilePath);
  console.log(`${extractedTexts.length}個のテキストを抽出しました。`);
  
  // 既存の翻訳データを読み込む（指定された場合）
  let translationData: TranslationData = {};
  if (translationFilePath) {
    translationData = await getOrCreateTranslationData(translationFilePath);
  }
  
  // 抽出したテキストを翻訳データに追加
  for (const text of extractedTexts) {
    if (!translationData[text]) {
      translationData[text] = { en: text, ja: "" };
    }
  }
  
  return translationData;
}