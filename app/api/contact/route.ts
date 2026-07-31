import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { formatDateTimeJST } from '@/lib/date'

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

  const receivedAt = formatDateTimeJST(new Date())

  try {
    await transporter.sendMail({
      from: '豊浦シャッフラーズクラブ <noreply@toyoura.online>',
      to: 'daisukeyud@gmail.com',
      subject: '豊浦シャッフラーズクラブ お問い合わせ',
      text:
        `豊浦シャッフラーズクラブのお問い合わせフォームに新しい送信がありました。\n\n` +
        `受信日時: ${receivedAt}\n` +
        `お名前: ${name}\n` +
        `メールアドレス: ${email}\n\n` +
        `お問い合わせ内容:\n${message}\n\n` +
        `----\n` +
        `このメールに返信すると、送信者（${email}）宛に返信されます。\n` +
        `豊浦シャッフラーズクラブ 会員管理システム（自動送信）`,
      html: `
        <div style="font-family: sans-serif; color:#333; line-height:1.7; max-width:560px;">
          <p>豊浦シャッフラーズクラブのお問い合わせフォームに新しい送信がありました。</p>
          <table style="border-collapse:collapse; margin:16px 0;">
            <tr><td style="padding:4px 12px 4px 0; color:#888;">受信日時</td><td style="padding:4px 0;">${escapeHtml(receivedAt)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0; color:#888;">お名前</td><td style="padding:4px 0;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0; color:#888;">メールアドレス</td><td style="padding:4px 0;">${escapeHtml(email)}</td></tr>
          </table>
          <p style="color:#888; margin-bottom:4px;">お問い合わせ内容</p>
          <p style="white-space:pre-wrap; background:#f6f6f8; border-radius:8px; padding:12px 14px; margin-top:0;">${escapeHtml(message)}</p>
          <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
          <p style="font-size:12px; color:#999;">
            このメールに返信すると、送信者（${escapeHtml(email)}）宛に返信されます。<br>
            豊浦シャッフラーズクラブ 会員管理システムからの自動送信メールです。
          </p>
        </div>
      `,
      replyTo: email,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mail send error:', error)
    return NextResponse.json({ error: 'メールの送信に失敗しました' }, { status: 500 })
  }
}
