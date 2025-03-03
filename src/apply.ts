// 翻訳済みテキストをSNBTファイルに適用するスクリプト
import { parse } from "https://deno.land/std/flags/mod.ts";
import { SnbtFile } from "./lib/snbt.ts";
import { getOrCreateTranslationData } from "./lib/translation.ts";
import { ensureDir } from "https://deno.land/std/fs/mod.ts";
import { dirname } from "https://deno.land/std/path/mod.ts";

// 引数を解析
const args = parse(Deno.args);
if (args._.length < 3) {
  console.error(
    "使用方法: deno run --allow-read --allow-write src/apply.ts <SNBTファイル> <翻訳JSONファイル> <出力SNBTファイル>",
  );
  Deno.exit(1);
}

const snbtFilePath = String(args._[0]);
const translationJsonPath = String(args._[1]);
const outputSnbtPath = String(args._[2]);

async function main(): Promise<void> {
  try {
    // 翻訳データを読み込む
    console.log(`翻訳データを ${translationJsonPath} から読み込んでいます...`);
    const translationData = await getOrCreateTranslationData(
      translationJsonPath,
    );

    // 翻訳済みテキストの数を確認
    const translatedCount = translationData.filter((item) => item.ja).length;
    console.log(
      `翻訳済みテキスト: ${translatedCount}/${translationData.length}件`,
    );

    if (translatedCount === 0) {
      console.log("翻訳済みのテキストがありません。処理を中止します。");
      Deno.exit(0);
    }

    // SNBTファイルを読み込む
    console.log(`SNBTファイル ${snbtFilePath} を読み込んでいます...`);
    const snbtFile = new SnbtFile(snbtFilePath);
    await snbtFile.load();

    // 出力ディレクトリが存在することを確認
    await ensureDir(dirname(outputSnbtPath));

    // 翻訳を適用
    console.log(`翻訳を適用しています...`);
    const replacementCount = await snbtFile.applyTranslations(
      translationData,
      outputSnbtPath,
    );

    console.log(`処理完了: ${replacementCount}件のテキストを置換しました`);
    console.log(`翻訳済みSNBTファイルを ${outputSnbtPath} に保存しました`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`エラーが発生しました: ${errorMessage}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
