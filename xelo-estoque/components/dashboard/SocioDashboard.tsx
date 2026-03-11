'use client'

import { useState, useEffect } from 'react'
import { CotaVisualizer } from '../estoques/CotaVisualizer'

interface SocioData {
  socio: {
    id: string
    nome: string
    cor: string
    saldoDisponivel: number
    saldoPendente: number
    totalInvestido: number
    totalRecebido: number
    totalSacado: number
  }
  distribuicoes: {
    pendente: number
    liberado: number
    retido: number
  }
  dividas: {
    total: number
  }
  posicoes: {
    estoqueNome: string
    tipo: string
    produtoNome: string
    percentual: number
    valorInvestido: number
    cotas: {
      socioNome: string
      socioCor: string
      percentual: number
    }[]
  }[]
}

interface SocioDashboardProps {
  socioId: string
}

export function SocioDashboard({ socioId }: SocioDashboardProps) {
  const [data, setData] = useState<SocioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/dashboard/por-socio?socioId=${socioId}`)

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
  }, [socioId])

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

  const { socio, distribuicoes, dividas, posicoes } = data

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-emerald-500/30">
          <p className="text-xs text-gray-500 mb-1">Saldo Disponível</p>
          <p className="text-xl font-mono text-emerald-400">
            R$ {socio.saldoDisponivel.toFixed(2)}
          </p>
        </div>
        <div className="glass-card p-4 border-yellow-500/30">
          <p className="text-xs text-gray-500 mb-1">Saldo Pendente</p>
          <p className="text-xl font-mono text-yellow-400">
            R$ {socio.saldoPendente.toFixed(2)}
          </p>
        </div>
        <div className="glass-card p-4 border-blue-500/30">
          <p className="text-xs text-gray-500 mb-1">Total Investido</p>
          <p className="text-xl font-mono text-blue-400">
            R$ {socio.totalInvestido.toFixed(2)}
          </p>
        </div>
        <div className="glass-card p-4 border-purple-500/30">
          <p className="text-xs text-gray-500 mb-1">Lucro Recebido</p>
          <p className="text-xl font-mono text-purple-400">
            R$ {socio.totalRecebido.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-medium text-white">Minhas Posições</h3>
          {posicoes.length === 0 ? (
            <p className="text-gray-500 text-sm">Você não possui cotas em nenhum estoque.</p>
          ) : (
            posicoes.map((pos) => (
              <div key={pos.estoqueNome} className="glass-card p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        pos.tipo === 'INDIVIDUAL'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {pos.tipo === 'INDIVIDUAL' ? 'Individual' : 'Pool'}
                    </span>
                    <h4 className="font-medium text-white mt-1">{pos.estoqueNome}</h4>
                    <p className="text-xs text-gray-500">{pos.produtoNome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-emerald-400">
                      {pos.percentual.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      R$ {pos.valorInvestido.toFixed(2)}
                    </p>
                  </div>
                </div>
                <CotaVisualizer cotas={pos.cotas} showLegend={false} />
              </div>
            ))
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Resumo</h3>

          <div className="glass-card p-4">
            <h4 className="text-sm text-gray-400 mb-3">Distribuições</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-yellow-400">Pendente</span>
                <span className="font-mono">R$ {distribuicoes.pendente.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">Liberado</span>
                <span className="font-mono">R$ {distribuicoes.liberado.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">Retido</span>
                <span className="font-mono">R$ {distribuicoes.retido.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {dividas.total > 0 && (
            <div className="glass-card p-4 border-red-500/30">
              <h4 className="text-sm text-red-400 mb-2">⚠️ Dívidas Ativas</h4>
              <p className="text-xl font-mono text-red-400">
                R$ {dividas.total.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
