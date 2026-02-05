'use client'

interface Produto {
  id: string
  nome: string
  linkProduto: string | null
  custo: string
  precoVenda: string
  quantidade: number
  ativo: boolean
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
    if (!confirm('Tem certeza que deseja excluir este produto PERMANENTEMENTE?')) return

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

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const response = await fetch(`/api/produtos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo })
      })
      if (response.ok) {
        onUpdate()
      } else {
        alert('Erro ao atualizar produto')
      }
    } catch (error) {
      alert('Erro ao atualizar produto')
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
                className={`
                  ${produto.quantidade === 0 ? 'bg-red-50' : 'hover:bg-gray-50'}
                  ${!produto.ativo ? 'opacity-60 bg-gray-100' : ''}
                `}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {produto.nome}
                    {produto.linkProduto && (
                      <a 
                        href={produto.linkProduto} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-500 hover:text-blue-700"
                        title="Ver no site"
                      >
                        🔗
                      </a>
                    )}
                  </div>
                  {produto.quantidade === 0 && produto.ativo && (
                    <span className="text-xs text-red-600 font-medium">ESGOTADO</span>
                  )}
                  {!produto.ativo && (
                    <span className="text-xs text-gray-500 font-medium">INATIVO</span>
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
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => handleToggleAtivo(produto.id, !produto.ativo)}
                    className={`text-sm ${produto.ativo ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
                  >
                    {produto.ativo ? 'Inativar' : 'Reativar'}
                  </button>
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
