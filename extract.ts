// SNBT ファイルから翻訳対象のテキストを抽出して JSON ファイルに保存する
import { parse } from "https://deno.land/std/flags/mod.ts";
import { exists } from "https://deno.land/std/fs/mod.ts";

interface Translation {
  en: string;
  ja: string;
}

// 引数を解析
const args = parse(Deno.args);
if (args._.length < 2) {
  console.error(
    "使用方法: deno run --allow-read --allow-write extract.ts <SNBTファイル> <出力JSONファイル>",
  );
  Deno.exit(1);
}

const snbtFilePath = String(args._[0]);
const outputJsonPath = String(args._[1]);

// SNBTファイルが存在するか確認
if (!await exists(snbtFilePath)) {
  console.error(`エラー: SNBTファイル "${snbtFilePath}" が見つかりません。`);
  Deno.exit(1);
}

// 既存の翻訳データを読み込む（存在する場合）
let existingTranslations: Translation[] = [];
if (await exists(outputJsonPath)) {
  try {
    const jsonContent = await Deno.readTextFile(outputJsonPath);
    const parsed = JSON.parse(jsonContent);

    // 既存のデータがオブジェクト形式の場合は配列に変換する
    if (!Array.isArray(parsed)) {
      Object.values(parsed).forEach((item: any) => {
        existingTranslations.push({
          en: item.en || item.original || "",
          ja: item.ja || item.translated || "",
        });
      });
    } else {
      existingTranslations = parsed;
    }

    console.log(`既存の翻訳データを "${outputJsonPath}" から読み込みました。`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `警告: 既存の翻訳ファイルの読み込みに失敗しました: ${errorMessage}`,
    );
    existingTranslations = [];
  }
}

// SNBTファイルを読み込む
const snbtContent = await Deno.readTextFile(snbtFilePath);

// 翻訳対象のテキストを抽出するための正規表現パターン
const titlePattern = /title: "([^"\\]*(\\.[^"\\]*)*)"/g;
const subtitlePattern = /subtitle: "([^"\\]*(\\.[^"\\]*)*)"/g;
// 説明文の配列内の各要素を検出する
const descriptionPattern = /description: \[\s*"([^"\\]*(\\.[^"\\]*)*)"/g;
const descriptionLinePattern =
  /description: \[\s*(?:"(?:[^"\\]*(?:\\.[^"\\]*)*)"\s*,?\s*)+\s*"([^"\\]*(\\.[^"\\]*)*)"/g;

// 説明文の配列内のすべての文字列を抽出する特別な関数
const extractDescriptions = (content: string): string[] => {
  const matches: string[] = [];
  const descriptionBlocks = content.match(/description:\s*\[([\s\S]*?)\]/g) ||
    [];

  for (const block of descriptionBlocks) {
    // 各ブロック内の引用符で囲まれた文字列を抽出
    const stringMatches = block.match(/"([^"\\]*(\\.[^"\\]*)*)"/g) || [];
    for (const stringMatch of stringMatches) {
      // 引用符を削除して配列に追加
      matches.push(stringMatch.slice(1, -1));
    }
  }

  return matches;
};

// 正規表現にマッチする全てのテキストを抽出
const extractMatches = (pattern: RegExp, content: string): string[] => {
  const matches: string[] = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    matches.push(match[1]);
  }

  return matches;
};

const titles = extractMatches(titlePattern, snbtContent);
const subtitles = extractMatches(subtitlePattern, snbtContent);

// 新しい方法で説明文を抽出
const descriptionTexts = extractDescriptions(snbtContent);

// 空文字と重複を削除
const descriptions = descriptionTexts
  .filter((line) => line.trim() !== "") // 空行を削除
  .filter((line, index, self) => self.indexOf(line) === index); // 重複を削除

// 抽出したテキストを翻訳リストに追加
const addToTranslations = (texts: string[]) => {
  texts.forEach((text) => {
    // 既存の翻訳エントリを探す
    const existingEntry = existingTranslations.find((entry) =>
      entry.en === text
    );

    if (!existingEntry) {
      // 新しいエントリを追加
      existingTranslations.push({
        en: text,
        ja: "",
      });
    }
  });
};

// 説明文のみを追加（タイトルとサブタイトルは除外）
addToTranslations(descriptions);

// 結果を出力
console.log(`抽出結果: ${descriptions.length} 個のテキストを抽出しました。`);
console.log(`- 説明文: ${descriptions.length} 個`);
console.log(
  `（タイトル ${titles.length} 個、サブタイトル ${subtitles.length} 個は抽出対象外）`,
);

// JSONファイルに保存
await Deno.writeTextFile(
  outputJsonPath,
  JSON.stringify(existingTranslations, null, 2),
);
console.log(`翻訳データを "${outputJsonPath}" に保存しました。`);
