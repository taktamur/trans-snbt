// SNBT ファイルから翻訳対象のテキストを抽出して JSON ファイルに保存する
import { parse } from "https://deno.land/std/flags/mod.ts";
import { extractAndMergeTranslations } from "./storage.ts";
import { saveTranslationFile } from "./lib/translation.ts";

// 引数を解析
const args = parse(Deno.args);
if (args._.length < 2) {
  console.error(
    "使用方法: deno run --allow-read --allow-write extract.ts <SNBTファイル> <出力JSONファイル>"
  );
  Deno.exit(1);
}

const snbtFilePath = String(args._[0]);
const outputJsonPath = String(args._[1]);

async function main(): Promise<void> {
  try {
    // SNBTファイルからテキストを抽出し、既存データと統合
    const translationData = await extractAndMergeTranslations(snbtFilePath, outputJsonPath);
    
    // 未翻訳のテキストをカウント
    const untranslatedCount = Object.values(translationData).filter(item => !item.ja).length;
    
    // 結果を出力
    console.log(`抽出結果: ${Object.keys(translationData).length} 個のテキスト（未翻訳: ${untranslatedCount}件）`);
    
    // JSONファイルに保存
    await saveTranslationFile(outputJsonPath, translationData);
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`エラーが発生しました: ${errorMessage}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
