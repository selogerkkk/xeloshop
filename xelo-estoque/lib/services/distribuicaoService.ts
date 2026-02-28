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
export async function obterResumoDistribuicoes(): Promise<{
  totalPendente: number
  totalLiberado: number
  totalRetido: number
  valorPendente: number
  valorLiberado: number
  valorRetido: number
}> {
  const [
    pendentes,
    liberadas,
    retidas,
  ] = await Promise.all([
    prisma.distribuicoes_lucro.findMany({ where: { status: 'PENDENTE' } }),
    prisma.distribuicoes_lucro.findMany({ where: { status: 'LIBERADO' } }),
    prisma.distribuicoes_lucro.findMany({ where: { status: 'RETIDO' } }),
  ])

  return {
    totalPendente: pendentes.length,
    totalLiberado: liberadas.length,
    totalRetido: retidas.length,
    valorPendente: pendentes.reduce((sum, d) => sum + Number(d.valor), 0),
    valorLiberado: liberadas.reduce((sum, d) => sum + Number(d.valor), 0),
    valorRetido: retidas.reduce((sum, d) => sum + Number(d.valor), 0),
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
