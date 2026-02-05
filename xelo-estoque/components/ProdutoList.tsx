'use client'

interface Produto {
  id: string
  nome: string
  custo: string
  precoVenda: string
  quantidade: number
  criadoEm: string
  _count?: {
    vendas: number
  }
}

interface ProdutoListProps {
  produtos: Produto[]
  onUpdate: () => void
}

export function ProdutoList({ produtos, onUpdate }: ProdutoListProps) {
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return

    try {
      const response = await fetch(`/api/produtos/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        onUpdate()
      } else {
        alert('Erro ao excluir produto')
      }
    } catch (error) {
      alert('Erro ao excluir produto')
    }
  }

  if (produtos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhum produto encontrado.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white rounded-lg shadow border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Produto</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Custo</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Preço Venda</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Estoque</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Vendidos</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Lucro Est.</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {produtos.map(produto => {
            const custo = parseFloat(produto.custo)
            const preco = parseFloat(produto.precoVenda)
            const vendidos = produto._count?.vendas || 0
            const lucroUnitario = preco - custo
            
            return (
              <tr 
                key={produto.id} 
                className={produto.quantidade === 0 ? 'bg-red-50' : 'hover:bg-gray-50'}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{produto.nome}</div>
                  {produto.quantidade === 0 && (
                    <span className="text-xs text-red-600 font-medium">ESGOTADO</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">R$ {custo.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">R$ {preco.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${produto.quantidade === 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {produto.quantidade}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{vendidos}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={lucroUnitario >= 0 ? 'text-green-600' : 'text-red-600'}>
                    R$ {lucroUnitario.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(produto.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
