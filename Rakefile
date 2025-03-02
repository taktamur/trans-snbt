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
  sh "deno run --allow-read --allow-write --allow-net --allow-env src/translate.ts trans.json"
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
task :all => [:clear, :extract, :translate]

desc "開発用のチェックを実行する"
task :dev => [:lint, :check, :fmt]