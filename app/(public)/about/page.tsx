import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-yellow-100">当サイトについて</h1>
          <p className="text-gray-400 text-sm">Toyoura Shufflers Club</p>
        </div>

        <div className="space-y-5">

          <div className="p-5 bg-blue-900/20 border border-blue-800/30 rounded-2xl space-y-3">
            <h2 className="text-lg font-bold text-amber-300">🐷 サイトの概要</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              このサイトはToyoura Shufflers Clubが運営するテーブルシャッフルボードのランキングサイトです。
            </p>
          </div>

          <div className="p-5 bg-blue-900/20 border border-blue-800/30 rounded-2xl space-y-3">
            <h2 className="text-lg font-bold text-amber-300">🍓 サイトの目的</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              このサイトの目的は、テーブルシャッフルボードを通して楽しむ仲間を世界に広げることにあります。
              従って、ルールを守って仲間と楽しむために、豊浦町のテーブルシャッフルボードでプレイできる中学生以上ならば、誰でもランキング登録をして参加できます。
            </p>
            <p className="text-gray-400 text-xs leading-relaxed p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
              ※ 小学生については親の同伴や承認が必要です。
            </p>
          </div>

          <div className="p-5 bg-blue-900/20 border border-blue-800/30 rounded-2xl space-y-3">
            <h2 className="text-lg font-bold text-amber-300">📊 ランキング・ハンディキャップについて</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              ランキングやハンディキャップは自分のレベルを上げるモチベーションです。これらはプレーヤー同士の対戦の試合結果を登録することで自動計算されます。
            </p>
            <p className="text-gray-300 text-sm leading-relaxed p-3 bg-purple-900/20 border-l-4 border-purple-500 rounded-lg">
              2026年4月現在でこのようなランキングサイトは日本にないようなので、ここで一位になることは日本一位ということになるかもしれませんね。
            </p>
          </div>

          <div className="p-5 bg-green-900/20 border border-green-800/30 rounded-2xl space-y-3">
            <h2 className="text-lg font-bold text-amber-300">📢 LINE公式アカウント</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              大会の連絡や、練習会の連絡はLINE公式アカウントで配信していますので、よろしかったらご登録ください。
            </p>
          </div>

        </div>

        <div className="text-center">
          <Link href="/terms" className="text-sm text-purple-400 hover:text-purple-300 transition underline underline-offset-2">
            利用規約はこちら
          </Link>
        </div>

      </div>
    </div>
  )
}
