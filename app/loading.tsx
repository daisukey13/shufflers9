export default function Loading() {
  return (
    <div className="fixed inset-0 bg-[#0a0518] flex flex-col items-center justify-center z-50">
      {/* 背景グロー */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(80,20,160,0.3)_0%,transparent_70%)] pointer-events-none" />

      {/* パック */}
      <div
        className="relative animate-spin"
        style={{
          width: 'min(20vw, 140px)',
          height: 'min(20vw, 140px)',
          animationDuration: '1.2s',
          animationTimingFunction: 'linear',
          filter: 'drop-shadow(0 0 20px rgba(220,60,60,0.7))',
        }}
      >
        <img
          src="/shuffleboard-puck-red.png"
          alt="loading"
          className="w-full h-full object-contain"
        />
      </div>

      {/* 接続中テキスト */}
      <p
        className="mt-8 text-white text-sm font-bold tracking-[0.3em] animate-pulse"
        style={{ animationDuration: '0.9s' }}
      >
        接続中
      </p>
    </div>
  )
}
