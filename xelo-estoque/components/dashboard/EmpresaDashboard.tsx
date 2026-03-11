'use client'

import { useState, useEffect } from 'react'

interface DashboardData {
  geral: {
    estoquesAtivos: number
    sociosAtivos: number
    vendas: {
      totalVendas: number
      receitaTotal: number
      custoTotal: number
      lucroTotal: number
      porCanal: Record<string, { receita: number; lucro: number }>
    }
    entradas: {
      totalEntradas: number
      totalInvestido: number
    }
  }
  socios: {
    id: string
    nome: string
    cor: string
    saldoDisponivel: number
    saldoPendente: number
    totalInvestido: number
  }[]
  estoques: {
    id: string
    nome: string
    tipo: string
    produtoNome: string
    quantidadeDisponivel: number
    valorTotalInvestido: number
    cotas: {
      socioNome: string
      socioCor: string
      percentual: number
    }[]
  }[]
}

export function EmpresaDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/dashboard/resumo')

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load dashboard data</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  const { geral, socios, estoques } = data

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Estoques Ativos</p>
          <p className="text-2xl font-mono text-white">{geral.estoquesAtivos}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Sócios Ativos</p>
          <p className="text-2xl font-mono text-white">{geral.sociosAtivos}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Vendas (30d)</p>
          <p className="text-2xl font-mono text-emerald-400">
            {geral.vendas.totalVendas}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Lucro Total (30d)</p>
          <p className="text-2xl font-mono text-emerald-400">
            R$ {geral.vendas.lucroTotal.toFixed(0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partner Balances */}
        <div className="glass-card p-4">
          <h3 className="text-lg font-medium text-white mb-4">Saldos por Sócio</h3>
          <div className="space-y-3">
            {socios.map((socio) => (
              <div
                key={socio.id}
                className="flex items-center justify-between p-3 bg-black/20 rounded"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: socio.cor }}
                  />
                  <span className="text-white">{socio.nome}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-emerald-400">
                    R$ {socio.saldoDisponivel.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Pendente: R$ {socio.saldoPendente.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by Channel */}
        <div className="glass-card p-4">
          <h3 className="text-lg font-medium text-white mb-4">Vendas por Canal</h3>
          <div className="space-y-3">
            {Object.entries(geral.vendas.porCanal).map(([canal, dados]) => (
              <div
                key={canal}
                className="flex items-center justify-between p-3 bg-black/20 rounded"
              >
                <span className="text-gray-300">{canal}</span>
                <div className="text-right">
                  <p className="font-mono text-emerald-400">
                    R$ {dados.receita.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Lucro: R$ {dados.lucro.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Overview */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-medium text-white mb-4">Visão Geral dos Estoques</h3>
        <div className="overflow-x-auto">
          <table className="table-futuristic">
            <thead>
              <tr>
                <th>Estoque</th>
                <th>Tipo</th>
                <th>Produto</th>
                <th className="text-right">Quantidade</th>
                <th className="text-right">Valor Investido</th>
              </tr>
            </thead>
            <tbody>
              {estoques.map((e) => (
                <tr key={e.id}>
                  <td className="text-white">{e.nome}</td>
                  <td>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        e.tipo === 'INDIVIDUAL'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {e.tipo === 'INDIVIDUAL' ? 'Individual' : 'Pool'}
                    </span>
                  </td>
                  <td className="text-gray-400">{e.produtoNome}</td>
                  <td className="text-right font-mono text-emerald-400">
                    {e.quantidadeDisponivel}
                  </td>
                  <td className="text-right font-mono">
                    R$ {e.valorTotalInvestido.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
