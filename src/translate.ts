import { parse } from "https://deno.land/std@0.213.0/flags/mod.ts";
import { extractAndMergeTranslations } from "./storage.ts";
import { saveTranslationFile } from "./translation.ts";

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
  baseDelay = 1000,
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries) {
        throw error;
      }
      
      // APIの過負荷状態またはレート制限の場合のみ再試行
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("Overloaded") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429")
      ) {
        const delay = baseDelay * Math.pow(2, retries);
        console.log(`APIが過負荷状態です。${delay}ms後に再試行します (${retries + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
      } else {
        throw error; // その他のエラーはそのまま投げる
      }
    }
  }
}

async function translateWithClaude(text: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY環境変数が設定されていません");
  }

  return await retryWithExponentialBackoff(async () => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `
次の英語テキストを自然な日本語に翻訳してください。Minecraftのクエストブック用のテキストです。
ゲーム用語はできるだけ既存の日本語訳に合わせてください。
翻訳文のみを返してください。

${text}
            `,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API エラー: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.content[0].text;
  }, 5, 2000);
}

/**
 * メイン処理: JSONファイルから未翻訳の英語テキストを抽出し、翻訳してファイルに保存する
 */
async function main(): Promise<void> {
  try {
    const args = parse(Deno.args);
    const inputFile = args._[0]?.toString();

    if (!inputFile) {
      console.error(
        "使用方法: deno run --allow-read --allow-write --allow-net --allow-env translate.ts <SNBTファイル>"
      );
      Deno.exit(1);
    }

    // SNBTファイルからテキストを抽出し、trans.jsonのデータと統合
    console.log(`SNBTファイル ${inputFile} からテキストを抽出しています...`);
    
    try {
      // テキスト抽出と既存データの統合
      const translationData = await extractAndMergeTranslations(inputFile, "trans.json");

      // 未翻訳のテキストをカウント
      const untranslatedCount = Object.values(translationData).filter(
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
      for (const [key, item] of Object.entries(translationData)) {
        if (!item.ja) {
          try {
            console.log(`翻訳中: ${key}`);
            item.ja = await translateWithClaude(item.en);
            translatedCount++;

            // 途中経過を保存（5件ごと）
            if (translatedCount % 5 === 0) {
              await saveTranslationFile("trans.json", translationData);
              console.log(
                `進捗: ${translatedCount}/${untranslatedCount}件翻訳完了`
              );
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`"${key}"の翻訳中にエラーが発生: ${errorMessage}`);
            await saveTranslationFile("trans.json", translationData);
            break;
          }
        }
      }

      // 最終結果を保存
      await saveTranslationFile("trans.json", translationData);
      console.log(
        `翻訳完了: ${translatedCount}/${untranslatedCount}件のテキストを翻訳しました`
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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