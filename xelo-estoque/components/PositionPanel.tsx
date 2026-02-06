'use client'

import { ProdutoList } from './ProdutoList'

interface PositionPanelProps {
  produtos: any[]
  filtroStatus: string
  setFiltroStatus: (value: any) => void
  mostrarInativos: boolean
  setMostrarInativos: (value: boolean) => void
  onAddProduct: () => void
  onUpdate: () => void
}

export function PositionPanel({
  produtos,
  filtroStatus,
  setFiltroStatus,
  mostrarInativos,
  setMostrarInativos,
  onAddProduct,
  onUpdate
}: PositionPanelProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-400">Positions</h2>
            <p className="text-xs text-gray-500">
              {produtos.length} active positions
            </p>
          </div>
          <button
            onClick={onAddProduct}
            className="btn-primary text-sm px-4 py-2"
          >
            + Add Position
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Filter:</span>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="input-futuristic text-sm py-1.5 px-3"
            >
              <option value="todos">All</option>
              <option value="disponivel">In Stock</option>
              <option value="vendido">Sold Out</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarInativos}
              onChange={(e) => setMostrarInativos(e.target.checked)}
              className="rounded bg-black/50 border-emerald-900/30 text-emerald-500 focus:ring-emerald-500/30"
            />
            Show inactive
          </label>
        </div>
      </div>

      {/* Positions List */}
      <div className="glass-card p-0 overflow-hidden">
        {produtos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400 text-sm">No positions found</p>
            <p className="text-gray-600 text-xs mt-1">
              Click "Add Position" to get started
            </p>
          </div>
        ) : (
          <ProdutoList produtos={produtos} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  )
}
