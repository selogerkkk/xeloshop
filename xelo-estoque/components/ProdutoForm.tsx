'use client'

import { useState } from 'react'

interface ProdutoFormProps {
  onSuccess: () => void
  onClose: () => void
}

export function ProdutoForm({ onSuccess, onClose }: ProdutoFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    linkProduto: '',
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
          linkProduto: form.linkProduto || null,
          custo: parseFloat(form.custo),
          precoVenda: parseFloat(form.precoVenda),
          quantidade: parseInt(form.quantidade)
        })
      })

      if (response.ok) {
        setForm({ nome: '', linkProduto: '', custo: '', precoVenda: '', quantidade: '1' })
        onSuccess()
        onClose()
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">➕ Adicionar Produto</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Produto *
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
                Link do Produto no Site
              </label>
              <input
                type="url"
                value={form.linkProduto}
                onChange={e => setForm({...form, linkProduto: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="https://..."
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custo (R$) *
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
                  Preço Venda (R$) *
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
                  Qtd *
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
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
