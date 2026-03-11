'use client'

import { useState, useEffect } from 'react'
import { EstoqueSelector } from './estoques/EstoqueSelector'
import { DistribuicaoPreview } from './vendas/DistribuicaoPreview'

interface Produto {
  id: string
  nome: string
}

interface VendaFormProps {
  produtos: Produto[]
  onSuccess: () => void
}

interface PreviewData {
  receitaTotal: number
  custoTotal: number
  lucroTotal: number
  distribuicaoPorSocio: Record<string, { nome: string; valor: number; cor: string; percentual: number }>
}

export function VendaForm({ produtos, onSuccess }: VendaFormProps) {
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)

  // Helper to get local date string in YYYY-MM-DD format
  const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [form, setForm] = useState({
    produtoId: '',
    estoqueId: '',
    quantidade: '1',
    canal: 'ML',
    precoUnitario: '',
    dataVenda: getLocalDateString(),
  })

  const produtoSelecionado = produtos.find((p) => p.id === form.produtoId)

  // Fetch preview when form changes
  useEffect(() => {
    if (!form.estoqueId || !form.quantidade || !form.precoUnitario) {
      setPreview(null)
      return
    }

    const qtd = parseInt(form.quantidade)
    const preco = parseFloat(form.precoUnitario)

    if (qtd <= 0 || preco <= 0) {
      setPreview(null)
      return
    }

    setPreviewLoading(true)
    fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canal: form.canal,
        itens: [
          {
            estoqueId: form.estoqueId,
            quantidade: qtd,
            precoUnitario: preco,
          },
        ],
        dataVenda: form.dataVenda,
        preview: true,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.resumo) {
          setPreview({
            receitaTotal: data.resumo.receitaTotal,
            custoTotal: data.resumo.custoTotal,
            lucroTotal: data.resumo.lucroTotal,
            distribuicaoPorSocio: data.resumo.distribuicaoPorSocio,
          })
        }
      })
      .finally(() => setPreviewLoading(false))
  }, [form.estoqueId, form.quantidade, form.precoUnitario, form.canal, form.dataVenda])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.estoqueId) return

    setLoading(true)

    try {
      const response = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canal: form.canal,
          itens: [
            {
              estoqueId: form.estoqueId,
              quantidade: parseInt(form.quantidade),
              precoUnitario: parseFloat(form.precoUnitario),
            },
          ],
          dataVenda: form.dataVenda,
        }),
      })

      if (response.ok) {
        setForm({
          produtoId: '',
          estoqueId: '',
          quantidade: '1',
          canal: 'ML',
          precoUnitario: '',
          dataVenda: getLocalDateString(),
        })
        setPreview(null)
        onSuccess()
        alert('Venda registrada com sucesso!')
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
      <div className="glass-card border-yellow-500/30">
        <div className="text-center py-8">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-yellow-400">
            Nenhum produto disponível para venda.
          </p>
        </div>
      </div>
    )
  }

  // Convert preview data to array for component
  const distribuicaoArray = preview
    ? Object.entries(preview.distribuicaoPorSocio).map(([id, data]) => ({
        socioId: id,
        socioNome: data.nome,
        socioCor: data.cor,
        percentual: data.percentual,
        valor: data.valor,
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-emerald-400">Registrar Venda</h2>
          <p className="text-sm text-gray-500">Selecione o produto e o estoque</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-400">Produto</label>
            <select
              required
              value={form.produtoId}
              onChange={(e) =>
                setForm({ ...form, produtoId: e.target.value, estoqueId: '' })
              }
              className="input-futuristic w-full"
            >
              <option value="">Selecione um produto...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {form.produtoId && (
            <EstoqueSelector
              produtoId={form.produtoId}
              quantidadeDesejada={parseInt(form.quantidade) || 1}
              onSelect={(id) => setForm({ ...form, estoqueId: id ?? '' })}
              selectedId={form.estoqueId}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-400">Canal</label>
              <select
                required
                value={form.canal}
                onChange={(e) => setForm({ ...form, canal: e.target.value })}
                className="input-futuristic w-full"
              >
                <option value="ML">Mercado Livre</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-400">Data</label>
              <input
                type="date"
                required
                value={form.dataVenda}
                onChange={(e) => setForm({ ...form, dataVenda: e.target.value })}
                className="input-futuristic w-full font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-400">Quantidade</label>
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
                Preço Unitário (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.precoUnitario}
                onChange={(e) => setForm({ ...form, precoUnitario: e.target.value })}
                className="input-futuristic w-full font-mono"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.estoqueId}
            className="btn-primary w-full py-3 text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </span>
            ) : (
              'Confirmar Venda'
            )}
          </button>
        </div>

        {/* Right Column - Preview */}
        <div>
          {previewLoading && (
            <div className="glass-card p-8 text-center">
              <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Calculando distribuição...</p>
            </div>
          )}

          {preview && !previewLoading && (
            <DistribuicaoPreview
              receitaTotal={preview.receitaTotal}
              custoTotal={preview.custoTotal}
              lucroTotal={preview.lucroTotal}
              distribuicao={distribuicaoArray}
            />
          )}

          {!preview && !previewLoading && (
            <div className="glass-card p-8 text-center border-dashed border-2 border-gray-700">
              <p className="text-gray-500 text-sm">
                Preencha os dados para ver a preview da distribuição
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
