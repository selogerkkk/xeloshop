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
