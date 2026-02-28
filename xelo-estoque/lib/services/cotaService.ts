import { prisma } from '@/lib/prisma'
import type { Cota } from '@prisma/client'

export interface CreateCotaInput {
  estoqueId: string
  socioId: string
  percentual: number
  valorInvestido: number
}

export interface UpdateCotaInput {
  percentual?: number
  valorInvestido?: number
}

/**
 * Lista todas as cotas de um estoque
 */
export async function listarCotasDoEstoque(
  estoqueId: string
): Promise<Cota[]> {
  return prisma.cota.findMany({
    where: { estoqueId },
    include: {
      socio: {
        select: {
          id: true,
          nome: true,
          cor: true,
        },
      },
    },
    orderBy: { percentual: 'desc' },
  })
}

/**
 * Busca uma cota específica
 */
export async function buscarCota(
  estoqueId: string,
  socioId: string
): Promise<Cota | null> {
  return prisma.cota.findUnique({
    where: {
      estoqueId_socioId: {
        estoqueId,
        socioId,
      },
    },
  })
}

/**
 * Cria ou atualiza uma cota
 */
export async function criarOuAtualizarCota(
  input: CreateCotaInput
): Promise<Cota> {
  return prisma.cota.upsert({
    where: {
      estoqueId_socioId: {
        estoqueId: input.estoqueId,
        socioId: input.socioId,
      },
    },
    update: {
      percentual: input.percentual,
      valorInvestido: input.valorInvestido,
    },
    create: {
      estoqueId: input.estoqueId,
      socioId: input.socioId,
      percentual: input.percentual,
      valorInvestido: input.valorInvestido,
    },
  })
}

/**
 * Remove uma cota
 */
export async function removerCota(
  estoqueId: string,
  socioId: string
): Promise<void> {
  await prisma.cota.delete({
    where: {
      estoqueId_socioId: {
        estoqueId,
        socioId,
      },
    },
  })
}

/**
 * Remove todas as cotas de um estoque
 */
export async function removerTodasCotas(estoqueId: string): Promise<void> {
  await prisma.cota.deleteMany({
    where: { estoqueId },
  })
}

/**
 * Calcula o total percentual alocado em um estoque
 */
export async function calcularPercentualTotal(
  estoqueId: string
): Promise<number> {
  const result = await prisma.cota.aggregate({
    where: { estoqueId },
    _sum: {
      percentual: true,
    },
  })

  return Number(result._sum.percentual ?? 0)
}

/**
 * Verifica se o percentual total não excede 100%
 * Usado ao adicionar/atualizar cotas
 */
export async function validarPercentual(
  estoqueId: string,
  novoPercentual: number,
  excluirCotaId?: string
): Promise<{ valido: boolean; restante: number }> {
  const cotas = await prisma.cota.findMany({
    where: {
      estoqueId,
      socioId: excluirCotaId ? { not: excluirCotaId } : undefined,
    },
  })

  const totalAtual = cotas.reduce(
    (sum, c) => sum + Number(c.percentual),
    0
  )

  const totalComNova = totalAtual + novoPercentual
  const restante = 100 - totalAtual

  return {
    valido: totalComNova <= 100,
    restante,
  }
}

/**
 * Cria múltiplas cotas em uma transação
 * Usado ao criar um pool com distribuição definida
 */
export async function criarCotasEmLote(
  cotas: CreateCotaInput[]
): Promise<Cota[]> {
  const percentualTotal = cotas.reduce((sum, c) => sum + c.percentual, 0)

  if (percentualTotal !== 100) {
    throw new Error(`Total percentual deve ser 100%, atual: ${percentualTotal}%`)
  }

  const estoqueId = cotas[0]?.estoqueId
  if (!estoqueId) {
    throw new Error('EstoqueId é obrigatório')
  }

  const todosMesmoEstoque = cotas.every((c) => c.estoqueId === estoqueId)
  if (!todosMesmoEstoque) {
    throw new Error('Todas as cotas devem ser do mesmo estoque')
  }

  return prisma.$transaction(
    cotas.map((c) =>
      prisma.cota.create({
        data: {
          estoqueId: c.estoqueId,
          socioId: c.socioId,
          percentual: c.percentual,
          valorInvestido: c.valorInvestido,
        },
      })
    )
  )
}

