'use client'

import { useState } from 'react'
import { ViewToggle } from '@/components/dashboard/ViewToggle'
import { SocioDashboard } from '@/components/dashboard/SocioDashboard'
import { EmpresaDashboard } from '@/components/dashboard/EmpresaDashboard'
import { VendaForm } from '@/components/VendaForm'
import { EntradaForm } from '@/components/entradas/EntradaForm'
import { useSocios, useProdutos } from '@/hooks/use-dashboard'
import { queryClient } from '@/lib/query-client'

type DashboardView = 'socio' | 'empresa'
type ActiveTab = 'dashboard' | 'nova-venda' | 'entrada-estoque'

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [dashboardView, setDashboardView] = useState<DashboardView>('empresa')
  const [selectedSocioId, setSelectedSocioId] = useState<string>('')

  const { data: socios = [], isLoading: loadingSocios } = useSocios()
  const { data: produtos = [], isLoading: loadingProdutos } = useProdutos()

  // Seleciona primeiro sócio não-empresa por padrão
  if (socios.length > 0 && !selectedSocioId) {
    const primeiroSocio = socios.find((s: any) => s.nome !== 'Empresa') || socios[0]
    if (primeiroSocio) {
      setSelectedSocioId(primeiroSocio.id)
    }
  }

  const handleVendaSuccess = () => {
    // Invalida o cache para recarregar dados
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    setActiveTab('dashboard')
  }

  const handleEntradaSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    setActiveTab('dashboard')
  }

  const isLoading = loadingSocios || loadingProdutos

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-400 font-mono">CARREGANDO SISTEMA...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Main Navigation */}
      <div className="glass-card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-2">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all rounded ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('nova-venda')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all rounded ${
                activeTab === 'nova-venda'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Nova Venda
            </button>
            <button
              onClick={() => setActiveTab('entrada-estoque')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all rounded ${
                activeTab === 'entrada-estoque'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Entrada de Estoque
            </button>
          </div>

          {activeTab === 'dashboard' && (
            <ViewToggle
              activeView={dashboardView}
              onViewChange={setDashboardView}
            />
          )}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {dashboardView === 'empresa' ? (
            <EmpresaDashboard />
          ) : (
            <div className="space-y-4">
              {/* Sócio Selector */}
              <div className="glass-card p-4">
                <label className="text-xs uppercase tracking-wider text-gray-400 block mb-2">
                  Visualizando como:
                </label>
                <div className="flex flex-wrap gap-2">
                  {socios.map((socio: any) => (
                    <button
                      key={socio.id}
                      onClick={() => setSelectedSocioId(socio.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded transition-all ${
                        selectedSocioId === socio.id
                          ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                          : 'bg-black/30 text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: socio.cor }}
                      />
                      <span className="text-sm font-medium">{socio.nome}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedSocioId && <SocioDashboard socioId={selectedSocioId} />}
            </div>
          )}
        </div>
      )}

      {/* Nova Venda Tab */}
      {activeTab === 'nova-venda' && (
        <div className="max-w-6xl mx-auto">
          <VendaForm
            produtos={produtos}
            onSuccess={handleVendaSuccess}
          />
        </div>
      )}

      {/* Entrada de Estoque Tab */}
      {activeTab === 'entrada-estoque' && (
        <EntradaForm
          onSuccess={handleEntradaSuccess}
          onClose={() => setActiveTab('dashboard')}
        />
      )}
    </div>
  )
}
