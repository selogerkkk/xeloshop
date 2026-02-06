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
    precoReal: '',
    dataVenda: new Date().toISOString().split('T')[0]
  })

  const produtoSelecionado = produtos.find(p => p.id === form.produtoId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!produtoSelecionado) return

    const qtd = Number.parseInt(form.quantidade)
    if (qtd > produtoSelecionado.quantidade) {
      alert(`Insufficient stock! Available: ${produtoSelecionado.quantidade}`)
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
          precoReal: Number.parseFloat(form.precoReal),
          dataVenda: form.dataVenda
        })
      })

      if (response.ok) {
        setForm({ produtoId: '', quantidade: '1', canal: 'ML', precoReal: '', dataVenda: new Date().toISOString().split('T')[0] })
        onSuccess()
        alert('Trade executed successfully!')
      } else {
        const err = await response.json()
        alert(err.error || 'Error executing trade')
      }
    } catch (error) {
      alert('Error executing trade')
    } finally {
      setLoading(false)
    }
  }

  if (produtos.length === 0) {
    return (
      <div className="glass-card border-yellow-500/30">
        <div className="text-center py-8">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-yellow-400">
            No available positions to trade. Add products first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-emerald-400">Execute Trade</h2>
          <p className="text-sm text-gray-500">Register a new sale transaction</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-500 font-mono">LIVE</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="produtoId" className="text-xs uppercase tracking-wider text-gray-400">Position</label>
          <select
            id="produtoId"
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
            className="input-futuristic"
          >
            <option value="">Select position...</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome.toUpperCase()} (Qty: {p.quantidade})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="canal" className="text-xs uppercase tracking-wider text-gray-400">Sales Channel</label>
          <select
            id="canal"
            required
            value={form.canal}
            onChange={e => setForm({...form, canal: e.target.value})}
            className="input-futuristic"
          >
            <option value="ML">Mercado Livre</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Outro">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="dataVenda" className="text-xs uppercase tracking-wider text-gray-400">Sale Date</label>
          <input
            id="dataVenda"
            type="date"
            required
            value={form.dataVenda}
            onChange={e => setForm({...form, dataVenda: e.target.value})}
            className="input-futuristic font-mono"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="quantidade" className="text-xs uppercase tracking-wider text-gray-400">Quantity</label>
          <input
            id="quantidade"
            type="number"
            min="1"
            max={produtoSelecionado?.quantidade || 1}
            required
            value={form.quantidade}
            onChange={e => setForm({...form, quantidade: e.target.value})}
            className="input-futuristic"
          />
          {produtoSelecionado && (
            <p className="text-[10px] text-gray-500">
              Available: {produtoSelecionado.quantidade} units
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="precoReal" className="text-xs uppercase tracking-wider text-gray-400">Execution Price (R$)</label>
          <input
            id="precoReal"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.precoReal}
            onChange={e => setForm({...form, precoReal: e.target.value})}
            className="input-futuristic font-mono"
            placeholder="0.00"
          />
          {produtoSelecionado && (
            <p className="text-[10px] text-gray-500">
              Target: R$ {Number.parseFloat(produtoSelecionado.precoVenda).toFixed(2)}
            </p>
          )}
        </div>

        {produtoSelecionado && (
          <div className="md:col-span-2 glass-card p-4 bg-emerald-950/20">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Estimated Total</span>
              <span className="font-mono font-bold text-emerald-400">
                R$ {(Number.parseFloat(form.precoReal) * Number.parseInt(form.quantidade) || 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading || !form.produtoId}
            className="btn-primary w-full py-3 text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : 'Execute Trade'}
          </button>
        </div>
      </form>
    </div>
  )
}
