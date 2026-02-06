'use client'

import { useState, useEffect } from 'react'
import { ProdutoForm } from '@/components/ProdutoForm'
import { VendaForm } from '@/components/VendaForm'
import { ProdutoList } from '@/components/ProdutoList'
import { VendaList } from '@/components/VendaList'
import { AccountSummary } from '@/components/AccountSummary'
import { PositionPanel } from '@/components/PositionPanel'
import { AnalyticsPanel } from '@/components/AnalyticsPanel'
import { PortfolioChart } from '@/components/PortfolioChart'

type Produto = {
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

type Venda = {
  id: string
  produto: {
    id: string
    nome: string
    custo: string
  }
  quantidade: number
  canal: string
  precoReal: string
  vendidoEm: string
}

export default function Home() {
  const [activeView, setActiveView] = useState<'dashboard' | 'trade' | 'history'>('dashboard')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'disponivel' | 'vendido'>('todos')
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [loading, setLoading] = useState(true)

  const [periodoFiltro, setPeriodoFiltro] = useState<'mes' | '2meses' | '6meses' | '12meses' | 'personalizado'>('mes')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [erroData, setErroData] = useState('')

  const fetchData = async () => {
    try {
      const [prodRes, vendRes] = await Promise.all([
        fetch(`/api/produtos${mostrarInativos ? '?todos=true' : ''}`),
        fetch('/api/vendas')
      ])
      const prodData = await prodRes.json()
      const vendData = await vendRes.json()

      setProdutos(Array.isArray(prodData) ? prodData : [])
      setVendas(Array.isArray(vendData) ? vendData : [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setProdutos([])
      setVendas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [mostrarInativos])

  const produtosFiltrados = produtos.filter(p => {
    if (filtroStatus === 'disponivel') return p.quantidade > 0
    if (filtroStatus === 'vendido') return p.quantidade === 0
    return true
  })

  const getDataLimite = () => {
    const hoje = new Date()
    const dataLimite = new Date(hoje)

    switch (periodoFiltro) {
      case 'mes':
        dataLimite.setMonth(hoje.getMonth() - 1)
        break
      case '2meses':
        dataLimite.setMonth(hoje.getMonth() - 2)
        break
      case '6meses':
        dataLimite.setMonth(hoje.getMonth() - 6)
        break
      case '12meses':
        dataLimite.setFullYear(hoje.getFullYear() - 1)
        break
      case 'personalizado':
        return dataInicio ? new Date(dataInicio) : null
      default:
        dataLimite.setMonth(hoje.getMonth() - 1)
    }

    return dataLimite
  }

  const dataLimite = getDataLimite()
  const dataFimFiltro = periodoFiltro === 'personalizado' && dataFim
    ? new Date(dataFim)
    : new Date()

  useEffect(() => {
    if (periodoFiltro === 'personalizado' && dataInicio && dataFim) {
      if (new Date(dataFim) < new Date(dataInicio)) {
        setErroData('Data final não pode ser anterior à data inicial')
      } else {
        setErroData('')
      }
    } else {
      setErroData('')
    }
  }, [dataInicio, dataFim, periodoFiltro])

  const vendasFiltradas = vendas.filter(v => {
    const dataVenda = new Date(v.vendidoEm)
    if (periodoFiltro === 'personalizado') {
      if (dataLimite && dataVenda < dataLimite) return false
      if (dataFim && dataVenda > new Date(dataFim + 'T23:59:59')) return false
      return true
    }
    return dataLimite ? dataVenda >= dataLimite : true
  })

  // Financial calculations
  const totalVendido = vendasFiltradas.reduce((acc, v) =>
    acc + (parseFloat(v.precoReal) * v.quantidade), 0
  )

  const lucroReal = vendasFiltradas.reduce((acc, v) => {
    const produto = produtos.find(p => p.id === v.produto.id)
    if (!produto) return acc
    return acc + ((parseFloat(v.precoReal) - parseFloat(produto.custo)) * v.quantidade)
  }, 0)

  const valorInvestido = produtos.reduce((acc, p) =>
    acc + (parseFloat(p.custo) * p.quantidade), 0
  )

  const potencialVenda = produtos.reduce((acc, p) =>
    acc + (parseFloat(p.precoVenda) * p.quantidade), 0
  )

  const lucroPotencial = produtos.reduce((acc, p) => {
    const lucroUnitario = parseFloat(p.precoVenda) - parseFloat(p.custo)
    return acc + (lucroUnitario * p.quantidade)
  }, 0)

  const totalEquity = valorInvestido + lucroPotencial
  const totalCash = totalVendido
  const buyingPower = potencialVenda
  const totalPnL = lucroReal + lucroPotencial

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-400 font-mono">LOADING DATA...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="glass-card">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${activeView === 'dashboard'
              ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveView('trade')}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${activeView === 'trade'
              ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            💹 Sale
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${activeView === 'history'
              ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            📜 History
          </button>
        </div>
      </div>

      {/* Dashboard View - 3 Panel Layout */}
      {activeView === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Account Summary */}
          <div className="lg:col-span-3 space-y-4">
            <AccountSummary
              equity={totalEquity}
              cash={totalCash}
              buyingPower={buyingPower}
              totalPnL={totalPnL}
              produtos={produtos}
              periodoFiltro={periodoFiltro}
              setPeriodoFiltro={setPeriodoFiltro}
              dataInicio={dataInicio}
              setDataInicio={setDataInicio}
              dataFim={dataFim}
              setDataFim={setDataFim}
              erroData={erroData}
            />
          </div>

          {/* Center Panel - Positions */}
          <div className="lg:col-span-6 space-y-4">
            <PositionPanel
              produtos={produtosFiltrados}
              filtroStatus={filtroStatus}
              setFiltroStatus={setFiltroStatus}
              mostrarInativos={mostrarInativos}
              setMostrarInativos={setMostrarInativos}
              onAddProduct={() => setModalAberto(true)}
              onUpdate={fetchData}
            />
          </div>

          {/* Right Panel - Analytics */}
          <div className="lg:col-span-3 space-y-4">
            <AnalyticsPanel
              vendas={vendasFiltradas}
              produtos={produtos}
              totalVendido={totalVendido}
              lucroReal={lucroReal}
              valorInvestido={valorInvestido}
              potencialVenda={potencialVenda}
              lucroPotencial={lucroPotencial}
            />
          </div>
        </div>
      )}

      {/* Trade View */}
      {activeView === 'trade' && (
        <div className="glass-card">
          <VendaForm
            produtos={produtos.filter(p => p.quantidade > 0 && (p.ativo || p.ativo === null))}
            onSuccess={fetchData}
          />
        </div>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <div className="glass-card">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-emerald-400 mb-2">Transaction History</h2>
            <p className="text-sm text-gray-500">
              Showing {vendasFiltradas.length} transactions for selected period
            </p>
          </div>
          <VendaList vendas={vendasFiltradas} onUpdate={fetchData} />
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <ProdutoForm
          onSuccess={fetchData}
          onClose={() => setModalAberto(false)}
        />
      )}
    </div>
  )
}
