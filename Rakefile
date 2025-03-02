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