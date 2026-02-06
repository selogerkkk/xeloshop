'use client'

import { useState, useMemo } from 'react'

interface Venda {
  id: string
  produto: {
    nome: string
    custo: string
  }
  quantidade: number
  canal: string
  precoReal: string
  vendidoEm: string
}

interface VendaListProps {
  vendas: Venda[]
  onUpdate?: () => void
}

const CANAL_LABELS: Record<string, string> = {
  'ML': 'Mercado Livre',
  'Facebook': 'Facebook',
  'Instagram': 'Instagram',
  'WhatsApp': 'WhatsApp',
  'Outro': 'Outro'
}

const CANAL_COLORS: Record<string, string> = {
  'ML': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Facebook': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Instagram': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'WhatsApp': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Outro': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

function getMonthStartEnd() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

export function VendaList({ vendas, onUpdate }: VendaListProps) {
  const monthRange = getMonthStartEnd()
  const [dateStart, setDateStart] = useState(monthRange.start)
  const [dateEnd, setDateEnd] = useState(monthRange.end)

  const filteredVendas = useMemo(() => {
    const start = new Date(dateStart)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dateEnd)
    end.setHours(23, 59, 59, 999)

    return vendas.filter(v => {
      const vDate = new Date(v.vendidoEm)
      return vDate >= start && vDate <= end
    })
  }, [vendas, dateStart, dateEnd])

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda? O estoque será restaurado.')) return

    try {
      const response = await fetch(`/api/vendas/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        onUpdate?.()
      } else {
        alert('Erro ao excluir venda')
      }
    } catch (error) {
      alert('Erro ao excluir venda')
    }
  }

  if (vendas.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-3xl mb-2">📜</div>
        <p className="text-sm">No transactions yet</p>
      </div>
    )
  }

  // Agrupa por canal
  const porCanal = filteredVendas.reduce((acc, venda) => {
    const canal = venda.canal
    if (!acc[canal]) acc[canal] = { total: 0, valor: 0 }
    acc[canal].total += venda.quantidade
    acc[canal].valor += Number.parseFloat(venda.precoReal) * venda.quantidade
    return acc
  }, {} as Record<string, { total: number, valor: number }>)

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-gray-400">Date Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className="input-futuristic font-mono text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className="input-futuristic font-mono text-sm"
            />
          </div>
          <span className="text-xs text-gray-500 ml-auto">
            {filteredVendas.length} transactions
          </span>
        </div>
      </div>

      {/* Resumo por Canal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(porCanal).map(([canal, dados]) => (
          <div key={canal} className="glass-card p-4">
            <span className={`inline-block px-2 py-1 rounded text-[10px] font-medium mb-2 border ${CANAL_COLORS[canal] || CANAL_COLORS['Outro']}`}>
              {CANAL_LABELS[canal] || canal}
            </span>
            <p className="text-lg font-bold text-white">{dados.total} sales</p>
            <p className="text-sm text-emerald-400 font-mono">R$ {dados.valor.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="overflow-x-auto">
        <table className="table-futuristic">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Channel</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Total</th>
              <th className="text-right">P&L</th>
              {onUpdate && <th className="text-center">Action</th>}
            </tr>
          </thead>
          <tbody>
            {filteredVendas
              .sort((a, b) => new Date(b.vendidoEm).getTime() - new Date(a.vendidoEm).getTime())
              .map(venda => {
                const custo = Number.parseFloat(venda.produto.custo)
                const preco = Number.parseFloat(venda.precoReal)
                const lucro = (preco - custo) * venda.quantidade
                const total = preco * venda.quantidade
                const data = new Date(venda.vendidoEm).toLocaleDateString('pt-BR')

                return (
                  <tr key={venda.id}>
                    <td className="text-gray-400 font-mono text-xs">{data}</td>
                    <td className="font-medium text-white">{venda.produto.nome}</td>
                    <td>
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-medium border ${CANAL_COLORS[venda.canal] || CANAL_COLORS['Outro']}`}>
                        {CANAL_LABELS[venda.canal] || venda.canal}
                      </span>
                    </td>
                    <td className="text-right font-mono">{venda.quantidade}</td>
                    <td className="text-right font-mono text-gray-300">R$ {preco.toFixed(2)}</td>
                    <td className="text-right font-mono text-white font-medium">R$ {total.toFixed(2)}</td>
                    <td className="text-right">
                      <span className={`font-mono text-sm ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {lucro >= 0 ? '+' : ''}R$ {lucro.toFixed(2)}
                      </span>
                    </td>
                    {onUpdate && (
                      <td className="text-center">
                        <button
                          type="button"
                      onClick={() => handleDelete(venda.id)}
                          className="text-[10px] font-medium px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                          DELETE
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
