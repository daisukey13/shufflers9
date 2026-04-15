import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-yellow-100">利用規約</h1>
          <p className="text-gray-400 text-sm">Toyoura Shufflers Club ランキングサイト</p>
        </div>

        <div className="space-y-4">

          {[
            {
              title: '第1条（目的）',
              body: '本規約は、Toyoura Shufflers Club ランキングサイト（以下「当サイト」といいます）の利用に関する条件を定めるものです。利用者は、本規約に同意した上で当サイトを利用するものとします。',
            },
            {
              title: '第2条（運営）',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed space-y-1">
                  <p>当サイトは、Toyoura Shufflers Club（以下「当クラブ」といいます）が運営します。</p>
                  <p className="mt-2">所在地：〒049-5414 虻田郡豊浦町字幸町87番地9 豊浦町地域交流センター とわにー内</p>
                  <p>お問い合わせ：<Link href="/contact" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">https://toyoura.online/contact</Link></p>
                </div>
              ),
            },
            {
              title: '第3条（利用登録）',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                  <p>1. 利用登録を希望する者は、本規約に同意の上、当クラブの定める方法によって利用登録を申請し、当クラブがこれを承認することによって、利用登録が完了するものとします。</p>
                  <p>2. 当クラブは、以下のいずれかに該当すると判断した場合、利用登録を承認しないことがあります。その場合、理由の開示義務は負いません。</p>
                  <ul className="ml-4 space-y-1 text-gray-400">
                    <li>(1) 登録内容に虚偽、誤記または記載漏れがあった場合</li>
                    <li>(2) 過去に本規約に違反したことがある場合</li>
                    <li>(3) その他、当クラブが利用登録を適当でないと判断した場合</li>
                  </ul>
                </div>
              ),
            },
            {
              title: '第4条（アカウントの管理）',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                  <p>1. 利用者は、自己の責任においてアカウント情報（メールアドレス・パスワード等）を適切に管理するものとします。</p>
                  <p>2. アカウント情報の管理不十分、第三者による使用等によって生じた損害について、当クラブは一切の責任を負いません。</p>
                </div>
              ),
            },
            {
              title: '第5条（個人情報の取り扱い）',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                  <p>1. 当サイトでは、以下の情報を収集・管理します。</p>
                  <div className="ml-2 space-y-1">
                    <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                      <span className="text-green-400 font-medium">公開情報：</span>
                      <span className="text-gray-300">ハンドルネーム、アバター画像、地域、ランキング情報、試合結果</span>
                    </div>
                    <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                      <span className="text-yellow-400 font-medium">非公開情報：</span>
                      <span className="text-gray-300">氏名、メールアドレス、電話番号</span>
                    </div>
                  </div>
                  <p>2. 非公開情報は、サイト運営および利用者への連絡に必要な範囲でのみ使用し、利用者の同意なく第三者に提供することはありません。ただし、法令に基づく場合を除きます。</p>
                  <p>3. 利用者は、登録した個人情報に変更があった場合、速やかに当クラブに届け出るものとします。</p>
                </div>
              ),
            },
            {
              title: '第6条（禁止事項）',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                  <p>利用者は、以下の行為を行ってはなりません。</p>
                  <ul className="space-y-1">
                    {[
                      '虚偽の情報を登録する行為',
                      '他の利用者になりすます行為',
                      '当サイトの運営を妨害する行為',
                      '他の利用者に対する誹謗中傷、嫌がらせ、またはハラスメント行為',
                      '当サイトの情報を無断で外部に転載・複製する行為',
                      'その他、当クラブが不適切と判断する行為',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 bg-red-900/20 border border-red-700/20 rounded-lg">
                        <span className="text-red-400 flex-shrink-0">({i + 1})</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            },
            {
              title: '第7条（試合結果の登録）',
              body: '試合結果は正確に登録するものとし、虚偽の結果を登録した場合は、当該試合結果の修正・削除、アカウントの一時停止等の措置を取る場合があります。',
            },
            {
              title: '第8条（利用資格の停止・登録の取消し）',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                  <p>1. 当クラブは、利用者が以下のいずれかに該当すると判断した場合、事前の通知なく、当該利用者のサイト利用を一時停止し、または登録を取り消すことができるものとします。</p>
                  <ul className="ml-4 space-y-1 text-gray-400">
                    <li>(1) 本規約のいずれかの条項に違反した場合</li>
                    <li>(2) 他の利用者の利用を著しく妨げる行為があった場合</li>
                    <li>(3) 一定期間以上、連絡が取れない状態が続いた場合</li>
                    <li>(4) その他、当クラブが利用の継続を適当でないと判断した場合</li>
                  </ul>
                  <p>2. 当クラブは、本条に基づく措置によって利用者に生じた損害について、一切の責任を負いません。</p>
                  <p>3. なお、当クラブはできる限り事前に利用者と話し合いの場を設けるよう努めます。</p>
                </div>
              ),
            },
            {
              title: '第9条（退会）',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                  <p>1. 利用者は、当サイトの<Link href="/contact" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">お問い合わせフォーム</Link>より連絡することにより、いつでも退会することができます。</p>
                  <p>2. 退会後も、当該利用者に関する試合結果やランキング履歴等の記録は、サイトの整合性を保つため、当クラブの判断により引き続き掲載する場合があります。</p>
                  <p>3. 退会後の個人情報（非公開情報）は、合理的な期間内に削除するものとします。</p>
                </div>
              ),
            },
            {
              title: '第10条（サイトの変更・中断・終了）',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                  <p>1. 当クラブは、利用者への事前の通知なく、当サイトの内容を変更し、または提供を中断・終了することができるものとします。</p>
                  <p>2. 当クラブは、本条に基づく措置によって利用者に生じた損害について、一切の責任を負いません。</p>
                </div>
              ),
            },
            {
              title: '第11条（免責事項）',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                  <p>1. 当クラブは、当サイトの内容や情報の正確性、完全性、有用性等について、いかなる保証も行いません。</p>
                  <p>2. 当サイトの利用により利用者間または利用者と第三者との間で生じた紛争について、当クラブは一切の責任を負いません。</p>
                  <p>3. 当サイトの利用により生じた損害について、当クラブは一切の責任を負いません。ただし、当クラブに故意または重大な過失がある場合を除きます。</p>
                </div>
              ),
            },
            {
              title: '第12条（規約の変更）',
              custom: (
                <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                  <p>1. 当クラブは、必要と判断した場合には、本規約を変更することができるものとします。</p>
                  <p>2. 変更後の規約は、当サイト上に掲示された時点から効力を生じるものとします。</p>
                  <p>3. 変更内容が利用者に重大な影響を及ぼす場合は、合理的な期間をもって事前に通知するよう努めます。</p>
                </div>
              ),
            },
            {
              title: '第13条（準拠法・管轄裁判所）',
              body: '本規約の解釈にあたっては、日本法を準拠法とします。当サイトに関して紛争が生じた場合には、当クラブの所在地を管轄する裁判所を専属的合意管轄とします。',
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
          <p>制定日：2026年4月9日</p>
          <p>最終更新日：2026年4月16日</p>
        </div>

        <p className="text-center text-sm text-gray-500">
          プレイヤー登録時に本規約への同意が必要です
        </p>

      </div>
    </div>
  )
}
