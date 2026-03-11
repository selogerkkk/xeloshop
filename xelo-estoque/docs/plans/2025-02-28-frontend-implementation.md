# Frontend Implementation Plan - Sistema de Estoque com Cotas

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the React frontend components for the quota-based stock system with partner/company dashboard toggle, stock pool selection for sales, and dual-mode entry forms.

**Architecture:** Tab-based dashboard switching between partner and company views. Sale form uses product-first then pool selection with smart defaults. Entry form has simple/advanced mode toggle for payment splitting.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, existing glass-card UI theme

---

## Task 1: Create ViewToggle Component

**Files:**
- Create: `components/dashboard/ViewToggle.tsx`

**Step 1: Create component with tab interface**

```tsx
'use client'

interface ViewToggleProps {
  activeView: 'socio' | 'empresa'
  onViewChange: (view: 'socio' | 'empresa') => void
}

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="glass-card p-1">
      <div className="flex gap-1">
        <button
          onClick={() => onViewChange('socio')}
          className={`flex-1 px-6 py-2 text-sm font-medium transition-all rounded ${
            activeView === 'socio'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          👤 Minha Visão
        </button>
        <button
          onClick={() => onViewChange('empresa')}
          className={`flex-1 px-6 py-2 text-sm font-medium transition-all rounded ${
            activeView === 'empresa'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          🏢 Visão Empresa
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/dashboard/ViewToggle.tsx
git commit -m "feat: add ViewToggle component for dashboard switching"
```

---

## Task 2: Create CotaVisualizer Component

**Files:**
- Create: `components/estoques/CotaVisualizer.tsx`

**Step 1: Create quota visualization component**

```tsx
'use client'

interface Cota {
  socioNome: string
  socioCor: string
  percentual: number
}

interface CotaVisualizerProps {
  cotas: Cota[]
  showLegend?: boolean
}

export function CotaVisualizer({ cotas, showLegend = true }: CotaVisualizerProps) {
  return (
    <div className="space-y-2">
      <div className="h-3 w-full rounded-full overflow-hidden flex">
        {cotas.map((cota, index) => (
          <div
            key={index}
            style={{
              width: `${cota.percentual}%`,
              backgroundColor: cota.socioCor,
            }}
            className="h-full"
            title={`${cota.socioNome}: ${cota.percentual.toFixed(1)}%`}
          />
        ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-3 text-xs">
          {cotas.map((cota, index) => (
            <div key={index} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cota.socioCor }}
              />
              <span className="text-gray-400">
                {cota.socioNome} ({cota.percentual.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/estoques/CotaVisualizer.tsx
git commit -m "feat: add CotaVisualizer component for quota bars"
```

---

## Task 3: Create EstoqueSelector Component

**Files:**
- Create: `components/estoques/EstoqueSelector.tsx`

**Step 1: Create pool selector with availability display**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { CotaVisualizer } from './CotaVisualizer'

interface Estoque {
  id: string
  nome: string
  tipo: 'INDIVIDUAL' | 'POOL'
  quantidadeDisponivel: number
  custoMedio: number
  cotas: {
    socioNome: string
    socioCor: string
    percentual: number
  }[]
}

interface EstoqueSelectorProps {
  produtoId: string
  quantidadeDesejada: number
  onSelect: (estoqueId: string) => void
  selectedId?: string
}

export function EstoqueSelector({
  produtoId,
  quantidadeDesejada,
  onSelect,
  selectedId,
}: EstoqueSelectorProps) {
  const [estoques, setEstoques] = useState<Estoque[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!produtoId) return

    setLoading(true)
    fetch(`/api/estoques/disponiveis?produtoId=${produtoId}&quantidadeMinima=${quantidadeDesejada}`)
      .then((res) => res.json())
      .then((data) => {
        setEstoques(data)
        // Auto-select oldest (first in list) if none selected
        if (data.length > 0 && !selectedId) {
          onSelect(data[0].id)
        }
      })
      .finally(() => setLoading(false))
  }, [produtoId, quantidadeDesejada])

  if (loading) {
    return <div className="text-sm text-gray-500">Carregando estoques...</div>
  }

  if (estoques.length === 0) {
    return (
      <div className="glass-card p-4 border-yellow-500/30">
        <p className="text-yellow-400 text-sm">
          ⚠️ Nenhum estoque disponível para esta quantidade
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Selecione o estoque (mais antigo sugerido):</p>
      {estoques.map((estoque) => (
        <div
          key={estoque.id}
          onClick={() => onSelect(estoque.id)}
          className={`glass-card p-4 cursor-pointer transition-all ${
            selectedId === estoque.id
              ? 'border-emerald-500/50 bg-emerald-950/20'
              : 'hover:border-white/20'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className={`text-[10px] px-2 py-0.5 rounded ${
                estoque.tipo === 'INDIVIDUAL'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-purple-500/20 text-purple-400'
              }`}>
                {estoque.tipo === 'INDIVIDUAL' ? 'Individual' : 'Pool'}
              </span>
              <h4 className="font-medium text-white mt-1">{estoque.nome}</h4>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-emerald-400">
                {estoque.quantidadeDisponivel} un
              </p>
              <p className="text-xs text-gray-500">
                Custo médio: R$ {estoque.custoMedio.toFixed(2)}
              </p>
            </div>
          </div>
          <CotaVisualizer cotas={estoque.cotas} showLegend={false} />
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/estoques/EstoqueSelector.tsx
git commit -m "feat: add EstoqueSelector with auto-select oldest pool"
```

---

## Task 4: Create DistribuicaoPreview Component

**Files:**
- Create: `components/vendas/DistribuicaoPreview.tsx`

**Step 1: Create profit distribution preview panel**

```tsx
'use client'

interface DistribuicaoItem {
  socioId: string
  socioNome: string
  socioCor: string
  percentual: number
  valor: number
}

interface DistribuicaoPreviewProps {
  receitaTotal: number
  custoTotal: number
  lucroTotal: number
  distribuicao: DistribuicaoItem[]
}

export function DistribuicaoPreview({
  receitaTotal,
  custoTotal,
  lucroTotal,
  distribuicao,
}: DistribuicaoPreviewProps) {
  return (
    <div className="glass-card p-4 bg-emerald-950/10 border-emerald-500/30">
      <h4 className="text-sm font-medium text-emerald-400 mb-4">
        📊 Preview da Distribuição
      </h4>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Receita Total</p>
          <p className="font-mono text-white">R$ {receitaTotal.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Custo Total</p>
          <p className="font-mono text-red-400">R$ {custoTotal.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Lucro Total</p>
          <p className="font-mono text-emerald-400">R$ {lucroTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-gray-500 mb-3">Distribuição do Lucro:</p>
        <div className="space-y-2">
          {distribuicao.map((item) => (
            <div key={item.socioId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.socioCor }}
                />
                <span className="text-sm text-gray-300">{item.socioNome}</span>
                <span className="text-xs text-gray-500">({item.percentual.toFixed(1)}%)</span>
              </div>
              <span className="font-mono text-emerald-400">
                R$ {item.valor.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/vendas/DistribuicaoPreview.tsx
git commit -m "feat: add DistribuicaoPreview component"
```

---

## Task 5: Update VendaForm with Pool Selection

**Files:**
- Modify: `components/VendaForm.tsx` (complete rewrite)

**Step 1: Read existing file first**

```bash
# File already read in exploration
```

**Step 2: Rewrite VendaForm with pool selection and preview**

```tsx
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
  distribuicaoPorSocio: Record<string, { nome: string; valor: number }>
}

export function VendaForm({ produtos, onSuccess }: VendaFormProps) {
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)

  const [form, setForm] = useState({
    produtoId: '',
    estoqueId: '',
    quantidade: '1',
    canal: 'ML',
    precoUnitario: '',
    dataVenda: new Date().toISOString().split('T')[0],
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
          dataVenda: new Date().toISOString().split('T')[0],
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
        socioCor: '#10B981', // Default color, ideally fetch from API
        percentual: 0, // Calculate if needed
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
              onSelect={(id) => setForm({ ...form, estoqueId: id })}
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
```

**Step 3: Commit**

```bash
git add components/VendaForm.tsx components/estoques/*.tsx components/vendas/*.tsx
git commit -m "feat: rewrite VendaForm with pool selection and distribution preview"
```

---

## Task 6: Create PagamentoSplit Component

**Files:**
- Create: `components/entradas/PagamentoSplit.tsx`

**Step 1: Create payment splitting component with simple/advanced modes**

```tsx
'use client'

import { useState, useEffect } from 'react'

interface Socio {
  id: string
  nome: string
  cor: string
}

interface Cota {
  socioId: string
  socioNome: string
  percentual: number
}

interface Pagamento {
  socioId: string
  percentual: number
  valor: number
}

interface PagamentoSplitProps {
  socios: Socio[]
  cotasAtuais?: Cota[]
  custoTotal: number
  value: Pagamento[]
  onChange: (pagamentos: Pagamento[]) => void
}

export function PagamentoSplit({
  socios,
  cotasAtuais,
  custoTotal,
  value,
  onChange,
}: PagamentoSplitProps) {
  const [modo, setModo] = useState<'simples' | 'avancado'>('simples')
  const [erro, setErro] = useState('')

  // Auto-calculate in simple mode based on quotas
  useEffect(() => {
    if (modo === 'simples' && cotasAtuais && cotasAtuais.length > 0) {
      const pagamentos = cotasAtuais.map((c) => ({
        socioId: c.socioId,
        percentual: c.percentual,
        valor: (custoTotal * c.percentual) / 100,
      }))
      onChange(pagamentos)
    }
  }, [modo, cotasAtuais, custoTotal])

  const handlePercentualChange = (socioId: string, novoPercentual: number) => {
    const novoValor = (custoTotal * novoPercentual) / 100

    const pagamentosAtualizados = value.map((p) =>
      p.socioId === socioId
        ? { ...p, percentual: novoPercentual, valor: novoValor }
        : p
    )

    onChange(pagamentosAtualizados)
  }

  const percentualTotal = value.reduce((sum, p) => sum + p.percentual, 0)

  useEffect(() => {
    if (Math.abs(percentualTotal - 100) > 0.01) {
      setErro(`Total deve ser 100%. Atual: ${percentualTotal.toFixed(1)}%`)
    } else {
      setErro('')
    }
  }, [percentualTotal])

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-400">
          Divisão do Pagamento
        </span>
        <div className="flex bg-black/30 rounded p-1">
          <button
            type="button"
            onClick={() => setModo('simples')}
            className={`px-3 py-1 text-xs rounded transition-all ${
              modo === 'simples'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Simples
          </button>
          <button
            type="button"
            onClick={() => setModo('avancado')}
            className={`px-3 py-1 text-xs rounded transition-all ${
              modo === 'avancado'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Avançado
          </button>
        </div>
      </div>

      {modo === 'simples' && (
        <p className="text-xs text-gray-500">
          Divisão automática baseada nas cotas atuais do estoque
        </p>
      )}

      <div className="space-y-2">
        {value.map((pagamento) => {
          const socio = socios.find((s) => s.id === pagamento.socioId)
          if (!socio) return null

          return (
            <div
              key={pagamento.socioId}
              className="flex items-center gap-3 glass-card p-3"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: socio.cor }}
              />
              <span className="flex-1 text-sm text-white">{socio.nome}</span>

              {modo === 'avancado' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={pagamento.percentual}
                    onChange={(e) =>
                      handlePercentualChange(
                        pagamento.socioId,
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="input-futuristic w-20 text-right text-sm"
                  />
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">
                  {pagamento.percentual.toFixed(1)}%
                </span>
              )}

              <span className="font-mono text-emerald-400 w-24 text-right">
                R$ {pagamento.valor.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>

      {erro && modo === 'avancado' && (
        <p className="text-xs text-red-400">{erro}</p>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-white/10">
        <span className="text-xs text-gray-500">Total:</span>
        <span
          className={`font-mono ${
            Math.abs(percentualTotal - 100) < 0.01
              ? 'text-emerald-400'
              : 'text-yellow-400'
          }`}
        >
          {percentualTotal.toFixed(1)}% (R${' '}
          {value.reduce((sum, p) => sum + p.valor, 0).toFixed(2)})
        </span>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/entradas/PagamentoSplit.tsx
git commit -m "feat: add PagamentoSplit with simple/advanced modes"
```

---

## Task 7: Create EntradaForm Component

**Files:**
- Create: `components/entradas/EntradaForm.tsx`

**Step 1: Create stock entry form**

```tsx
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
    // Fetch estoques and socios
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
```

**Step 2: Commit**

```bash
git add components/entradas/EntradaForm.tsx
git commit -m "feat: add EntradaForm with payment splitting"
```

---

## Task 8: Create SocioDashboard Component

**Files:**
- Create: `components/dashboard/SocioDashboard.tsx`

**Step 1: Create partner view dashboard**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { CotaVisualizer } from '../estoques/CotaVisualizer'

interface SocioData {
  socio: {
    id: string
    nome: string
    cor: string
    saldoDisponivel: number
    saldoPendente: number
    totalInvestido: number
    totalRecebido: number
    totalSacado: number
  }
  distribuicoes: {
    pendente: number
    liberado: number
    retido: number
  }
  dividas: {
    total: number
  }
  posicoes: {
    estoqueNome: string
    tipo: string
    produtoNome: string
    percentual: number
    valorInvestido: number
    cotas: {
      socioNome: string
      socioCor: string
      percentual: number
    }[]
  }[]
}

interface SocioDashboardProps {
  socioId: string
}

export function SocioDashboard({ socioId }: SocioDashboardProps) {
  const [data, setData] = useState<SocioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dashboard/por-socio?socioId=${socioId}`)
      .then((r) => r.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
  }, [socioId])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  const { socio, distribuicoes, dividas, posicoes } = data

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-emerald-500/30">
          <p className="text-xs text-gray-500 mb-1">Saldo Disponível</p>
          <p className="text-xl font-mono text-emerald-400">
            R$ {socio.saldoDisponivel.toFixed(2)}
          </p>
        </div>
        <div className="glass-card p-4 border-yellow-500/30">
          <p className="text-xs text-gray-500 mb-1">Saldo Pendente</p>
          <p className="text-xl font-mono text-yellow-400">
            R$ {socio.saldoPendente.toFixed(2)}
          </p>
        </div>
        <div className="glass-card p-4 border-blue-500/30">
          <p className="text-xs text-gray-500 mb-1">Total Investido</p>
          <p className="text-xl font-mono text-blue-400">
            R$ {socio.totalInvestido.toFixed(2)}
          </p>
        </div>
        <div className="glass-card p-4 border-purple-500/30">
          <p className="text-xs text-gray-500 mb-1">Lucro Recebido</p>
          <p className="text-xl font-mono text-purple-400">
            R$ {socio.totalRecebido.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-medium text-white">Minhas Posições</h3>
          {posicoes.length === 0 ? (
            <p className="text-gray-500 text-sm">Você não possui cotas em nenhum estoque.</p>
          ) : (
            posicoes.map((pos) => (
              <div key={pos.estoqueNome} className="glass-card p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        pos.tipo === 'INDIVIDUAL'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {pos.tipo === 'INDIVIDUAL' ? 'Individual' : 'Pool'}
                    </span>
                    <h4 className="font-medium text-white mt-1">{pos.estoqueNome}</h4>
                    <p className="text-xs text-gray-500">{pos.produtoNome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-emerald-400">
                      {pos.percentual.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      R$ {pos.valorInvestido.toFixed(2)}
                    </p>
                  </div>
                </div>
                <CotaVisualizer cotas={pos.cotas} showLegend={false} />
              </div>
            ))
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Resumo</h3>

          <div className="glass-card p-4">
            <h4 className="text-sm text-gray-400 mb-3">Distribuições</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-yellow-400">Pendente</span>
                <span className="font-mono">R$ {distribuicoes.pendente.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">Liberado</span>
                <span className="font-mono">R$ {distribuicoes.liberado.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">Retido</span>
                <span className="font-mono">R$ {distribuicoes.retido.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {dividas.total > 0 && (
            <div className="glass-card p-4 border-red-500/30">
              <h4 className="text-sm text-red-400 mb-2">⚠️ Dívidas Ativas</h4>
              <p className="text-xl font-mono text-red-400">
                R$ {dividas.total.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/dashboard/SocioDashboard.tsx
git commit -m "feat: add SocioDashboard component"
```

---

## Task 9: Create EmpresaDashboard Component

**Files:**
- Create: `components/dashboard/EmpresaDashboard.tsx`

**Step 1: Create company view dashboard**

```tsx
'use client'

import { useState, useEffect } from 'react'

interface DashboardData {
  geral: {
    estoquesAtivos: number
    sociosAtivos: number
    vendas: {
      totalVendas: number
      receitaTotal: number
      custoTotal: number
      lucroTotal: number
      porCanal: Record<string, { receita: number; lucro: number }>
    }
    entradas: {
      totalEntradas: number
      totalInvestido: number
    }
  }
  socios: {
    id: string
    nome: string
    cor: string
    saldoDisponivel: number
    saldoPendente: number
    totalInvestido: number
  }[]
  estoques: {
    id: string
    nome: string
    tipo: string
    produtoNome: string
    quantidadeDisponivel: number
    valorTotalInvestido: number
    cotas: {
      socioNome: string
      socioCor: string
      percentual: number
    }[]
  }[]
}

export function EmpresaDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/resumo')
      .then((r) => r.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  const { geral, socios, estoques } = data

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Estoques Ativos</p>
          <p className="text-2xl font-mono text-white">{geral.estoquesAtivos}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Sócios Ativos</p>
          <p className="text-2xl font-mono text-white">{geral.sociosAtivos}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Vendas (30d)</p>
          <p className="text-2xl font-mono text-emerald-400">
            {geral.vendas.totalVendas}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Lucro Total (30d)</p>
          <p className="text-2xl font-mono text-emerald-400">
            R$ {geral.vendas.lucroTotal.toFixed(0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partner Balances */}
        <div className="glass-card p-4">
          <h3 className="text-lg font-medium text-white mb-4">Saldos por Sócio</h3>
          <div className="space-y-3">
            {socios.map((socio) => (
              <div
                key={socio.id}
                className="flex items-center justify-between p-3 bg-black/20 rounded"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: socio.cor }}
                  />
                  <span className="text-white">{socio.nome}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-emerald-400">
                    R$ {socio.saldoDisponivel.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Pendente: R$ {socio.saldoPendente.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by Channel */}
        <div className="glass-card p-4">
          <h3 className="text-lg font-medium text-white mb-4">Vendas por Canal</h3>
          <div className="space-y-3">
            {Object.entries(geral.vendas.porCanal).map(([canal, dados]) => (
              <div
                key={canal}
                className="flex items-center justify-between p-3 bg-black/20 rounded"
              >
                <span className="text-gray-300">{canal}</span>
                <div className="text-right">
                  <p className="font-mono text-emerald-400">
                    R$ {dados.receita.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Lucro: R$ {dados.lucro.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Overview */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-medium text-white mb-4">Visão Geral dos Estoques</h3>
        <div className="overflow-x-auto">
          <table className="table-futuristic">
            <thead>
              <tr>
                <th>Estoque</th>
                <th>Tipo</th>
                <th>Produto</th>
                <th className="text-right">Quantidade</th>
                <th className="text-right">Valor Investido</th>
              </tr>
            </thead>
            <tbody>
              {estoques.map((e) => (
                <tr key={e.id}>
                  <td className="text-white">{e.nome}</td>
                  <td>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        e.tipo === 'INDIVIDUAL'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {e.tipo === 'INDIVIDUAL' ? 'Individual' : 'Pool'}
                    </span>
                  </td>
                  <td className="text-gray-400">{e.produtoNome}</td>
                  <td className="text-right font-mono text-emerald-400">
                    {e.quantidadeDisponivel}
                  </td>
                  <td className="text-right font-mono">
                    R$ {e.valorTotalInvestido.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/dashboard/EmpresaDashboard.tsx
git commit -m "feat: add EmpresaDashboard component"
```

---

## Task 10: Update Main Page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Read current page.tsx**

Already read in exploration phase.

**Step 2: Rewrite with new dashboard layout**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { ViewToggle } from '@/components/dashboard/ViewToggle'
import { SocioDashboard } from '@/components/dashboard/SocioDashboard'
import { EmpresaDashboard } from '@/components/dashboard/EmpresaDashboard'
import { VendaForm } from '@/components/VendaForm'
import { EntradaForm } from '@/components/entradas/EntradaForm'

interface Produto {
  id: string
  nome: string
}

interface Venda {
  id: string
  canal: string
  receitaTotal: number
  lucroTotal: number
  dataVenda: string
  itens: {
    estoqueNome: string
    produtoNome: string
    quantidade: number
    precoUnitario: number
  }[]
  distribuicoes: {
    socioNome: string
    valor: number
  }[]
}

export default function Home() {
  const [activeView, setActiveView] = useState<'dashboard' | 'venda' | 'entrada'>('dashboard')
  const [dashboardView, setDashboardView] = useState<'socio' | 'empresa'>('socio')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [showEntradaForm, setShowEntradaForm] = useState(false)
  const [currentSocioId, setCurrentSocioId] = useState('nato-id') // Default to first partner

  const fetchData = async () => {
    try {
      const [prodRes, vendRes, sociosRes] = await Promise.all([
        fetch('/api/produtos'),
        fetch('/api/vendas'),
        fetch('/api/socios'),
      ])
      const prodData = await prodRes.json()
      const vendData = await vendRes.json()
      const sociosData = await sociosRes.json()

      setProdutos(Array.isArray(prodData) ? prodData : [])
      setVendas(Array.isArray(vendData) ? vendData : [])

      // Set first active partner as default
      if (Array.isArray(sociosData) && sociosData.length > 0) {
        const activeSocio = sociosData.find((s: { ativo: boolean }) => s.ativo) || sociosData[0]
        setCurrentSocioId(activeSocio.id)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-400 font-mono">CARREGANDO...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Navigation Tabs */}
      <div className="glass-card">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${
              activeView === 'dashboard'
                ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveView('venda')}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${
              activeView === 'venda'
                ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            💰 Nova Venda
          </button>
          <button
            onClick={() => setActiveView('entrada')}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${
              activeView === 'entrada'
                ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📥 Entrada de Estoque
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          <ViewToggle activeView={dashboardView} onViewChange={setDashboardView} />

          {dashboardView === 'socio' ? (
            <SocioDashboard socioId={currentSocioId} />
          ) : (
            <EmpresaDashboard />
          )}
        </div>
      )}

      {/* Venda View */}
      {activeView === 'venda' && (
        <div className="glass-card p-6">
          <VendaForm produtos={produtos} onSuccess={fetchData} />
        </div>
      )}

      {/* Entrada View */}
      {activeView === 'entrada' && (
        <div className="flex items-center justify-center py-12">
          <button
            onClick={() => setShowEntradaForm(true)}
            className="btn-primary px-8 py-4 text-lg"
          >
            + Registrar Nova Entrada
          </button>
        </div>
      )}

      {/* Entrada Form Modal */}
      {showEntradaForm && (
        <EntradaForm
          onSuccess={fetchData}
          onClose={() => setShowEntradaForm(false)}
        />
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: update main page with new dashboard layout"
```

---

## Task 11: Create Directory Structure

**Files:**
- Create directories for organization

**Step 1: Create component directories**

```bash
mkdir -p components/dashboard components/estoques components/vendas components/entradas
```

**Step 2: Commit**

```bash
git add .
git commit -m "chore: create component directory structure"
```

---

## Verification

**Final build test:**

```bash
npm run build
```

Expected: Build succeeds with no errors.

---

## Summary

This plan implements:

1. **ViewToggle** - Tab switcher for partner/company views
2. **CotaVisualizer** - Visual quota representation
3. **EstoqueSelector** - Pool selection with smart defaults
4. **DistribuicaoPreview** - Profit distribution preview
5. **VendaForm** - Updated sale form with pool selection
6. **PagamentoSplit** - Payment splitting (simple/advanced)
7. **EntradaForm** - Stock entry form
8. **SocioDashboard** - Partner view dashboard
9. **EmpresaDashboard** - Company view dashboard
10. **page.tsx** - Main page integration

All components follow the existing glass-card UI theme with emerald accents.
