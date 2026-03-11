import { prisma } from '@/lib/prisma'
import type { StatusDistribuicao } from '@prisma/client'
import { liberarSaldoPendente } from './socioService'

export interface DistribuicaoDetalhada {
  id: string
  vendaId: string
  socioId: string
  socioNome: string
  socioCor: string
  percentualAplicado: number
  valor: number
  status: StatusDistribuicao
  dataDistribuicao: Date
}

/**
 * Lista todas as distribuições
 */
export async function listarDistribuicoes(
  filtros?: {
    socioId?: string
    status?: StatusDistribuicao
    vendaId?: string
  }
): Promise<DistribuicaoDetalhada[]> {
  const distribuicoes = await prisma.distribuicoes_lucro.findMany({
    where: {
      socioId: filtros?.socioId,
      status: filtros?.status,
      vendaId: filtros?.vendaId,
    },
    include: {
      socios: {
        select: {
          id: true,
          nome: true,
          cor: true,
        },
      },
    },
    orderBy: { dataDistribuicao: 'desc' },
  })

  return distribuicoes.map((d) => ({
    id: d.id,
    vendaId: d.vendaId,
    socioId: d.socioId,
    socioNome: d.socios.nome,
    socioCor: d.socios.cor,
    percentualAplicado: Number(d.percentualAplicado),
    valor: Number(d.valor),
    status: d.status,
    dataDistribuicao: d.dataDistribuicao,
  }))
}

/**
 * Libera uma distribuição pendente
 * Transfere o valor do saldoPendente para saldoDisponivel
 */
export async function liberarDistribuicao(id: string): Promise<void> {
  const distribuicao = await prisma.distribuicoes_lucro.findUnique({
    where: { id },
  })

  if (!distribuicao) {
    throw new Error('Distribuição não encontrada')
  }

  if (distribuicao.status !== 'PENDENTE') {
    throw new Error('Apenas distribuições pendentes podem ser liberadas')
  }

  await prisma.$transaction(async (tx) => {
    // Atualiza a distribuição
    await tx.distribuicoes_lucro.update({
      where: { id },
      data: { status: 'LIBERADO' },
    })

    // Atualiza saldos do sócio
    await tx.socios.update({
      where: { id: distribuicao.socioId },
      data: {
        saldoPendente: {
          decrement: Number(distribuicao.valor),
        },
        saldoDisponivel: {
          increment: Number(distribuicao.valor),
        },
        totalRecebido: {
          increment: Number(distribuicao.valor),
        },
      },
    })
  })
}

/**
 * Libera múltiplas distribuições de uma vez
 */
export async function liberarMultiplasDistribuicoes(
  ids: string[]
): Promise<{ liberadas: number; erro?: string }> {
  let liberadas = 0

  for (const id of ids) {
    try {
      await liberarDistribuicao(id)
      liberadas++
    } catch (error) {
      console.error(`Erro ao liberar distribuição ${id}:`, error)
    }
  }

  return {
    liberadas,
    erro: liberadas < ids.length ? 'Algumas distribuições não puderam ser liberadas' : undefined,
  }
}

/**
 * Obtém resumo de distribuições
 */
export async function obterResumoDistribuicoes(
  dataInicio?: Date,
  dataFim?: Date
): Promise<{
  totalPendente: number
  totalLiberado: number
  totalRetido: number
  valorPendente: number
  valorLiberado: number
  valorRetido: number
}> {
  const whereClause = {
    dataDistribuicao: {
      gte: dataInicio,
      lte: dataFim,
    },
  }

  const [
    pendentes,
    liberadas,
    retidas,
  ] = await Promise.all([
    prisma.distribuicoes_lucro.aggregate({
      where: { ...whereClause, status: 'PENDENTE' },
      _count: { id: true },
      _sum: { valor: true },
    }),
    prisma.distribuicoes_lucro.aggregate({
      where: { ...whereClause, status: 'LIBERADO' },
      _count: { id: true },
      _sum: { valor: true },
    }),
    prisma.distribuicoes_lucro.aggregate({
      where: { ...whereClause, status: 'RETIDO' },
      _count: { id: true },
      _sum: { valor: true },
    }),
  ])

  return {
    totalPendente: pendentes._count.id,
    totalLiberado: liberadas._count.id,
    totalRetido: retidas._count.id,
    valorPendente: Number(pendentes._sum.valor) || 0,
    valorLiberado: Number(liberadas._sum.valor) || 0,
    valorRetido: Number(retidas._sum.valor) || 0,
  }
}

/**
 * Obtém distribuições pendentes por sócio
 */
export async function obterDistribuicoesPendentesPorSocio(
  socioId: string
): Promise<DistribuicaoDetalhada[]> {
  return listarDistribuicoes({
    socioId,
    status: 'PENDENTE',
  })
}

/**
 * Retém uma distribuição (usado em cancelamentos)
 */
export async function reterDistribuicao(
  id: string,
  motivo?: string
): Promise<void> {
  const distribuicao = await prisma.distribuicoes_lucro.findUnique({
    where: { id },
  })

  if (!distribuicao) {
    throw new Error('Distribuição não encontrada')
  }

  if (distribuicao.status !== 'PENDENTE') {
    throw new Error('Apenas distribuições pendentes podem ser retidas')
  }

  await prisma.distribuicoes_lucro.update({
    where: { id },
    data: { status: 'RETIDO' },
  })
}
