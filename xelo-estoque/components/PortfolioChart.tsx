'use client'

interface PortfolioChartProps {
  data?: number[]
  label?: string
}

export function PortfolioChart({ data = [], label = 'Portfolio Performance' }: PortfolioChartProps) {
  // Generate mock data if none provided
  const chartData = data.length > 0 ? data : Array.from({ length: 24 }, (_, i) => {
    const base = 100000
    const variance = Math.random() * 5000 - 2500
    return base + variance + (i * 100)
  })

  const max = Math.max(...chartData)
  const min = Math.min(...chartData)
  const range = max - min

  const points = chartData.map((value, index) => {
    const x = (index / (chartData.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-400">{label}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-500 font-mono">24H</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      </div>

      <svg viewBox="0 0 100 100" className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area under the line */}
        <polygon
          points={`0,100 ${points} 100,100`}
          fill="url(#chartGradient)"
        />

        {/* The line */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="0.5"
          points={points}
          className="sparkline"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current value dot */}
        <circle
          cx="100"
          cy={points.split(' ').pop()?.split(',')[1] || '50'}
          r="1.5"
          fill="#10b981"
          className="animate-pulse"
        />
      </svg>

      <div className="flex justify-between mt-3 text-xs">
        <span className="text-gray-500 font-mono">
          R$ {min.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-emerald-400 font-mono font-bold">
          R$ {max.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  )
}