/**
 * Atualiza cotas baseado nos pagamentos de uma entrada
 * Recalcula percentuais proporcionalmente aos valores investidos
 */
export async function recalcularCotasAposEntrada(
  estoqueId: string,
  valorInvestido: number,
  pagamentos: { socioId: string; valor: number }[]
): Promise<void> {
  const estoque = await prisma.estoque.findUnique({
    where: { id: estoqueId },
    include: { cotas: true },
  })

  if (!estoque) {
    throw new Error('Estoque não encontrado')
  }

  const valorTotalAnterior = Number(estoque.valorTotalInvestido) - valorInvestido

  // Se não há cotas existentes, cria novas baseadas nos pagamentos
  if (estoque.cotas.length === 0) {
    const percentuais = calcularPercentuaisDosPagamentos(pagamentos)
    await prisma.$transaction(
      percentuais.map((p) =>
        prisma.cota.create({
          data: {
            estoqueId,
            socioId: p.socioId,
            percentual: p.percentual,
            valorInvestido: p.valor,
          },
        })
      )
    )
    return
  }

  // Se há cotas, atualiza os valores investidos e recalcula percentuais
  const cotasAtualizadas = estoque.cotas.map((cota) => {
    const pagamento = pagamentos.find((p) => p.socioId === cota.socioId)
    const valorAdicional = pagamento?.valor ?? 0
    const valorTotal = Number(cota.valorInvestido) + valorAdicional
    return {
      socioId: cota.socioId,
      valorInvestido: valorTotal,
    }
  })

  // Adiciona novos sócios que não tinham cotas
  for (const pagamento of pagamentos) {
    const existe = cotasAtualizadas.some(
      (c) => c.socioId === pagamento.socioId
    )
    if (!existe) {
      cotasAtualizadas.push({
        socioId: pagamento.socioId,
        valorInvestido: pagamento.valor,
      })
    }
  }

  // Calcula novos percentuais
  const valorTotalGeral = cotasAtualizadas.reduce(
    (sum, c) => sum + c.valorInvestido,
    0
  )

  await prisma.$transaction(
    cotasAtualizadas.map((c) => {
      const percentual =
        valorTotalGeral > 0 ? (c.valorInvestido / valorTotalGeral) * 100 : 0
      return prisma.cota.upsert({
        where: {
          estoqueId_socioId: {
            estoqueId,
            socioId: c.socioId,
          },
        },
        update: {
          valorInvestido: c.valorInvestido,
          percentual,
        },
        create: {
          estoqueId,
          socioId: c.socioId,
          valorInvestido: c.valorInvestido,
          percentual,
        },
      })
    })
  )
}

/**
 * Calcula percentuais baseados nos valores de pagamento
 */
export function calcularPercentuaisDosPagamentos(
  pagamentos: { socioId: string; valor: number }[]
): { socioId: string; percentual: number; valor: number }[] {
  const valorTotal = pagamentos.reduce((sum, p) => sum + p.valor, 0)

  if (valorTotal === 0) {
    return pagamentos.map((p) => ({
      socioId: p.socioId,
      percentual: 100 / pagamentos.length,
      valor: p.valor,
    }))
  }

  return pagamentos.map((p) => ({
    socioId: p.socioId,
    percentual: (p.valor / valorTotal) * 100,
    valor: p.valor,
  }))
}

/**
 * Distribui lucro proporcionalmente às cotas do estoque
 */
export async function calcularDistribuicaoDoLucro(
  estoqueId: string,
  lucroTotal: number
): Promise<{ socioId: string; percentual: number; valor: number }[]> {
  const cotas = await prisma.cota.findMany({
    where: { estoqueId },
  })

  if (cotas.length === 0) {
    throw new Error('Estoque não possui cotas definidas')
  }

  return cotas.map((c) => ({
    socioId: c.socioId,
    percentual: Number(c.percentual),
    valor: Number((lucroTotal * Number(c.percentual)) / 100),
  }))
}
