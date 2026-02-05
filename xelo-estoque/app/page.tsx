'use client'

import { useState, useEffect } from 'react'
import { ProdutoForm } from '@/components/ProdutoForm'
import { VendaForm } from '@/components/VendaForm'
import { ProdutoList } from '@/components/ProdutoList'
import { VendaList } from '@/components/VendaList'

type Produto = {
  id: string
  nome: string
  custo: string
  precoVenda: string
  quantidade: number
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
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [prodRes, vendRes] = await Promise.all([
        fetch('/api/produtos'),
        fetch('/api/vendas')
      ])
      const prodData = await prodRes.json()
      const vendData = await vendRes.json()
      setProdutos(prodData)
      setVendas(vendData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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
          <ProdutoForm onSuccess={fetchData} />
          
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Filtrar:</span>
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
          
          <ProdutoList 
            produtos={produtosFiltrados} 
            onUpdate={fetchData}
          />
        </div>
      )}

      {activeTab === 'vendas' && (
        <div>
          <VendaForm 
            produtos={produtos.filter(p => p.quantidade > 0)} 
            onSuccess={fetchData}
          />
        </div>
      )}

      {activeTab === 'historico' && (
        <div>
          <VendaList vendas={vendas} />
        </div>
      )}
    </div>
  )
}
