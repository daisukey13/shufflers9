import Link from 'next/link'

export const metadata = {
  title: '個人情報の取り扱い | 豊浦シャッフラーズクラブ',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-yellow-100">個人情報の取り扱いについて</h1>
          <p className="text-gray-400 text-sm">豊浦シャッフラーズクラブ</p>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed px-1">
          豊浦シャッフラーズクラブ（以下「当クラブ」）は、会員の個人情報の保護を重要な責務と考え、以下の方針に基づき適切に取り扱います。
        </p>

        <div className="space-y-4">

          {[
            {
              title: '1. 取得する個人情報',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed">
                  <p className="mb-2">当クラブでは、以下の情報を取得します。</p>
                  <ul className="space-y-1.5">
                    {[
                      '氏名・表示名',
                      '住所（市区町村レベル）',
                      '電話番号',
                      'プロフィール画像（アバター）',
                      '試合成績・ランキング情報',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            },
            {
              title: '2. 利用目的',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed">
                  <p className="mb-2">取得した個人情報は、以下の目的に使用します。</p>
                  <ul className="space-y-1.5">
                    {[
                      'ランキングサイト上での成績・順位の表示',
                      'クラブ内の会員管理',
                      'お知らせ等の連絡',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            },
            {
              title: '3. 第三者への提供',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed">
                  <p className="mb-2">取得した個人情報は、以下の場合を除き第三者に提供しません。</p>
                  <ul className="space-y-1.5">
                    {[
                      '本人の同意がある場合',
                      '法令に基づく場合',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            },
            {
              title: '4. 安全管理',
              body: '個人情報への不正アクセス・紛失・漏洩を防ぐため、適切な安全管理措置を講じます。',
            },
            {
              title: '5. 個人情報の開示・訂正・削除',
              custom: (
                <p className="text-gray-300 text-sm leading-relaxed">
                  本人からの個人情報の開示・訂正・削除のご要望には、合理的な範囲で対応します。
                  <Link href="/contact" className="text-purple-400 hover:text-purple-300 underline underline-offset-2 mx-1">
                    お問い合わせフォーム
                  </Link>
                  よりご連絡ください。
                </p>
              ),
            },
            {
              title: '6. Cookie・アクセス解析',
              body: '当サイトでは、サービス改善のためCookieおよびアクセス解析ツールを使用する場合があります。',
            },
            {
              title: '7. お問い合わせ',
              custom: (
                <p className="text-gray-300 text-sm leading-relaxed">
                  個人情報の取り扱いに関するお問い合わせは、サイト内の
                  <Link href="/contact" className="text-purple-400 hover:text-purple-300 underline underline-offset-2 mx-1">
                    お問い合わせフォーム
                  </Link>
                  よりご連絡ください。
                </p>
              ),
            },
            {
              title: '8. 改定',
              body: '本方針は必要に応じて改定することがあります。改定後はサイト上に掲載します。',
            },
          ].map((section, i) => (
            <div key={i} className="p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl space-y-3">
              <h2 className="text-base font-bold text-purple-300">{section.title}</h2>
              {section.body && (
                <p className="text-gray-300 text-sm leading-relaxed">{section.body}</p>
              )}
              {section.custom && section.custom}
            </div>
          ))}

        </div>

        <div className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl text-sm text-gray-400">
          <p>制定日：2026年4月22日</p>
        </div>

      </div>
    </div>
  )
}
