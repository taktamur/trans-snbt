desc "クリーンアップする"
task :clear do
  sh "rm -rf trans-chapters trans.json"
end

desc "SNBTファイルから翻訳用JSONを生成する"
task :extract do
  Dir.glob("chapters/*.snbt").each do |snbt_file|
    sh "deno run --allow-read --allow-write src/extract.ts #{snbt_file} trans.json"
  end
end

desc "翻訳する"
task :translate do
  sh "deno run --allow-read --allow-write --allow-net --allow-env src/translate.ts trans.json 2>&1 | tee error.txt"
end

desc "翻訳をSNBTファイルに適用する"
task :apply do
  # 出力ディレクトリを作成
  sh "mkdir -p trans-chapters"
  
  # chapters内の全SNBTファイルに対して処理を実行
  Dir.glob("chapters/*.snbt").each do |snbt_file|
    basename = File.basename(snbt_file)
    output_path = "trans-chapters/#{basename}"
    sh "deno run --allow-read --allow-write src/apply.ts #{snbt_file} trans.json #{output_path}"
  end
end

desc "Deno Lint を実行する"
task :lint do
  sh "deno lint"
end

desc "型チェックを実行する"
task :check do
  sh "deno check src/*.ts"
end

desc "コードフォーマットを実行する"
task :fmt do
  sh "deno fmt"
end

desc "全てのタスクを順次実行する"
task :all => [:clear, :extract, :translate, :apply]

desc "開発用のチェックを実行する"
task :dev => [:lint, :check, :fmt]