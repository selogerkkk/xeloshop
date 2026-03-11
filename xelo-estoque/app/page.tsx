import { Suspense } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { prisma } from '@/lib/prisma'
import type { Socio, Produto } from '@/types'

// Força renderização dinâmica (não tenta acessar DB durante build)
export const dynamic = 'force-dynamic'

// Server Component - carrega dados iniciais no servidor
export default async function Home() {
  // Busca dados iniciais no servidor (sem JavaScript no cliente)
  const [sociosData, produtosData] = await Promise.all([
    prisma.socios.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        cor: true,
        tipo: true,
        ativo: true,
        saldoDisponivel: true,
        saldoPendente: true,
        totalInvestido: true,
        totalRecebido: true,
        totalSacado: true,
      },
    }),
    prisma.produtos.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, ativo: true },
    }),
  ])

  // Converte Decimal para number
  const socios: Socio[] = sociosData.map((s) => ({
    ...s,
    saldoDisponivel: Number(s.saldoDisponivel),
    saldoPendente: Number(s.saldoPendente),
    totalInvestido: Number(s.totalInvestido),
    totalRecebido: Number(s.totalRecebido),
    totalSacado: Number(s.totalSacado),
  }))

  const produtos: Produto[] = produtosData

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-emerald-400 font-mono">CARREGANDO SISTEMA...</p>
          </div>
        </div>
      }
    >
      <DashboardShell initialSocios={socios} initialProdutos={produtos} />
    </Suspense>
  )
}
