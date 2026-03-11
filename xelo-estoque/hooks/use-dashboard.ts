import { useQuery } from '@tanstack/react-query'

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  resumo: () => [...dashboardKeys.all, 'resumo'] as const,
  porSocio: (socioId: string) => [...dashboardKeys.all, 'por-socio', socioId] as const,
  socios: () => [...dashboardKeys.all, 'socios'] as const,
  produtos: () => [...dashboardKeys.all, 'produtos'] as const,
}

// Hook para resumo do dashboard (empresa)
export function useDashboardResumo() {
  return useQuery({
    queryKey: dashboardKeys.resumo(),
    queryFn: async () => {
      const response = await fetch('/api/dashboard/resumo')
      if (!response.ok) throw new Error('Erro ao carregar dashboard')
      return response.json()
    },
  })
}

// Hook para dashboard por sócio
export function useDashboardPorSocio(socioId: string) {
  return useQuery({
    queryKey: dashboardKeys.porSocio(socioId),
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/por-socio?socioId=${socioId}`)
      if (!response.ok) throw new Error('Erro ao carregar dados do sócio')
      return response.json()
    },
    enabled: !!socioId,
  })
}

// Hook para lista de sócios
export function useSocios() {
  return useQuery({
    queryKey: dashboardKeys.socios(),
    queryFn: async () => {
      const response = await fetch('/api/socios')
      if (!response.ok) throw new Error('Erro ao carregar sócios')
      return response.json()
    },
  })
}

// Hook para lista de produtos
export function useProdutos(ativo = true) {
  return useQuery({
    queryKey: dashboardKeys.produtos(),
    queryFn: async () => {
      const response = await fetch(`/api/produtos?ativo=${ativo}`)
      if (!response.ok) throw new Error('Erro ao carregar produtos')
      return response.json()
    },
  })
}
