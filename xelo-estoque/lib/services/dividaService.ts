import { prisma } from '@/lib/prisma'
import type { StatusDivida, DividaAjuste } from '@prisma/client'

export interface DividaDetalhada extends DividaAjuste {
  socio: {
    id: string
    nome: string
    cor: string
  }
}

/**
 * Lista todas as dívidas de ajuste
 */
export async function listarDividas(
  filtros?: {
    socioId?: string
    status?: StatusDivida
  }
): Promise<DividaDetalhada[]> {
  return prisma.dividaAjuste.findMany({
    where: {
      socioId: filtros?.socioId,
      status: filtros?.status,
    },
    include: {
      socio: {
        select: {
          id: true,
          nome: true,
          cor: true,
        },
      },
    },
    orderBy: { dataCriacao: 'desc' },
  })
}

/**
 * Busca uma dívida por ID
 */
export async function buscarDividaPorId(id: string): Promise<DividaDetalhada | null> {
  return prisma.dividaAjuste.findUnique({
    where: { id },
    include: {
      socio: {
        select: {
          id: true,
          nome: true,
          cor: true,
        },
      },
    },
  })
}

/**
 * Cria uma nova dívida de ajuste
 */
export async function criarDivida(
  socioId: string,
  valor: number,
  motivo: string,
  referenciaId?: string
): Promise<DividaAjuste> {
  if (valor <= 0) {
    throw new Error('Valor deve ser maior que zero')
  }

  const socio = await prisma.socio.findUnique({
    where: { id: socioId },
  })

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  return prisma.dividaAjuste.create({
    data: {
      socioId,
      valorOriginal: valor,
      valorPendente: valor,
      motivo,
      referenciaId,
      status: 'ATIVA',
    },
  })
}

/**
 * Quitar parcialmente uma dívida
 */
export async function quitarParcialmenteDivida(
  id: string,
  valor: number
): Promise<DividaAjuste> {
  if (valor <= 0) {
    throw new Error('Valor deve ser maior que zero')
  }

  const divida = await prisma.dividaAjuste.findUnique({
    where: { id },
  })

  if (!divida) {
    throw new Error('Dívida não encontrada')
  }

  if (divida.status !== 'ATIVA') {
    throw new Error('Apenas dívidas ativas podem ser quitadas')
  }

  if (Number(divida.valorPendente) < valor) {
    throw new Error('Valor de quitação maior que o valor pendente')
  }

  const novoValorPendente = Number(divida.valorPendente) - valor
  const status: StatusDivida = novoValorPendente === 0 ? 'QUITADA' : 'ATIVA'

  return prisma.dividaAjuste.update({
    where: { id },
    data: {
      valorPendente: novoValorPendente,
      status,
      dataQuitacao: status === 'QUITADA' ? new Date() : undefined,
    },
  })
}

/**
 * Quitar uma dívida completamente
 */
export async function quitarDivida(id: string): Promise<DividaAjuste> {
  const divida = await prisma.dividaAjuste.findUnique({
    where: { id },
  })

  if (!divida) {
    throw new Error('Dívida não encontrada')
  }

  if (divida.status !== 'ATIVA') {
    throw new Error('Apenas dívidas ativas podem ser quitadas')
  }

  return prisma.dividaAjuste.update({
    where: { id },
    data: {
      valorPendente: 0,
      status: 'QUITADA',
      dataQuitacao: new Date(),
    },
  })
}

/**
 * Compensa dívidas com saldo disponível do sócio
 * Retorna o valor compensado
 */
export async function compensarDividasComSaldo(
  socioId: string
): Promise<{ compensado: number; dividasQuitadas: string[] }> {
  const [socio, dividasAtivas] = await Promise.all([
    prisma.socio.findUnique({ where: { id: socioId } }),
    prisma.dividaAjuste.findMany({
      where: { socioId, status: 'ATIVA' },
      orderBy: { dataCriacao: 'asc' },
    }),
  ])

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  let saldoDisponivel = Number(socio.saldoDisponivel)
  let totalCompensado = 0
  const dividasQuitadas: string[] = []

  for (const divida of dividasAtivas) {
    if (saldoDisponivel <= 0) break

    const valorDivida = Number(divida.valorPendente)
    const valorCompensacao = Math.min(valorDivida, saldoDisponivel)

    await prisma.$transaction(async (tx) => {
      // Atualiza saldo do sócio
      await tx.socio.update({
        where: { id: socioId },
        data: {
          saldoDisponivel: {
            decrement: valorCompensacao,
          },
        },
      })

      // Atualiza ou quita a dívida
      const novoValorPendente = valorDivida - valorCompensacao
      await tx.dividaAjuste.update({
        where: { id: divida.id },
        data: {
          valorPendente: novoValorPendente,
          status: novoValorPendente === 0 ? 'QUITADA' : 'ATIVA',
          dataQuitacao: novoValorPendente === 0 ? new Date() : undefined,
        },
      })
    })

    saldoDisponivel -= valorCompensacao
    totalCompensado += valorCompensacao

    if (valorCompensacao === valorDivida) {
      dividasQuitadas.push(divida.id)
    }
  }

  return {
    compensado: totalCompensado,
    dividasQuitadas,
  }
}

/**
 * Obtém resumo de dívidas
 */
export async function obterResumoDividas(): Promise<{
  totalAtivas: number
  totalQuitadas: number
  valorTotalAtivo: number
  valorTotalQuitado: number
}> {
  const [ativas, quitadas] = await Promise.all([
    prisma.dividaAjuste.findMany({ where: { status: 'ATIVA' } }),
    prisma.dividaAjuste.findMany({ where: { status: 'QUITADA' } }),
  ])

  return {
    totalAtivas: ativas.length,
    totalQuitadas: quitadas.length,
    valorTotalAtivo: ativas.reduce((sum, d) => sum + Number(d.valorPendente), 0),
    valorTotalQuitado: quitadas.reduce(
      (sum, d) => sum + Number(d.valorOriginal),
      0
    ),
  }
}

/**
 * Obtém dívidas por sócio
 */
export async function obterDividasPorSocio(
  socioId: string,
  status?: StatusDivida
): Promise<DividaDetalhada[]> {
  return listarDividas({ socioId, status })
}
