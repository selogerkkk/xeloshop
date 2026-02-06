'use client'

interface AccountSummaryProps {
  equity: number
  cash: number
  buyingPower: number
  totalPnL: number
  produtos: any[]
  periodoFiltro: string
  setPeriodoFiltro: (value: any) => void
  dataInicio: string
  setDataInicio: (value: string) => void
  dataFim: string
  setDataFim: (value: string) => void
  erroData: string
}

export function AccountSummary({
  equity,
  cash,
  buyingPower,
  totalPnL,
  produtos,
  periodoFiltro,
  setPeriodoFiltro,
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  erroData
}: AccountSummaryProps) {
  const totalItems = produtos.reduce((acc, p) => acc + p.quantidade, 0)

  return (
    <div className="space-y-4">
      {/* Main Card */}
      <div className="glass-card glow-green">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs uppercase tracking-wider text-gray-400">Account Value</h3>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-emerald-500 font-mono">LIVE</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-gray-500 text-xs mb-1">Total Equity</p>
            <p className="text-3xl font-bold text-emerald-400 text-glow">
              R$ {equity.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            <div>
              <p className="text-gray-500 text-[10px] uppercase">Cash</p>
              <p className="text-lg font-semibold text-white">
                R$ {cash.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px] uppercase">Buying Power</p>
              <p className="text-lg font-semibold text-emerald-300">
                R$ {buyingPower.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* P&L Card */}
      <div className={`glass-card ${totalPnL >= 0 ? 'glow-green' : ''}`}>
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Total P&L</p>
        <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {totalPnL >= 0 ? '+' : ''}R$ {totalPnL.toFixed(2)}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {produtos.length} positions • {totalItems} units
        </p>
      </div>

      {/* Period Filter */}
      <div className="glass-card">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Time Period</p>
        <select
          value={periodoFiltro}
          onChange={(e) => setPeriodoFiltro(e.target.value as any)}
          className="input-futuristic text-sm mb-3"
        >
          <option value="mes">1 Month</option>
          <option value="2meses">2 Months</option>
          <option value="6meses">6 Months</option>
          <option value="12meses">1 Year</option>
          <option value="personalizado">Custom</option>
        </select>

        {periodoFiltro === 'personalizado' && (
          <div className="space-y-2">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="input-futuristic text-sm"
              placeholder="Start date"
            />
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className={`input-futuristic text-sm ${erroData ? 'border-red-500/50' : ''}`}
              placeholder="End date"
            />
            {erroData && (
              <p className="text-[10px] text-red-400">{erroData}</p>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="glass-card">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Portfolio Stats</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Active Positions</span>
            <span className="text-sm font-mono text-emerald-400">
              {produtos.filter(p => p.quantidade > 0).length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Sold Out</span>
            <span className="text-sm font-mono text-gray-400">
              {produtos.filter(p => p.quantidade === 0).length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Inactive</span>
            <span className="text-sm font-mono text-gray-500">
              {produtos.filter(p => !p.ativo).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
