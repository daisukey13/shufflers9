import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Toyoura Shufflers Club',
  description: 'テーブルシャッフルボード クラブランキング',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={geist.className} style={{ overflowX: 'hidden' }}>
        {/* パック背景 */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100vw',
            height: '100vh',
            backgroundImage: "url('/shuffleboard-puck-blue.png')",
            backgroundSize: '60vmin',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: 0.08,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
        {children}
      </body>
    </html>
  )
}