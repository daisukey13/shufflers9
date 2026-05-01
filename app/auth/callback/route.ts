import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/login?error=link_expired', request.url))
  }

  const supabase = await createClient()

  // PKCE flow (code)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      return NextResponse.redirect(new URL('/login?error=link_expired', request.url))
    }
  }

  // Email OTP flow (token_hash + type)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash, type })
    if (verifyError) {
      return NextResponse.redirect(new URL('/login?error=link_expired', request.url))
    }
  }

  return NextResponse.redirect(new URL('/mypage/edit?welcome=1', request.url))
}
