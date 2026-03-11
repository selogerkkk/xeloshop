'use client'

import { useState, useEffect } from 'react'
import { ViewToggle } from './ViewToggle'
import { EmpresaDashboard } from './EmpresaDashboard'
import { SocioDashboard } from './SocioDashboard'
import { VendaForm } from '../VendaForm'
import { EntradaForm } from '../entradas/EntradaForm'
import { useSocios, useProdutos } from '@/hooks/use-dashboard'
import { usePrefetchOnMount, usePrefetchOnHover } from '@/hooks/use-prefetch'
import { queryClient } from '@/lib/query-client'
import type { Socio, Produto } from '@/types'

type DashboardView = 'socio' | 'empresa'
type ActiveTab = 'dashboard' | 'nova-venda' | 'entrada-estoque'

interface DashboardShellProps {
  initialSocios: Socio[]
  initialProdutos: Produto[]
}

export function DashboardShell({ initialSocios, initialProdutos }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [dashboardView, setDashboardView] = useState<DashboardView>('empresa')
  const [selectedSocioId, setSelectedSocioId] = useState<string>('')

  const { data: socios = initialSocios } = useSocios()
  const { data: produtos = initialProdutos } = useProdutos()

  // Prefetch em background após carregar
  usePrefetchOnMount(selectedSocioId)

  // Prefetch on hover
  const { prefetchDashboard, prefetchVenda, prefetchEntrada } = usePrefetchOnHover()

  // Seleciona primeiro sócio não-empresa por padrão
  if (socios.length > 0 && !selectedSocioId) {
    const primeiroSocio = socios.find((s: Socio) => s.nome !== 'Empresa') || socios[0]
    if (primeiroSocio) {
      setSelectedSocioId(primeiroSocio.id)
    }
  }

  const handleVendaSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    setActiveTab('dashboard')
  }

  const handleEntradaSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    setActiveTab('dashboard')
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Main Navigation */}
      <div className="glass-card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-2">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              onMouseEnter={prefetchDashboard}
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
              onMouseEnter={prefetchVenda}
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
              onMouseEnter={prefetchEntrada}
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
                  {socios.map((socio: Socio) => (
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
