import { parse } from "https://deno.land/std@0.213.0/flags/mod.ts";
import {
  getOrCreateTranslationData,
  saveTranslationFile,
} from "./lib/translation.ts";
import { DEFAULT_TRANSLATION_PROMPT } from "./lib/PROMPT.ts";

/**
 * Claude APIを使用して英語から日本語への翻訳を行う
 * @param text 翻訳する英語テキスト
 * @returns 翻訳された日本語テキスト
 */
/**
 * 指数バックオフを使って関数を再試行する
 * @param fn 実行する関数
 * @param maxRetries 最大再試行回数
 * @param baseDelay 基本待機時間（ミリ秒）
 * @returns 関数の結果
 */
async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseDelay = 1000
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      console.log(error);
      if (retries >= maxRetries) {
        throw error;
      }

      // APIの過負荷状態またはレート制限の場合のみ再試行
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("Overloaded") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429")
      ) {
        console.log(errorMessage);
        const delay = baseDelay * Math.pow(2, retries);
        console.log(
          `APIが過負荷状態です。${delay}ms後に再試行します (${
            retries + 1
          }/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
      } else {
        throw error; // その他のエラーはそのまま投げる
      }
    }
  }
}

/**
 * Claude APIを使用して英語から日本語への翻訳を行う
 */
async function translateWithClaude(text: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY環境変数が設定されていません");
  }

  return await retryWithExponentialBackoff(
    async () => {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1000,
          system: [
            {
              type: "text",
              text: DEFAULT_TRANSLATION_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: text,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API エラー: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      // 翻訳テキストをそのまま返す
      return result.content[0].text;
    },
    5,
    2000
  );
}

/**
 * メイン処理: JSONファイルから未翻訳の英語テキストを抽出し、翻訳してファイルに保存する
 */
async function main(): Promise<void> {
  try {
    const args = parse(Deno.args);
    const transDictJsonFile = args._[0]?.toString();

    if (!transDictJsonFile) {
      console.error(
        "使用方法: deno run --allow-read --allow-write --allow-net --allow-env translate.ts <翻訳jsonファイル>"
      );
      Deno.exit(1);
    }

    // 翻訳jsonファイルを読み込み
    console.log(
      `jsonファイル ${transDictJsonFile} からテキストを抽出しています...`
    );

    try {
      // テキスト抽出と既存データの統合
      // const translationData = await extractAndMergeTranslations(
      //   transDictJsonFile,
      //   "trans.json"
      // );
      const translationArray = await getOrCreateTranslationData(
        transDictJsonFile
      );

      // 未翻訳のテキストをカウント
      const untranslatedCount = translationArray.filter(
        (item) => !item.ja
      ).length;
      console.log(`未翻訳テキスト: ${untranslatedCount}件`);

      if (untranslatedCount === 0) {
        console.log("すべてのテキストが翻訳済みです");
        Deno.exit(0);
      }

      console.log("翻訳を開始します...");
      let translatedCount = 0;

      // 各テキストを翻訳
      for (const item of translationArray) {
        if (!item.ja) {
          try {
            const translatedText = await translateWithClaude(item.en);

            // 問題のある前置きや余計な文字を検出
            const problemPhrases = [
              "Human:",
              "申し訳ありませんが",
              "以下のように翻訳",
              "次のように翻訳",
              "翻訳は以下の通り",
              "翻訳結果は以下",
              "翻訳結果:",
              "はい、",
              "わかりました",
              "理解しました",
              "私には、著作権で保護された",
              "著作権保護の対象",
              "著作権の関係",
            ];

            // 改行で始まるかチェック
            const startsWithNewline = translatedText.startsWith("\n");

            if (
              problemPhrases.some((phrase) =>
                translatedText.includes(phrase)
              ) ||
              startsWithNewline
            ) {
              console.error(`\n----- 翻訳エラー -----`);
              console.error(`原文: "${item.en}"`);
              console.error(`問題のある翻訳結果: "${translatedText}"`);
              console.error(`----------------------\n`);
              item.ja = "";
            } else {
              item.ja = translatedText;
              translatedCount++;
            }

            if (translatedCount % 5 === 0) {
              await saveTranslationFile("trans.json", translationArray);
              console.log(
                `進捗: ${translatedCount}/${untranslatedCount}件翻訳完了`
              );
            }
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(
              `"${item.en}"の翻訳中にエラーが発生: ${errorMessage}`
            );
            await saveTranslationFile("trans.json", translationArray);
            break;
          }
        }
      }

      // 最終結果を保存
      await saveTranslationFile("trans.json", translationArray);
      console.log(
        `翻訳完了: ${translatedCount}/${untranslatedCount}件のテキストを翻訳しました`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`エラーが発生しました: ${errorMessage}`);
      Deno.exit(1);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`エラーが発生しました: ${errorMessage}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
