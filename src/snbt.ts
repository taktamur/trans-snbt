import { exists } from "https://deno.land/std/fs/mod.ts";

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