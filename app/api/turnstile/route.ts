import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ success: false, error: 'トークンがありません' }, { status: 400 })
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  })

  const data = await res.json()

  if (!data.success) {
    console.error('Turnstile verification failed:', data['error-codes'])
    return NextResponse.json({ success: false, error: '認証に失敗しました', codes: data['error-codes'] }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}