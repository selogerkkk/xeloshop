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

  const totalInvestido = produtos.reduce((acc, p) => 
    acc + (parseFloat(p.custo) * (p.quantidade + (p._count?.vendas || 0))), 0
  )
  
  const totalVendido = vendas.reduce((acc, v) => 
    acc + (parseFloat(v.precoReal) * v.quantidade), 0
  )
  
  const lucroTotal = vendas.reduce((acc, v) => {
    const produto = produtos.find(p => p.id === v.produto.id)
    if (!produto) return acc
    return acc + ((parseFloat(v.precoReal) - parseFloat(produto.custo)) * v.quantidade)
  }, 0)

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm text-gray-500">Produtos em Estoque</h3>
          <p className="text-2xl font-bold text-blue-600">
            {produtos.reduce((acc, p) => acc + p.quantidade, 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm text-gray-500">Total Vendido</h3>
          <p className="text-2xl font-bold text-green-600">
            R$ {totalVendido.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm text-gray-500">Lucro Estimado</h3>
          <p className={`text-2xl font-bold ${lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            R$ {lucroTotal.toFixed(2)}
          </p>
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
          <VendaList vendas={vendas} onUpdate={fetchData} />
        </div>
      )}
    </div>
  )
}
