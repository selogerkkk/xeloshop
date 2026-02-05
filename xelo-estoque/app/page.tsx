'use client'

import { useState, useEffect } from 'react'
import { ProdutoForm } from '@/components/ProdutoForm'
import { VendaForm } from '@/components/VendaForm'
import { ProdutoList } from '@/components/ProdutoList'
import { VendaList } from '@/components/VendaList'

type Produto = {
  id: string
  nome: string
  linkProduto: string | null
  custo: string
  precoVenda: string
  quantidade: number
  ativo: boolean
  _count?: {
    vendas: number
  }
}

type Venda = {
  id: string
  produto: {
    nome: string
  }
  quantidade: number
  canal: string
  precoReal: string
  vendidoEm: string
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'estoque' | 'vendas' | 'historico'>('estoque')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'disponivel' | 'vendido'>('todos')
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Filtro de data
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
      
      // Verifica se é array (proteção contra erro da API)
      setProdutos(Array.isArray(prodData) ? prodData : [])
      setVendas(Array.isArray(vendData) ? vendData : [])
      
      // Se deu erro, mostra no console
      if (!Array.isArray(prodData)) {
        console.error('Erro na API de produtos:', prodData)
      }
      if (!Array.isArray(vendData)) {
        console.error('Erro na API de vendas:', vendData)
      }
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

  // === FILTRO DE DATA ===
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
  
  // Validação de data
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

  // === CÁLCULOS FINANCEIROS ===
  
  // Já vendido (filtrado por período)
  const totalVendido = vendasFiltradas.reduce((acc, v) => 
    acc + (parseFloat(v.precoReal) * v.quantidade), 0
  )
  
  const lucroReal = vendasFiltradas.reduce((acc, v) => {
    const produto = produtos.find(p => p.id === v.produto.id)
    if (!produto) return acc
    return acc + ((parseFloat(v.precoReal) - parseFloat(produto.custo)) * v.quantidade)
  }, 0)
  
  // Estoque atual
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

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo - VENDAS */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-2">
          📊 Vendas no período: {periodoFiltro === 'personalizado' 
            ? (dataInicio && dataFim ? `${new Date(dataInicio).toLocaleDateString('pt-BR')} - ${new Date(dataFim).toLocaleDateString('pt-BR')}` : 'Personalizado')
            : periodoFiltro === 'mes' ? 'Mês atual'
            : periodoFiltro === '2meses' ? 'Últimos 2 meses'
            : periodoFiltro === '6meses' ? 'Últimos 6 meses'
            : 'Último ano'
          }
          {vendasFiltradas.length > 0 && (
            <span className="text-gray-400"> ({vendasFiltradas.length} venda{vendasFiltradas.length !== 1 ? 's' : ''})</span>
          )}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
            <h3 className="text-sm text-green-700 font-medium">💰 Faturamento</h3>
            <p className="text-2xl font-bold text-green-600">
              R$ {totalVendido.toFixed(2)}
            </p>
            <p className="text-xs text-green-600">Total vendido no período</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg shadow border border-emerald-200">
            <h3 className="text-sm text-emerald-700 font-medium">📈 Lucro Real</h3>
            <p className={`text-2xl font-bold ${lucroReal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              R$ {lucroReal.toFixed(2)}
            </p>
            <p className="text-xs text-emerald-600">Do período selecionado</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
            <h3 className="text-sm text-blue-700 font-medium">📦 Itens em Estoque</h3>
            <p className="text-2xl font-bold text-blue-600">
              {produtos.reduce((acc, p) => acc + p.quantidade, 0)}
            </p>
            <p className="text-xs text-blue-600">Unidades disponíveis</p>
          </div>
        </div>
      </div>

      {/* Cards de Resumo - ESTOQUE */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 p-4 rounded-lg shadow border border-amber-200">
          <h3 className="text-sm text-amber-700 font-medium">💵 Valor Investido</h3>
          <p className="text-2xl font-bold text-amber-600">
            R$ {valorInvestido.toFixed(2)}
          </p>
          <p className="text-xs text-amber-600">Custo do estoque atual</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg shadow border border-purple-200">
          <h3 className="text-sm text-purple-700 font-medium">🎯 Potencial de Venda</h3>
          <p className="text-2xl font-bold text-purple-600">
            R$ {potencialVenda.toFixed(2)}
          </p>
          <p className="text-xs text-purple-600">Se vender tudo</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg shadow border border-indigo-200">
          <h3 className="text-sm text-indigo-700 font-medium">✨ Lucro Potencial</h3>
          <p className={`text-2xl font-bold ${lucroPotencial >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
            R$ {lucroPotencial.toFixed(2)}
          </p>
          <p className="text-xs text-indigo-600">Lucro se vender estoque</p>
        </div>
      </div>

      {/* Filtro de Data */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-sm font-medium text-gray-700">📅 Período:</span>
          <select
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value as any)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="mes">Mês atual</option>
            <option value="2meses">Últimos 2 meses</option>
            <option value="6meses">Últimos 6 meses</option>
            <option value="12meses">Último ano</option>
            <option value="personalizado">Personalizado</option>
          </select>
          
          {periodoFiltro === 'personalizado' && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Data início"
                />
                <span className="text-gray-500">até</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className={`border rounded px-2 py-1 text-sm ${erroData ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder="Data fim"
                />
              </div>
              {erroData && (
                <span className="text-xs text-red-600">{erroData}</span>
              )}
            </div>
          )}
          
          {periodoFiltro !== 'personalizado' && dataLimite && (
            <span className="text-xs text-gray-500">
              De {dataLimite.toLocaleDateString('pt-BR')} até {dataFimFiltro.toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('estoque')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'estoque' 
              ? 'border-b-2 border-blue-600 text-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📦 Estoque
        </button>
        <button
          onClick={() => setActiveTab('vendas')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'vendas' 
              ? 'border-b-2 border-blue-600 text-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          💰 Nova Venda
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'historico' 
              ? 'border-b-2 border-blue-600 text-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📋 Histórico
        </button>
      </div>

      {/* Conteúdo */}
      {activeTab === 'estoque' && (
        <div className="space-y-6">
          {/* Botão Adicionar */}
          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-600">Estoque:</span>
                <select 
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as any)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="disponivel">Com Estoque</option>
                  <option value="vendido">Esgotados</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mostrarInativos}
                  onChange={(e) => setMostrarInativos(e.target.checked)}
                  className="rounded"
                />
                Mostrar inativos
              </label>
            </div>
            <button
              onClick={() => setModalAberto(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              ➕ Adicionar Produto
            </button>
          </div>

          {/* Mensagem quando vazio */}
          {produtos.length === 0 && !loading && (
            <div className="bg-yellow-50 border border-yellow-200 p-8 rounded-lg text-center">
              <p className="text-yellow-800 text-lg mb-2">📭 Nenhum produto cadastrado</p>
              <p className="text-yellow-600 text-sm mb-4">
                Clique em "Adicionar Produto" para começar
              </p>
              <button
                onClick={() => setModalAberto(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Adicionar Primeiro Produto
              </button>
            </div>
          )}
          
          {produtos.length > 0 && (
            <ProdutoList 
              produtos={produtosFiltrados} 
              onUpdate={fetchData}
            />
          )}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <ProdutoForm 
          onSuccess={fetchData} 
          onClose={() => setModalAberto(false)} 
        />
      )}

      {activeTab === 'vendas' && (
        <div>
          <VendaForm 
            produtos={produtos.filter(p => p.quantidade > 0 && (p.ativo || p.ativo === null))} 
            onSuccess={fetchData}
          />
        </div>
      )}

      {activeTab === 'historico' && (
        <div>
          <div className="mb-4 text-sm text-gray-600">
            Mostrando {vendasFiltradas.length} venda(s) no período selecionado
          </div>
          <VendaList vendas={vendasFiltradas} onUpdate={fetchData} />
        </div>
      )}
    </div>
  )
}
