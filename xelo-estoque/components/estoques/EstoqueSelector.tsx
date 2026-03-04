'use client'

import { useState, useEffect, useRef } from 'react'
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
  const onSelectRef = useRef(onSelect)

  // Atualiza a ref quando onSelect muda
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // Efeito 1: Busca estoques quando produto ou quantidade mudam
  useEffect(() => {
    if (!produtoId) {
      setEstoques([])
      return
    }

    setLoading(true)
    fetch(`/api/estoques/disponiveis?produtoId=${produtoId}&quantidadeMinima=${quantidadeDesejada}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Erro ao buscar estoques: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error('Resposta inválida da API')
        }
        setEstoques(data)
      })
      .catch(() => {
        setEstoques([])
      })
      .finally(() => setLoading(false))
  }, [produtoId, quantidadeDesejada])

  // Efeito 2: Auto-seleção quando estoques carregam ou selectedId muda
  useEffect(() => {
    // Auto-select oldest (first in list) se nenhum estiver selecionado
    if (estoques.length > 0 && !selectedId) {
      onSelectRef.current(estoques[0].id)
    }
  }, [estoques, selectedId])

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
