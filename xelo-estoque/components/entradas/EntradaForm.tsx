'use client'

import { useState, useEffect } from 'react'
import { PagamentoSplit } from './PagamentoSplit'

interface Estoque {
  id: string
  nome: string
  tipo: string
  produto: {
    nome: string
  }
  cotas: {
    socioId: string
    percentual: number
  }[]
}

interface Socio {
  id: string
  nome: string
  cor: string
}

interface EntradaFormProps {
  onSuccess: () => void
  onClose: () => void
}

export function EntradaForm({ onSuccess, onClose }: EntradaFormProps) {
  const [loading, setLoading] = useState(false)
  const [estoques, setEstoques] = useState<Estoque[]>([])
  const [socios, setSocios] = useState<Socio[]>([])

  const [form, setForm] = useState({
    estoqueId: '',
    tipo: 'COMPRA' as 'COMPRA' | 'REPOSICAO' | 'TRANSFERENCIA' | 'AJUSTE',
    quantidade: '',
    custoUnitario: '',
    fornecedor: '',
    dataEntrada: new Date().toISOString().split('T')[0],
  })

  const [pagamentos, setPagamentos] = useState<
    { socioId: string; percentual: number; valor: number }[]
  >([])

  useEffect(() => {
    Promise.all([
      fetch('/api/estoques').then((r) => r.json()),
      fetch('/api/socios').then((r) => r.json()),
    ]).then(([estoquesData, sociosData]) => {
      setEstoques(estoquesData)
      setSocios(sociosData)
    })
  }, [])

  const estoqueSelecionado = estoques.find((e) => e.id === form.estoqueId)

  const custoTotal =
    (parseInt(form.quantidade) || 0) * (parseFloat(form.custoUnitario) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.estoqueId || pagamentos.length === 0) return

    setLoading(true)

    try {
      const response = await fetch('/api/entradas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estoqueId: form.estoqueId,
          tipo: form.tipo,
          quantidade: parseInt(form.quantidade),
          custoUnitario: parseFloat(form.custoUnitario),
          fornecedor: form.fornecedor || undefined,
          dataEntrada: form.dataEntrada,
          pagamentos,
        }),
      })

      if (response.ok) {
        onSuccess()
        onClose()
        alert('Entrada registrada com sucesso!')
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao registrar entrada')
      }
    } catch (error) {
      alert('Erro ao registrar entrada')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-emerald-400">
              Registrar Entrada de Estoque
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-gray-400">
                  Estoque Destino
                </label>
                <select
                  required
                  value={form.estoqueId}
                  onChange={(e) => setForm({ ...form, estoqueId: e.target.value })}
                  className="input-futuristic w-full"
                >
                  <option value="">Selecione...</option>
                  {estoques.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome} ({e.produto.nome})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-gray-400">
                  Tipo
                </label>
                <select
                  required
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as typeof form.tipo })}
                  className="input-futuristic w-full"
                >
                  <option value="COMPRA">Compra</option>
                  <option value="REPOSICAO">Reposição</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="AJUSTE">Ajuste</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-gray-400">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                  className="input-futuristic w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-gray-400">
                  Custo Unitário (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.custoUnitario}
                  onChange={(e) =>
                    setForm({ ...form, custoUnitario: e.target.value })
                  }
                  className="input-futuristic w-full font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-gray-400">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={form.dataEntrada}
                  onChange={(e) =>
                    setForm({ ...form, dataEntrada: e.target.value })
                  }
                  className="input-futuristic w-full font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-400">
                Fornecedor (opcional)
              </label>
              <input
                type="text"
                value={form.fornecedor}
                onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                className="input-futuristic w-full"
                placeholder="Nome do fornecedor"
              />
            </div>

            {estoqueSelecionado && custoTotal > 0 && (
              <PagamentoSplit
                socios={socios}
                cotasAtuais={estoqueSelecionado.cotas}
                custoTotal={custoTotal}
                value={pagamentos}
                onChange={setPagamentos}
              />
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded border border-white/20 text-gray-400 hover:text-white hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || pagamentos.length === 0}
                className="flex-1 btn-primary py-3"
              >
                {loading ? 'Processando...' : 'Registrar Entrada'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
