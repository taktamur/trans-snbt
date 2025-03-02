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
/**
 * 指数バックオフに加えて、レート制限に基づいた適応的な遅延を実装
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
  // レート制限に達した場合の待機時間を段階的に長くする
  let rateLimitWaitTime = 10000; // 初期値10秒
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries) {
        throw error;
      }

      // エラーメッセージを取得
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      
      // APIの過負荷状態またはレート制限の場合の処理
      if (errorMessage.includes("Overloaded") || 
          errorMessage.includes("rate limit") || 
          errorMessage.includes("429")) {
        
        console.log(errorMessage);
        
        // エラータイプによって待機時間を調整
        let delay: number;
        
        if (errorMessage.includes("rate_limit_error")) {
          // レート制限エラーの場合は長めに待機
          // 毎回長くなるように調整
          delay = rateLimitWaitTime;
          rateLimitWaitTime += 30000; // 次回は30秒長く待つ
          console.log(
            `APIレート制限に達しました。${delay/1000}秒後に再試行します (${
              retries + 1
            }/${maxRetries})...`
          );
        } else {
          // 過負荷状態などの一時的なエラーには指数バックオフを使用
          delay = baseDelay * Math.pow(2, retries);
          console.log(
            `APIが過負荷状態です。${delay/1000}秒後に再試行します (${
              retries + 1
            }/${maxRetries})...`
          );
        }
        
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
      // より小さいモデルを使用し、より効率的に翻訳
      const model = "claude-3-haiku-20240307"; // 最も小さいモデル
      
      // レスポンスヘッダーを確認するためのオプション
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1000,
          temperature: 0.3, // 低い温度で決定論的な出力を得る
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
      };
      
      const response = await fetch("https://api.anthropic.com/v1/messages", options);

      // レスポンスヘッダーからレート制限情報を取得して表示（デバッグ用）
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      const rateLimitReset = response.headers.get("x-ratelimit-reset");
      
      if (rateLimitRemaining && parseInt(rateLimitRemaining) < 10000) {
        console.log(`APIレート制限残り: ${rateLimitRemaining}, リセット: ${rateLimitReset || "不明"}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API エラー: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      // 翻訳テキストをそのまま返す
      return result.content[0].text;
    },
    5,
    5000 // 再試行間隔を長めに設定（5秒）
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

      // バッチサイズとウェイト時間の設定
      const BATCH_SIZE = 10; // 一度に処理する翻訳数
      const WAIT_BETWEEN_BATCHES = 60000; // バッチ間の待機時間（ミリ秒）- 1分
      
      // バッチ処理で翻訳
      const untranslatedItems = translationArray.filter(item => !item.ja);
      
      for (let i = 0; i < untranslatedItems.length; i += BATCH_SIZE) {
        // 現在のバッチを取得
        const currentBatch = untranslatedItems.slice(i, i + BATCH_SIZE);
        console.log(`バッチ処理: ${i/BATCH_SIZE + 1}/${Math.ceil(untranslatedItems.length/BATCH_SIZE)}`);
        
        // このバッチ内の項目を処理
        for (const item of currentBatch) {
          const index = translationArray.findIndex(t => t.en === item.en);
          if (index === -1 || translationArray[index].ja) continue;
          
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
              translationArray[index].ja = "";
            } else {
              translationArray[index].ja = translatedText;
              translatedCount++;
            }

            // 各翻訳後に短い遅延を設ける（API負荷軽減）
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 定期的に保存
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
            
            // レート制限エラーの場合は長めの休憩を入れて継続
            if (errorMessage.includes("rate_limit_error")) {
              console.log("レート制限に達しました。2分間待機します...");
              await new Promise(resolve => setTimeout(resolve, 120000)); // 2分待機
              continue; // 次の項目に進む（breakではなくcontinue）
            } else {
              break; // その他のエラーは処理中断
            }
          }
        }
        
        // 各バッチの終了後に保存
        await saveTranslationFile("trans.json", translationArray);
        console.log(`バッチ完了: ${Math.min(i + BATCH_SIZE, untranslatedItems.length)}/${untranslatedItems.length}件処理`);
        
        // 最後のバッチでなければ待機
        if (i + BATCH_SIZE < untranslatedItems.length) {
          console.log(`APIレート制限を回避するため${WAIT_BETWEEN_BATCHES/1000}秒間待機します...`);
          await new Promise(resolve => setTimeout(resolve, WAIT_BETWEEN_BATCHES));
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
