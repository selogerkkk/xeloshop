import { prisma } from '@/lib/prisma'
import type { TipoEntrada, Entrada } from '@prisma/client'
import { atualizarAposEntrada } from './estoqueService'
import { recalcularCotasAposEntrada, calcularPercentuaisDosPagamentos } from './cotaService'
import { adicionarInvestimento } from './socioService'

export interface PagamentoInput {
  socioId: string
  percentual: number
  valor: number
}

export interface CreateEntradaInput {
  estoqueId: string
  tipo: TipoEntrada
  quantidade: number
  custoUnitario: number
  fornecedor?: string
  dataEntrada?: Date
  pagamentos: PagamentoInput[]
}

export interface EntradaDetalhada extends Entrada {
  estoque: {
    id: string
    nome: string
    produto: {
      id: string
      nome: string
    }
  }
  pagamentos: {
    id: string
    socioId: string
    socioNome: string
    percentual: number
    valor: number
  }[]
}

/**
 * Lista todas as entradas
 */
export async function listarEntradas(
  filtros?: {
    estoqueId?: string
    tipo?: TipoEntrada
    dataInicio?: Date
    dataFim?: Date
  }
): Promise<EntradaDetalhada[]> {
  const entradas = await prisma.entrada.findMany({
    where: {
      estoqueId: filtros?.estoqueId,
      tipo: filtros?.tipo,
      dataEntrada: {
        gte: filtros?.dataInicio,
        lte: filtros?.dataFim,
      },
    },
    include: {
      estoque: {
        include: {
          produto: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
      pagamentos: {
        include: {
          socio: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
    },
    orderBy: { dataEntrada: 'desc' },
  })

  return entradas.map((e) => ({
    ...e,
    pagamentos: e.pagamentos.map((p) => ({
      id: p.id,
      socioId: p.socioId,
      socioNome: p.socio.nome,
      percentual: Number(p.percentual),
      valor: Number(p.valor),
    })),
  }))
}

/**
 * Busca uma entrada por ID
 */
export async function buscarEntradaPorId(
  id: string
): Promise<EntradaDetalhada | null> {
  const entrada = await prisma.entrada.findUnique({
    where: { id },
    include: {
      estoque: {
        include: {
          produto: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
      pagamentos: {
        include: {
          socio: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
    },
  })

  if (!entrada) return null

  return {
    ...entrada,
    pagamentos: entrada.pagamentos.map((p) => ({
      id: p.id,
      socioId: p.socioId,
      socioNome: p.socio.nome,
      percentual: Number(p.percentual),
      valor: Number(p.valor),
    })),
  }
}

/**
 * Valida os pagamentos de uma entrada
 */
function validarPagamentos(
  pagamentos: PagamentoInput[],
  custoTotal: number
): void {
  if (!pagamentos || pagamentos.length === 0) {
    throw new Error('É necessário informar pelo menos um pagamento')
  }

  const percentualTotal = pagamentos.reduce(
    (sum, p) => sum + p.percentual,
    0
  )

  if (Math.abs(percentualTotal - 100) > 0.01) {
    throw new Error(
      `Soma dos percentuais deve ser 100%, atual: ${percentualTotal.toFixed(2)}%`
    )
  }

  const valorTotal = pagamentos.reduce((sum, p) => sum + p.valor, 0)

  if (Math.abs(valorTotal - custoTotal) > 0.01) {
    throw new Error(
      `Soma dos valores deve ser igual ao custo total. Valor total: ${valorTotal.toFixed(2)}, Custo: ${custoTotal.toFixed(2)}`
    )
  }

  // Verifica se todos os sócios existem
  const sociosIds = Array.from(new Set(pagamentos.map((p) => p.socioId)))
  if (sociosIds.length !== pagamentos.length) {
    throw new Error('Não pode haver pagamentos duplicados para o mesmo sócio')
  }
}

/**
 * Cria uma nova entrada de estoque
 * Atualiza quantidade, custo médio e recalcula cotas
 */
export async function criarEntrada(
  input: CreateEntradaInput
): Promise<Entrada> {
  // Validações
  if (input.quantidade <= 0) {
    throw new Error('Quantidade deve ser maior que zero')
  }

  if (input.custoUnitario < 0) {
    throw new Error('Custo unitário não pode ser negativo')
  }

  const estoque = await prisma.estoque.findUnique({
    where: { id: input.estoqueId },
    include: { cotas: true },
  })

  if (!estoque) {
    throw new Error('Estoque não encontrado')
  }

  const custoTotal = input.quantidade * input.custoUnitario

  // Valida pagamentos
  validarPagamentos(input.pagamentos, custoTotal)

  // Executa tudo em uma transação
  return prisma.$transaction(async (tx) => {
    // 1. Cria a entrada
    const entrada = await tx.entrada.create({
      data: {
        estoqueId: input.estoqueId,
        tipo: input.tipo,
        quantidade: input.quantidade,
        custoUnitario: input.custoUnitario,
        custoTotal,
        fornecedor: input.fornecedor,
        dataEntrada: input.dataEntrada ?? new Date(),
      },
    })

    // 2. Cria os pagamentos
    await tx.pagamentoEntrada.createMany({
      data: input.pagamentos.map((p) => ({
        entradaId: entrada.id,
        socioId: p.socioId,
        percentual: p.percentual,
        valor: p.valor,
      })),
    })

    // 3. Atualiza o estoque (quantidade e custo médio)
    const valorTotalInvestido = Number(estoque.valorTotalInvestido) + custoTotal
    const novaQuantidade = estoque.quantidadeTotal + input.quantidade
    const novoCustoMedio =
      novaQuantidade > 0 ? valorTotalInvestido / novaQuantidade : 0

    await tx.estoque.update({
      where: { id: input.estoqueId },
      data: {
        quantidadeTotal: novaQuantidade,
        quantidadeDisponivel: {
          increment: input.quantidade,
        },
        custoMedio: novoCustoMedio,
        valorTotalInvestido: valorTotalInvestido,
      },
    })

    // 4. Atualiza total investido dos sócios
    for (const pagamento of input.pagamentos) {
      await tx.socio.update({
        where: { id: pagamento.socioId },
        data: {
          totalInvestido: {
            increment: pagamento.valor,
          },
        },
      })
    }

    // 5. Recalcula as cotas do estoque
    await recalcularCotasAposEntrada(
      input.estoqueId,
      custoTotal,
      input.pagamentos
    )

    return entrada
  })
}

/**
 * Exclui uma entrada (apenas se for a mais recente e não houver vendas)
 */
export async function excluirEntrada(id: string): Promise<void> {
  const entrada = await prisma.entrada.findUnique({
    where: { id },
    include: {
      estoque: {
        include: {
          vendaItens: true,
        },
      },
      pagamentos: true,
    },
  })

  if (!entrada) {
    throw new Error('Entrada não encontrada')
  }

  // Verifica se há vendas que usaram este estoque
  if (entrada.estoque.vendaItens.length > 0) {
    throw new Error(
      'Não é possível excluir entrada com vendas associadas'
    )
  }

  // Verifica se é a entrada mais recente
  const entradaMaisRecente = await prisma.entrada.findFirst({
    where: { estoqueId: entrada.estoqueId },
    orderBy: { dataEntrada: 'desc' },
  })

  if (entradaMaisRecente && entradaMaisRecente.id !== id) {
    throw new Error(
      'Apenas a entrada mais recente pode ser excluída'
    )
  }

  await prisma.$transaction([
    // Remove pagamentos
    prisma.pagamentoEntrada.deleteMany({
      where: { entradaId: id },
    }),
    // Remove entrada
    prisma.entrada.delete({
      where: { id },
    }),
    // Atualiza estoque (reverte a entrada)
    prisma.estoque.update({
      where: { id: entrada.estoqueId },
      data: {
        quantidadeTotal: {
          decrement: entrada.quantidade,
        },
        quantidadeDisponivel: {
          decrement: entrada.quantidade,
        },
        valorTotalInvestido: {
          decrement: Number(entrada.custoTotal),
        },
      },
    }),
    // Atualiza investimentos dos sócios
    ...entrada.pagamentos.map((p) =>
      prisma.socio.update({
        where: { id: p.socioId },
        data: {
          totalInvestido: {
            decrement: Number(p.valor),
          },
        },
      })
    ),
  ])
}

/**
 * Obtém resumo de entradas por período
 */
export async function obterResumoEntradas(
  dataInicio?: Date,
  dataFim?: Date
): Promise<{
  totalEntradas: number
  totalInvestido: number
  totalQuantidade: number
  porTipo: Record<TipoEntrada, number>
}> {
  const entradas = await prisma.entrada.findMany({
    where: {
      dataEntrada: {
        gte: dataInicio,
        lte: dataFim,
      },
    },
  })

  const totalEntradas = entradas.length
  const totalInvestido = entradas.reduce(
    (sum, e) => sum + Number(e.custoTotal),
    0
  )
  const totalQuantidade = entradas.reduce(
    (sum, e) => sum + e.quantidade,
    0
  )

  const porTipo = entradas.reduce((acc, e) => {
    acc[e.tipo] = (acc[e.tipo] || 0) + Number(e.custoTotal)
    return acc
  }, {} as Record<TipoEntrada, number>)

  return {
    totalEntradas,
    totalInvestido,
    totalQuantidade,
    porTipo,
  }
}
