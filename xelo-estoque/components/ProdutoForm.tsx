'use client'

import { useState } from 'react'

interface ProdutoFormProps {
  onSuccess: () => void
}

export function ProdutoForm({ onSuccess }: ProdutoFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    custo: '',
    precoVenda: '',
    quantidade: '1'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          custo: parseFloat(form.custo),
          precoVenda: parseFloat(form.precoVenda),
          quantidade: parseInt(form.quantidade)
        })
      })

      if (response.ok) {
        setForm({ nome: '', custo: '', precoVenda: '', quantidade: '1' })
        onSuccess()
        alert('Produto adicionado!')
      } else {
        alert('Erro ao adicionar produto')
      }
    } catch (error) {
      alert('Erro ao adicionar produto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h2 className="text-lg font-semibold mb-4">➕ Adicionar Produto</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Produto
          </label>
          <input
            type="text"
            required
            value={form.nome}
            onChange={e => setForm({...form, nome: e.target.value})}
            className="w-full border rounded px-3 py-2"
            placeholder="Ex: Camiseta Preta"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custo (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={form.custo}
            onChange={e => setForm({...form, custo: e.target.value})}
            className="w-full border rounded px-3 py-2"
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preço Venda (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={form.precoVenda}
            onChange={e => setForm({...form, precoVenda: e.target.value})}
            className="w-full border rounded px-3 py-2"
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantidade
          </label>
          <input
            type="number"
            min="1"
            required
            value={form.quantidade}
            onChange={e => setForm({...form, quantidade: e.target.value})}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="md:col-span-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Adicionar Produto'}
          </button>
        </div>
      </form>
    </div>
  )
}
