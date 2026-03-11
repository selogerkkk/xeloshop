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
