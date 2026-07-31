import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json()

  if (!name || !email || !message) {
    return NextResponse.json({ error: '全ての項目を入力してください' }, { status: 400 })
  }
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string'
    || name.length > 100 || email.length > 254 || message.length > 5000) {
    return NextResponse.json({ error: '入力内容が長すぎます' }, { status: 400 })
  }
  // replyTo ヘッダーインジェクション防止
  if (/[\r\n]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Mail send error: RESEND_API_KEY is not set')
    return NextResponse.json({ error: 'メールの送信に失敗しました' }, { status: 500 })
  }

  // 認証メールと同じ Resend 経由で送信（送信元は認証済みドメイン toyoura.online）
  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: process.env.RESEND_API_KEY,
    },
  })

  try {
    await transporter.sendMail({
      from: '豊浦シャッフラーズクラブ <noreply@toyoura.online>',
      to: 'daisukeyud@gmail.com',
      subject: 'TSCフォームより',
      text: `お名前: ${name}\nメールアドレス: ${email}\n\nお問い合わせ内容:\n${message}`,
      html: `
        <p><strong>お名前:</strong> ${escapeHtml(name)}</p>
        <p><strong>メールアドレス:</strong> ${escapeHtml(email)}</p>
        <hr />
        <p><strong>お問い合わせ内容:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      `,
      replyTo: email,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mail send error:', error)
    return NextResponse.json({ error: 'メールの送信に失敗しました' }, { status: 500 })
  }
}
