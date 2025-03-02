import { TranslationArray } from "./lib/translation.ts";
import { SnbtFile } from "./lib/snbt.ts";
import { getOrCreateTranslationData } from "./lib/translation.ts";

/**
 * SNBTファイルから翻訳テキストを抽出し、既存の翻訳データと統合する
 * @param snbtFilePath SNBTファイルのパス
 * @param translationFilePath 翻訳データファイルのパス (オプション)
 * @returns 更新された翻訳データ
 */
export async function extractAndMergeTranslations(
  snbtFilePath: string,
  translationFilePath?: string,
): Promise<TranslationArray> {
  // SNBTファイルからテキストを抽出
  const snbtFile = new SnbtFile(snbtFilePath);
  const extractedTexts = await snbtFile.extractText();
  console.log(`${extractedTexts.length}個のテキストを抽出しました。`);

  // 既存の翻訳データを読み込む（指定された場合）
  let translationArray: TranslationArray = [];
  if (translationFilePath) {
    translationArray = await getOrCreateTranslationData(translationFilePath);
  }

  // 抽出したテキストを翻訳データに追加
  for (const text of extractedTexts) {
    if (translationArray.map((item) => item.en).includes(text)) {
      continue;
    }
    translationArray.push({ en: text, ja: "" });
  }

  return translationArray;
}
