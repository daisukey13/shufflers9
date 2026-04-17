'use client'

import { useEffect, useRef } from 'react'

type Props = {
  onVerify: (token: string) => void
  onError?: () => void
}

export default function Turnstile({ onVerify, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    let widgetId: string | undefined
    let cancelled = false
    let scriptEl: HTMLScriptElement | null = null

    const renderWidget = () => {
      if (cancelled || !ref.current || !(window as any).turnstile) return
      widgetId = (window as any).turnstile.render(ref.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
        callback: (token: string) => onVerify(token),
        'error-callback': () => onError?.(),
        'expired-callback': () => onError?.(),
        'timeout-callback': () => onError?.(),
      })
    }

    if ((window as any).turnstile) {
      renderWidget()
    } else {
      scriptEl = document.querySelector<HTMLScriptElement>('script[src*="turnstile"]')
      if (!scriptEl) {
        scriptEl = document.createElement('script')
        scriptEl.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
        scriptEl.async = true
        scriptEl.defer = true
        document.head.appendChild(scriptEl)
      }
      scriptEl.addEventListener('load', renderWidget)
    }

    return () => {
      cancelled = true
      scriptEl?.removeEventListener('load', renderWidget)
      if (widgetId !== undefined && (window as any).turnstile) {
        (window as any).turnstile.remove(widgetId)
      }
    }
  }, [])

  return <div ref={ref} />
}
