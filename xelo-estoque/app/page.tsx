'use client'

import { useState, useEffect } from 'react'
import { ViewToggle } from '@/components/dashboard/ViewToggle'
import { SocioDashboard } from '@/components/dashboard/SocioDashboard'
import { EmpresaDashboard } from '@/components/dashboard/EmpresaDashboard'
import { VendaForm } from '@/components/VendaForm'
import { EntradaForm } from '@/components/entradas/EntradaForm'

interface Socio {
  id: string
  nome: string
  cor: string
}

interface Produto {
  id: string
  nome: string
}

type DashboardView = 'socio' | 'empresa'
type ActiveTab = 'dashboard' | 'nova-venda' | 'entrada-estoque'

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [dashboardView, setDashboardView] = useState<DashboardView>('empresa')
  const [selectedSocioId, setSelectedSocioId] = useState<string>('')
  const [socios, setSocios] = useState<Socio[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [sociosRes, produtosRes] = await Promise.all([
        fetch('/api/socios'),
        fetch('/api/produtos?ativo=true'),
      ])

      const sociosData = await sociosRes.json()
      const produtosData = await produtosRes.json()

      setSocios(Array.isArray(sociosData) ? sociosData : [])
      setProdutos(Array.isArray(produtosData) ? produtosData : [])

      // Seleciona primeiro sócio não-empresa por padrão
      if (sociosData.length > 0 && !selectedSocioId) {
        const primeiroSocio = sociosData.find((s: Socio) => s.nome !== 'Empresa') || sociosData[0]
        setSelectedSocioId(primeiroSocio.id)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleVendaSuccess = () => {
    fetchData()
    setActiveTab('dashboard')
  }

  const handleEntradaSuccess = () => {
    fetchData()
    setActiveTab('dashboard')
  }

  if (loading) {
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
                  {socios.map((socio) => (
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
