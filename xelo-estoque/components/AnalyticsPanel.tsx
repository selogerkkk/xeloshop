'use client'

interface AnalyticsPanelProps {
  vendas: Array<{ canal: string; quantidade: number; precoReal: string }>
  produtos: Array<Record<string, unknown>>
  totalVendido: number
  lucroReal: number
  valorInvestido: number
  potencialVenda: number
  lucroPotencial: number
}

export function AnalyticsPanel({
  vendas,
  produtos,
  totalVendido,
  lucroReal,
  valorInvestido,
  potencialVenda,
  lucroPotencial
}: AnalyticsPanelProps) {

  // Calculate channel breakdown
  const channelBreakdown = vendas.reduce((acc, v) => {
    const canal = v.canal
    if (!acc[canal]) {
      acc[canal] = { count: 0, value: 0 }
    }
    acc[canal].count += v.quantidade
    acc[canal].value += Number.parseFloat(v.precoReal) * v.quantidade
    return acc
  }, {} as Record<string, { count: number, value: number }>)

  const totalVendasCount = vendas.reduce((acc, v) => acc + v.quantidade, 0)
  const avgTicket = totalVendasCount > 0 ? totalVendido / totalVendasCount : 0
  const profitMargin = totalVendido > 0 ? (lucroReal / totalVendido) * 100 : 0

  // Simulate LLM cost metrics (since this is inventory system, we show system metrics)
  const mockMetrics = {
    apiCalls: vendas.length + produtos.length,
    tokensIn: (vendas.length * 150 + produtos.length * 50),
    tokensOut: (vendas.length * 300 + produtos.length * 100),
    avgCost: 0.002
  }

  const totalTokens = mockMetrics.tokensIn + mockMetrics.tokensOut
  const estimatedCost = totalTokens * 0.000002

  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="glass-card">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-4">Performance</h3>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">Revenue</span>
            <span className="text-lg font-bold text-emerald-400">
              R$ {totalVendido.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">Profit</span>
            <span className={`text-lg font-bold ${lucroReal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {lucroReal >= 0 ? '+' : ''}R$ {lucroReal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">Margin</span>
            <span className={`text-sm font-mono ${profitMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}%
            </span>
          </div>

          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">Avg Ticket</span>
            <span className="text-sm font-mono text-gray-300">
              R$ {avgTicket.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Channel Distribution */}
      <div className="glass-card">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-4">Sales by Channel</h3>

        <div className="space-y-2">
          {(Object.entries(channelBreakdown) as [string, { count: number; value: number }][]).map(([canal, data]) => {
            const percentage = totalVendido > 0 ? (data.value / totalVendido) * 100 : 0
            const channelColors: Record<string, string> = {
              'ML': 'bg-yellow-500',
              'Facebook': 'bg-blue-500',
              'Instagram': 'bg-pink-500',
              'WhatsApp': 'bg-green-500',
              'Outro': 'bg-gray-500'
            }
            const barColor = channelColors[canal] || 'bg-gray-500'

            return (
              <div key={canal} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{canal}</span>
                  <span className="text-gray-300 font-mono">R$ {data.value.toFixed(0)}</span>
                </div>
                <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-600">{data.count} sales</p>
              </div>
            )
          })}

          {Object.keys(channelBreakdown).length === 0 && (
            <p className="text-xs text-gray-600 text-center py-4">No sales data</p>
          )}
        </div>
      </div>

      {/* System Metrics (styled like LLM cost analytics) */}
      <div className="glass-card">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-4">System Metrics</h3>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">API Calls</span>
            <span className="text-sm font-mono text-emerald-400">
              {mockMetrics.apiCalls.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">Tokens In</span>
            <span className="text-sm font-mono text-gray-300">
              {mockMetrics.tokensIn.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">Tokens Out</span>
            <span className="text-sm font-mono text-gray-300">
              {mockMetrics.tokensOut.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">Est. Cost</span>
            <span className="text-sm font-mono text-gray-300">
              ${estimatedCost.toFixed(4)}
            </span>
          </div>

          <div className="pt-2 border-t border-white/10">
            <div className="flex justify-between items-end">
              <span className="text-xs text-gray-500">Avg Cost/Call</span>
              <span className="text-xs font-mono text-gray-400">
                ${mockMetrics.avgCost.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Value */}
      <div className="glass-card">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-4">Inventory Value</h3>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">Invested</span>
            <span className="text-sm font-mono text-amber-400">
              R$ {valorInvestido.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">Potential</span>
            <span className="text-sm font-mono text-purple-400">
              R$ {potencialVenda.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-end">
            <span className="text-xs text-gray-500">Potential Profit</span>
            <span className={`text-sm font-mono ${lucroPotencial >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {lucroPotencial >= 0 ? '+' : ''}R$ {lucroPotencial.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
