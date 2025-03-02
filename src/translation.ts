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
    let saveData: TranslationData | TranslationItem[];
    
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