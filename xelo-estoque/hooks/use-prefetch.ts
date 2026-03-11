'use client'

import { useEffect, useCallback } from 'react'
import { queryClient } from '@/lib/query-client'
import { dashboardKeys } from './use-dashboard'

// Prefetch dashboard resumo (empresa)
async function prefetchDashboardResumo() {
  await queryClient.prefetchQuery({
    queryKey: dashboardKeys.resumo(),
    queryFn: async () => {
      const response = await fetch('/api/dashboard/resumo')
      if (!response.ok) throw new Error('Erro ao carregar dashboard')
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// Prefetch dashboard por sócio
async function prefetchDashboardPorSocio(socioId: string) {
  if (!socioId) return

  await queryClient.prefetchQuery({
    queryKey: dashboardKeys.porSocio(socioId),
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/por-socio?socioId=${socioId}`)
      if (!response.ok) throw new Error('Erro ao carregar dados do sócio')
      return response.json()
    },
    staleTime: 1000 * 60 * 5,
  })
}

// Prefetch produtos
async function prefetchProdutos() {
  await queryClient.prefetchQuery({
    queryKey: dashboardKeys.produtos(),
    queryFn: async () => {
      const response = await fetch('/api/produtos?ativo=true')
      if (!response.ok) throw new Error('Erro ao carregar produtos')
      return response.json()
    },
    staleTime: 1000 * 60 * 5,
  })
}

// Hook para prefetch em background após carregar
export function usePrefetchOnMount(socioId?: string) {
  useEffect(() => {
    // Aguarda 1 segundo após montar para não competir com o carregamento inicial
    const timer = setTimeout(() => {
      console.log('🔄 Prefetch em background iniciado...')

      // Prefetch em paralelo com prioridade
      Promise.all([
        // Prioridade 1: Dashboard resumo (já deve estar carregado, mas garante)
        prefetchDashboardResumo(),

        // Prioridade 2: Produtos (usado em Nova Venda e Entrada)
        prefetchProdutos(),

        // Prioridade 3: Dashboard do sócio selecionado
        socioId ? prefetchDashboardPorSocio(socioId) : Promise.resolve(),
      ]).then(() => {
        console.log('✅ Prefetch em background concluído')
      }).catch((err) => {
        console.error('❌ Erro no prefetch:', err)
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [socioId])
}

// Hook para prefetch on hover (quando passa o mouse)
export function usePrefetchOnHover() {
  const prefetchDashboard = useCallback(() => {
    prefetchDashboardResumo()
  }, [])

  const prefetchVenda = useCallback(() => {
    prefetchProdutos()
  }, [])

  const prefetchEntrada = useCallback(() => {
    prefetchProdutos()
  }, [])

  return { prefetchDashboard, prefetchVenda, prefetchEntrada }
}

// Hook para prefetch manual (pode ser chamado a qualquer momento)
export function usePrefetchManual() {
  const prefetchAll = useCallback(async (socioId?: string) => {
    console.log('🔄 Prefetch manual iniciado...')
    await Promise.all([
      prefetchDashboardResumo(),
      prefetchProdutos(),
      socioId ? prefetchDashboardPorSocio(socioId) : Promise.resolve(),
    ])
    console.log('✅ Prefetch manual concluído')
  }, [])

  return { prefetchAll }
}
