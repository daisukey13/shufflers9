'use client'

import { useEffect, useRef } from 'react'

type Props = {
  onVerify: (token: string) => void
  onError?: () => void
}

export default function Turnstile({ onVerify, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const rendered = useRef(false)

  useEffect(() => {
    if (!ref.current || rendered.current) return
    rendered.current = true

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!

    if ((window as any).turnstile) {
      ;(window as any).turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        'error-callback': () => onError?.(),
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      if (!ref.current || !(window as any).turnstile) return
      ;(window as any).turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        'error-callback': () => onError?.(),
      })
    }

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return <div ref={ref} />
}