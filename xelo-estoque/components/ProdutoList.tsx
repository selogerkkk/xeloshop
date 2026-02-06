'use client'

interface Produto {
  id: string
  nome: string
  linkProduto: string | null
  custo: string
  precoVenda: string
  quantidade: number
  ativo: boolean
  criadoEm: string
  _count?: {
    vendas: number
  }
}

interface ProdutoListProps {
  produtos: Produto[]
  onUpdate: () => void
}

export function ProdutoList({ produtos, onUpdate }: ProdutoListProps) {
  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const response = await fetch(`/api/produtos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo })
      })
      if (response.ok) {
        onUpdate()
      } else {
        alert('Erro ao atualizar produto')
      }
    } catch (error) {
      alert('Erro ao atualizar produto')
    }
  }

  // Generate mock sparkline data
  const generateSparkline = (trend: 'up' | 'down' | 'neutral') => {
    const points = []
    let value = 50
    for (let i = 0; i < 10; i++) {
      value += trend === 'up' ? Math.random() * 10 - 2 : trend === 'down' ? Math.random() * 10 - 8 : Math.random() * 10 - 5
      value = Math.max(10, Math.min(90, value))
      points.push(`${i * 10},${100 - value}`)
    }
    return points.join(' ')
  }

  if (produtos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-3xl mb-2">📭</div>
        <p className="text-sm">No positions found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-futuristic">
        <thead>
          <tr>
            <th>Symbol</th>
            <th className="text-right">Cost</th>
            <th className="text-right">Price</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Sold</th>
            <th className="text-right">P&L</th>
            <th className="text-center">Trend</th>
            <th className="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map(produto => {
            const custo = parseFloat(produto.custo)
            const preco = parseFloat(produto.precoVenda)
            const vendidos = produto._count?.vendas || 0
            const lucroUnitario = preco - custo
            const lucroPercent = custo > 0 ? ((preco - custo) / custo) * 100 : 0

            // Determine trend based on profit margin
            const trend: 'up' | 'down' | 'neutral' = lucroPercent > 20 ? 'up' : lucroPercent < 0 ? 'down' : 'neutral'
            const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'

            return (
              <tr
                key={produto.id}
                className={`
                  ${produto.quantidade === 0 ? 'bg-red-950/20' : ''}
                  ${!produto.ativo ? 'opacity-50' : ''}
                `}
              >
                <td>
                  <div className="font-medium text-white">
                    {produto.nome.toUpperCase().slice(0, 10)}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {produto.linkProduto && (
                      <a
                        href={produto.linkProduto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-emerald-500 hover:text-emerald-400"
                        title="Ver no site"
                      >
                        🔗
                      </a>
                    )}
                    {produto.quantidade === 0 && produto.ativo && (
                      <span className="text-[10px] text-red-500 font-medium">SOLD OUT</span>
                    )}
                    {!produto.ativo && (
                      <span className="text-[10px] text-gray-600 font-medium">INACTIVE</span>
                    )}
                  </div>
                </td>
                <td className="text-right font-mono text-gray-400">
                  {custo.toFixed(2)}
                </td>
                <td className="text-right font-mono text-white">
                  {preco.toFixed(2)}
                </td>
                <td className="text-right">
                  <span className={`font-mono font-medium ${produto.quantidade > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {produto.quantidade}
                  </span>
                </td>
                <td className="text-right font-mono text-gray-500">
                  {vendidos}
                </td>
                <td className="text-right">
                  <div className={`font-mono text-sm ${lucroUnitario >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {lucroUnitario >= 0 ? '+' : ''}{lucroUnitario.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-mono ${lucroPercent >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                    {lucroPercent >= 0 ? '+' : ''}{lucroPercent.toFixed(1)}%
                  </div>
                </td>
                <td className="text-center">
                  <svg width="60" height="20" className="inline-block">
                    <polyline
                      fill="none"
                      stroke={trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280'}
                      strokeWidth="1.5"
                      points={generateSparkline(trend)}
                      className="sparkline"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <button
                    onClick={() => handleToggleAtivo(produto.id, !produto.ativo)}
                    className={`text-[10px] font-medium px-2 py-1 rounded ${
                      produto.ativo
                        ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {produto.ativo ? 'INACTIVATE' : 'ACTIVATE'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
