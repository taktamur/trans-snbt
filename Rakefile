desc "クリーンアップする"
task :clear do
  sh "rm -rf trans-chapters trans.json"
end

desc "SNBTファイルから翻訳用JSONを生成する"
task :extract do
  Dir.glob("chapters/*.snbt").each do |snbt_file|
    sh "deno run --allow-read --allow-write extract.ts #{snbt_file} trans.json"
  end
end