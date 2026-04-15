export default function TermsPage() {
  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-yellow-100">利用規約</h1>
          <p className="text-gray-400 text-sm">豊浦シャッフラーズクラブ ランキングシステム</p>
        </div>

        <div className="space-y-6">
          {[
            {
              title: '第1条（目的）',
              content: '本規約は、テーブルシャッフルボード豊浦ランキングシステム（以下「本サービス」といいます）の利用に関する条件を定めるものです。利用者は、本規約に同意した上で本サービスを利用するものとします。',
            },
            {
              title: '第2条（利用登録）',
              content: '利用登録を希望する者は、本規約に同意の上、当クラブの定める方法によって利用登録を申請し、当クラブがこれを承認することによって、利用登録が完了するものとします。',
            },
            {
              title: '第3条（個人情報の取り扱い）',
              content: null,
              custom: (
                <div className="space-y-3">
                  <p className="text-gray-300">本サービスでは、以下の情報を収集・管理します：</p>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                      <span className="text-green-400 font-medium">公開情報：</span>
                      <span className="text-gray-300">ハンドルネーム、アバター画像、地域、ランキング情報、試合結果</span>
                    </div>
                    <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                      <span className="text-yellow-400 font-medium">非公開情報：</span>
                      <span className="text-gray-300">氏名、メールアドレス、電話番号</span>
                    </div>
                  </div>
                  <p className="text-gray-300 p-3 bg-purple-900/20 border-l-4 border-purple-500 rounded-lg">
                    非公開情報は、サービス運営に必要な場合のみ使用し、第三者に提供することはありません。
                  </p>
                </div>
              ),
            },
            {
              title: '第4条（禁止事項）',
              content: null,
              custom: (
                <div className="space-y-2">
                  <p className="text-gray-300 mb-3">利用者は、以下の行為を行ってはなりません：</p>
                  {[
                    '虚偽の情報を登録する行為',
                    '他の利用者になりすます行為',
                    '本サービスの運営を妨害する行為',
                    '他の利用者に対する誹謗中傷行為',
                    'その他、当クラブが不適切と判断する行為',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-red-900/20 border border-red-700/20 rounded-lg">
                      <span className="text-red-400">✗</span>
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              title: '第5条（試合結果の登録）',
              content: '試合結果は正確に登録するものとし、虚偽の結果を登録した場合は、アカウントの停止等の措置を取る場合があります。',
            },
            {
              title: '第6条（免責事項）',
              content: '本サービスの利用により生じた損害について、当クラブは一切の責任を負いません。ただし、当クラブに故意または重大な過失がある場合を除きます。',
            },
            {
              title: '第7条（規約の変更）',
              content: '当クラブは、必要と判断した場合には、利用者に通知することなく本規約を変更することができるものとします。変更後の規約は、本サービス上に掲示された時点から効力を生じるものとします。',
            },
            {
              title: '第8条（退会）',
              content: '退会は自由ですが、ご自身の試合の記録等の掲載の扱いは当クラブで決定させていただきます。退会希望の際は当サイト管理者までご連絡ください。',
            },
            {
              title: '第9条（準拠法・管轄裁判所）',
              content: '本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当クラブの所在地を管轄する裁判所を専属的合意管轄とします。',
            },
          ].map((section, i) => (
            <div key={i} className="p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl space-y-3">
              <h2 className="text-lg font-bold text-purple-300">{section.title}</h2>
              {section.content && (
                <p className="text-gray-300 text-sm leading-relaxed">{section.content}</p>
              )}
              {section.custom && section.custom}
            </div>
          ))}
        </div>

        <div className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl text-sm text-gray-400">
          <p>制定日：2026年4月9日</p>
          <p>最終更新日：2026年4月15日</p>
        </div>

        <p className="text-center text-sm text-gray-500">
          プレイヤー登録時に本規約への同意が必要です
        </p>
      </div>
    </div>
  )
}