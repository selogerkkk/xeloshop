'use client'

import { useState, useEffect, useRef } from 'react'

interface Socio {
  id: string
  nome: string
  cor: string
}

interface Cota {
  socioId: string
  socioNome?: string
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

  // Use a ref to store onChange to avoid infinite loops
  // when the parent doesn't memoize the callback
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Auto-calculate in simple mode based on quotas
  useEffect(() => {
    if (modo === 'simples' && cotasAtuais && cotasAtuais.length > 0) {
      const pagamentos = cotasAtuais.map((c) => ({
        socioId: c.socioId,
        percentual: c.percentual,
        valor: (custoTotal * c.percentual) / 100,
      }))
      onChangeRef.current(pagamentos)
    }
  }, [modo, cotasAtuais, custoTotal])

  // Initialize payments based on socios when no quotas exist (new stock)
  useEffect(() => {
    if (modo === 'simples' && (!cotasAtuais || cotasAtuais.length === 0) && socios.length > 0 && value.length === 0) {
      const percentualIgual = 100 / socios.length
      const pagamentos = socios.map((s) => ({
        socioId: s.id,
        percentual: percentualIgual,
        valor: (custoTotal * percentualIgual) / 100,
      }))
      onChangeRef.current(pagamentos)
    }
  }, [modo, cotasAtuais, socios, custoTotal, value.length])

  // Update payment values when custoTotal changes (preserving percentuais)
  useEffect(() => {
    if (modo === 'simples' && value.length > 0 && (!cotasAtuais || cotasAtuais.length === 0)) {
      const pagamentosAtualizados = value.map((p) => ({
        ...p,
        valor: (custoTotal * p.percentual) / 100,
      }))
      onChangeRef.current(pagamentosAtualizados)
    }
  }, [custoTotal, modo, cotasAtuais, value])

  const handlePercentualChange = (socioId: string, novoPercentual: number) => {
    // Clamp value between 0 and 100
    const clampedPercentual = Math.max(0, Math.min(100, novoPercentual))
    const novoValor = (custoTotal * clampedPercentual) / 100

    const pagamentosAtualizados = value.map((p) =>
      p.socioId === socioId
        ? { ...p, percentual: clampedPercentual, valor: novoValor }
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
            aria-pressed={modo === 'simples'}
            aria-label="Modo de divisão simples"
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
            aria-pressed={modo === 'avancado'}
            aria-label="Modo de divisão avançado"
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
