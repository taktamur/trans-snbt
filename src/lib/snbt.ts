import { exists } from "https://deno.land/std/fs/mod.ts";

/**
 * SNBTファイルを処理するクラス
 */
export class SnbtFile {
  private filePath: string;
  private content: string | null = null;

  /**
   * SNBTファイルのインスタンスを作成
   * @param filePath SNBTファイルのパス
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * SNBTファイルが存在するか確認する
   * @returns ファイルが存在するかどうか
   */
  async exists(): Promise<boolean> {
    return await exists(this.filePath);
  }

  /**
   * SNBTファイルの内容を読み込む
   * @throws ファイルが存在しない場合はエラー
   */
  async load(): Promise<void> {
    if (!(await this.exists())) {
      throw new Error(`SNBTファイル "${this.filePath}" が見つかりません。`);
    }
    this.content = await Deno.readTextFile(this.filePath);
  }

  /**
   * SNBTファイルからテキストを抽出する
   * @returns 抽出されたテキストの配列
   * @throws ファイルが読み込まれていない場合はエラー
   */
  async extractText(): Promise<string[]> {
    // ファイル内容がまだ読み込まれていなければ読み込む
    if (this.content === null) {
      await this.load();
    }
    
    // 抽出したテキストを返す
    return this.extractDescriptions();
  }

  /**
   * SNBT形式の文字列から説明文を抽出する
   * @returns 抽出されたテキストの配列
   * @throws ファイル内容が読み込まれていない場合はエラー
   */
  private extractDescriptions(): string[] {
    if (this.content === null) {
      throw new Error("ファイル内容が読み込まれていません。先にload()を呼び出してください。");
    }
    
    const matches: string[] = [];
    const descriptionBlocks =
      this.content.match(/description:\s*\[([\s\S]*?)\]/g) || [];

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
   * ファイルパスを取得する
   * @returns SNBTファイルのパス
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * ファイル内容を取得する
   * @returns SNBTファイルの内容
   * @throws ファイル内容が読み込まれていない場合はエラー
   */
  getContent(): string {
    if (this.content === null) {
      throw new Error("ファイル内容が読み込まれていません。先にload()を呼び出してください。");
    }
    return this.content;
  }
}

/**
 * 旧APIとの互換性のためのヘルパー関数
 * @param filePath SNBTファイルのパス
 * @returns 抽出されたテキストの配列
 */
export async function extractTextFromSnbt(filePath: string): Promise<string[]> {
  const snbtFile = new SnbtFile(filePath);
  return await snbtFile.extractText();
}

/**
 * SNBT形式の文字列から説明文を抽出する（旧APIとの互換性用）
 * @param content SNBT形式の文字列
 * @returns 抽出されたテキストの配列
 * @deprecated SnbtFileクラスを代わりに使用してください
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