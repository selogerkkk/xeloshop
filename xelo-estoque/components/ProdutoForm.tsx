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
        alert('Error adding position')
      }
    } catch (error) {
      alert('Error adding position')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto glow-green-strong">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-emerald-400">Add New Position</h2>
            <p className="text-xs text-gray-500 mt-1">Enter position details</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-400">Symbol / Name *</label>
            <input
              type="text"
              required
              value={form.nome}
              onChange={e => setForm({...form, nome: e.target.value})}
              className="input-futuristic"
              placeholder="Ex: CAMISETA PRETA"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-400">Product URL</label>
            <input
              type="url"
              value={form.linkProduto}
              onChange={e => setForm({...form, linkProduto: e.target.value})}
              className="input-futuristic"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-400">Cost (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.custo}
                onChange={e => setForm({...form, custo: e.target.value})}
                className="input-futuristic font-mono"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-400">Target (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.precoVenda}
                onChange={e => setForm({...form, precoVenda: e.target.value})}
                className="input-futuristic font-mono"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-400">Qty *</label>
              <input
                type="number"
                min="1"
                required
                value={form.quantidade}
                onChange={e => setForm({...form, quantidade: e.target.value})}
                className="input-futuristic font-mono"
              />
            </div>
          </div>

          {form.custo && form.precoVenda && (
            <div className="glass-card p-3 bg-emerald-950/20">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Est. Profit per Unit</span>
                <span className={`font-mono font-bold ${(parseFloat(form.precoVenda) - parseFloat(form.custo)) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(parseFloat(form.precoVenda) - parseFloat(form.custo)) >= 0 ? '+' : ''}R$ {(parseFloat(form.precoVenda) - parseFloat(form.custo)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-gray-500">Margin</span>
                <span className={`font-mono ${(parseFloat(form.precoVenda) - parseFloat(form.custo)) / parseFloat(form.custo) * 100 >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                  {((parseFloat(form.precoVenda) - parseFloat(form.custo)) / parseFloat(form.custo) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </span>
              ) : 'Add Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
