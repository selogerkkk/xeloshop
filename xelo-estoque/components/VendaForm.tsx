'use client'

import { useState } from 'react'

interface Produto {
  id: string
  nome: string
  quantidade: number
  precoVenda: string
}

interface VendaFormProps {
  produtos: Produto[]
  onSuccess: () => void
}

export function VendaForm({ produtos, onSuccess }: VendaFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    produtoId: '',
    quantidade: '1',
    canal: 'ML',
    precoReal: ''
  })

  const produtoSelecionado = produtos.find(p => p.id === form.produtoId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!produtoSelecionado) return

    const qtd = parseInt(form.quantidade)
    if (qtd > produtoSelecionado.quantidade) {
      alert(`Estoque insuficiente! Disponível: ${produtoSelecionado.quantidade}`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId: form.produtoId,
          quantidade: qtd,
          canal: form.canal,
          precoReal: parseFloat(form.precoReal)
        })
      })

      if (response.ok) {
        setForm({ produtoId: '', quantidade: '1', canal: 'ML', precoReal: '' })
        onSuccess()
        alert('Venda registrada!')
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao registrar venda')
      }
    } catch (error) {
      alert('Erro ao registrar venda')
    } finally {
      setLoading(false)
    }
  }

  if (produtos.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
        <p className="text-yellow-800">
          ⚠️ Não há produtos com estoque disponível. Adicione produtos primeiro.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h2 className="text-lg font-semibold mb-4">💰 Registrar Venda</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Produto
          </label>
          <select
            required
            value={form.produtoId}
            onChange={e => {
              const p = produtos.find(p => p.id === e.target.value)
              setForm({
                ...form, 
                produtoId: e.target.value,
                precoReal: p ? p.precoVenda : ''
              })
            }}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Selecione...</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} (Estoque: {p.quantidade})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Canal de Venda
          </label>
          <select
            required
            value={form.canal}
            onChange={e => setForm({...form, canal: e.target.value})}
            className="w-full border rounded px-3 py-2"
          >
            <option value="ML">Mercado Livre</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantidade
          </label>
          <input
            type="number"
            min="1"
            max={produtoSelecionado?.quantidade || 1}
            required
            value={form.quantidade}
            onChange={e => setForm({...form, quantidade: e.target.value})}
            className="w-full border rounded px-3 py-2"
          />
          {produtoSelecionado && (
            <span className="text-xs text-gray-500">
              Disponível: {produtoSelecionado.quantidade}
            </span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preço Real da Venda (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={form.precoReal}
            onChange={e => setForm({...form, precoReal: e.target.value})}
            className="w-full border rounded px-3 py-2"
            placeholder="0,00"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading || !form.produtoId}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrar Venda'}
          </button>
        </div>
      </form>
    </div>
  )
}
