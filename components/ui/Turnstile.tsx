'use client'

import { useEffect, useRef } from 'react'

type Props = {
  onVerify: (token: string) => void
  onError?: () => void
}

export default function Turnstile({ onVerify, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | undefined>(undefined)

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!

    const renderWidget = () => {
      if (!ref.current || !(window as any).turnstile) return
      widgetId.current = (window as any).turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        'error-callback': () => onError?.(),
        'expired-callback': () => onError?.(),
        'timeout-callback': () => onError?.(),
      })
    }

    if ((window as any).turnstile) {
      renderWidget()
    } else {
      const existing = document.querySelector('script[src*="turnstile"]')
      if (existing) {
        existing.addEventListener('load', renderWidget)
        return () => existing.removeEventListener('load', renderWidget)
      }

      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = renderWidget
      document.head.appendChild(script)
    }

    return () => {
      if (widgetId.current !== undefined && (window as any).turnstile) {
        (window as any).turnstile.remove(widgetId.current)
        widgetId.current = undefined
      }
    }
  }, [])

  return <div ref={ref} />
}
