'use client'

interface Venda {
  id: string
  produto: {
    nome: string
    custo: string
  }
  quantidade: number
  canal: string
  precoReal: string
  vendidoEm: string
}

interface VendaListProps {
  vendas: Venda[]
}

const CANAL_LABELS: Record<string, string> = {
  'ML': 'Mercado Livre',
  'Facebook': 'Facebook',
  'Instagram': 'Instagram',
  'WhatsApp': 'WhatsApp',
  'Outro': 'Outro'
}

const CANAL_COLORS: Record<string, string> = {
  'ML': 'bg-yellow-100 text-yellow-800',
  'Facebook': 'bg-blue-100 text-blue-800',
  'Instagram': 'bg-pink-100 text-pink-800',
  'WhatsApp': 'bg-green-100 text-green-800',
  'Outro': 'bg-gray-100 text-gray-800'
}

export function VendaList({ vendas }: VendaListProps) {
  if (vendas.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma venda registrada ainda.
      </div>
    )
  }

  // Agrupa por canal
  const porCanal = vendas.reduce((acc, venda) => {
    const canal = venda.canal
    if (!acc[canal]) acc[canal] = { total: 0, valor: 0 }
    acc[canal].total += venda.quantidade
    acc[canal].valor += parseFloat(venda.precoReal) * venda.quantidade
    return acc
  }, {} as Record<string, { total: number, valor: number }>)

  return (
    <div className="space-y-6">
      {/* Resumo por Canal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(porCanal).map(([canal, dados]) => (
          <div key={canal} className="bg-white p-4 rounded-lg shadow border">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${CANAL_COLORS[canal] || CANAL_COLORS['Outro']}`}>
              {CANAL_LABELS[canal] || canal}
            </span>
            <p className="text-lg font-bold">{dados.total} vendas</p>
            <p className="text-sm text-gray-600">R$ {dados.valor.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Produto</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Canal</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Qtd</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Preço Unit.</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Lucro</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {vendas
              .sort((a, b) => new Date(b.vendidoEm).getTime() - new Date(a.vendidoEm).getTime())
              .map(venda => {
                const custo = parseFloat(venda.produto.custo)
                const preco = parseFloat(venda.precoReal)
                const lucro = (preco - custo) * venda.quantidade
                const total = preco * venda.quantidade
                const data = new Date(venda.vendidoEm).toLocaleDateString('pt-BR')
                
                return (
                  <tr key={venda.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{data}</td>
                    <td className="px-4 py-3 font-medium">{venda.produto.nome}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${CANAL_COLORS[venda.canal] || CANAL_COLORS['Outro']}`}>
                        {CANAL_LABELS[venda.canal] || venda.canal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{venda.quantidade}</td>
                    <td className="px-4 py-3 text-sm">R$ {preco.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium">R$ {total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {lucro.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
