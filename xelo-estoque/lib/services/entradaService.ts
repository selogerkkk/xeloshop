import { prisma } from '@/lib/prisma'
import type { TipoEntrada, entradas } from '@prisma/client'
import { atualizarAposEntrada } from './estoqueService'
import { recalcularCotasAposEntrada, calcularPercentuaisDosPagamentos } from './cotaService'

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

export interface EntradaDetalhada extends entradas {
  estoques: {
    id: string
    nome: string
    produtos: {
      id: string
      nome: string
    }
  }
  pagamentos_entrada: {
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
  const entradas = await prisma.entradas.findMany({
    where: {
      estoqueId: filtros?.estoqueId,
      tipo: filtros?.tipo,
      dataEntrada: {
        gte: filtros?.dataInicio,
        lte: filtros?.dataFim,
      },
    },
    include: {
      estoques: {
        include: {
          produtos: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
      pagamentos_entrada: {
        include: {
          socios: {
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
    pagamentos_entrada: e.pagamentos_entrada.map((p) => ({
      id: p.id,
      socioId: p.socioId,
      socioNome: p.socios.nome,
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
  const entrada = await prisma.entradas.findUnique({
    where: { id },
    include: {
      estoques: {
        include: {
          produtos: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
      pagamentos_entrada: {
        include: {
          socios: {
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
    pagamentos_entrada: entrada.pagamentos_entrada.map((p) => ({
      id: p.id,
      socioId: p.socioId,
      socioNome: p.socios.nome,
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

  // Valida se os valores individuais correspondem aos percentuais
  for (const pagamento of pagamentos) {
    const valorEsperado = (pagamento.percentual / 100) * custoTotal
    if (Math.abs(pagamento.valor - valorEsperado) > 0.01) {
      throw new Error(
        `Valor do pagamento não corresponde ao percentual informado. Sócio: ${pagamento.socioId}, Percentual: ${pagamento.percentual}%, Valor informado: ${pagamento.valor.toFixed(2)}, Valor esperado: ${valorEsperado.toFixed(2)}`
      )
    }
  }
}

/**
 * Cria uma nova entrada de estoque
 * Atualiza quantidade, custo médio e recalcula cotas
 */
export async function criarEntrada(
  input: CreateEntradaInput
): Promise<entradas> {
  // Validações
  if (input.quantidade <= 0) {
    throw new Error('Quantidade deve ser maior que zero')
  }

  if (input.custoUnitario < 0) {
    throw new Error('Custo unitário não pode ser negativo')
  }

  const custoTotal = input.quantidade * input.custoUnitario

  // Valida pagamentos
  validarPagamentos(input.pagamentos, custoTotal)

  // Executa tudo em uma transação
  return prisma.$transaction(async (tx) => {
    // 1. Busca estoque DENTRO da transação para garantir consistência
    const estoque = await tx.estoques.findUnique({
      where: { id: input.estoqueId },
      include: { cotas: true },
    })

    if (!estoque) {
      throw new Error('Estoque não encontrado')
    }

    // 2. Cria a entrada
    const entrada = await tx.entradas.create({
      data: {
        id: crypto.randomUUID(),
        estoqueId: input.estoqueId,
        tipo: input.tipo,
        quantidade: input.quantidade,
        custoUnitario: input.custoUnitario,
        custoTotal,
        fornecedor: input.fornecedor,
        dataEntrada: input.dataEntrada ?? new Date(),
      },
    })

    // 3. Cria os pagamentos
    await tx.pagamentos_entrada.createMany({
      data: input.pagamentos.map((p) => ({
        id: crypto.randomUUID(),
        entradaId: entrada.id,
        socioId: p.socioId,
        percentual: p.percentual,
        valor: p.valor,
      })),
    })

    // 4. Atualiza o estoque (quantidade e custo médio)
    // Usa updateMany com verificação de consistência para evitar lost updates
    const valorTotalInvestido = Number(estoque.valorTotalInvestido) + custoTotal
    const novaQuantidade = estoque.quantidadeTotal + input.quantidade
    const novoCustoMedio =
      novaQuantidade > 0 ? valorTotalInvestido / novaQuantidade : 0

    const estoqueAtualizado = await tx.estoques.updateMany({
      where: {
        id: input.estoqueId,
        // Verifica se o estoque ainda tem os valores que lemos (evita lost update)
        quantidadeTotal: estoque.quantidadeTotal,
        valorTotalInvestido: estoque.valorTotalInvestido,
      },
      data: {
        quantidadeTotal: novaQuantidade,
        quantidadeDisponivel: {
          increment: input.quantidade,
        },
        custoMedio: novoCustoMedio,
        valorTotalInvestido: valorTotalInvestido,
      },
    })

    if (estoqueAtualizado.count === 0) {
      throw new Error(
        'Conflito de atualização: estoque foi modificado por outra operação. Tente novamente.'
      )
    }

    // 5. Atualiza total investido dos sócios
    for (const pagamento of input.pagamentos) {
      await tx.socios.update({
        where: { id: pagamento.socioId },
        data: {
          totalInvestido: {
            increment: pagamento.valor,
          },
        },
      })
    }

    // 6. Recalcula as cotas do estoque (passando transaction client)
    await recalcularCotasAposEntrada(
      input.estoqueId,
      custoTotal,
      input.pagamentos,
      tx
    )

    return entrada
  })
}

/**
 * Exclui uma entrada (apenas se for a mais recente e não houver vendas)
 */
export async function excluirEntrada(id: string): Promise<void> {
  const entrada = await prisma.entradas.findUnique({
    where: { id },
    include: {
      estoques: {
        include: {
          venda_itens: true,
        },
      },
      pagamentos_entrada: true,
    },
  })

  if (!entrada) {
    throw new Error('Entrada não encontrada')
  }

  // Verifica se há vendas que usaram este estoque
  if (entrada.estoques.venda_itens.length > 0) {
    throw new Error(
      'Não é possível excluir entrada com vendas associadas'
    )
  }

  // Verifica se é a entrada mais recente
  const entradaMaisRecente = await prisma.entradas.findFirst({
    where: { estoqueId: entrada.estoques.id },
    orderBy: { dataEntrada: 'desc' },
  })

  if (entradaMaisRecente && entradaMaisRecente.id !== id) {
    throw new Error(
      'Apenas a entrada mais recente pode ser excluída'
    )
  }

  await prisma.$transaction([
    // Remove pagamentos
    prisma.pagamentos_entrada.deleteMany({
      where: { entradaId: id },
    }),
    // Remove entrada
    prisma.entradas.delete({
      where: { id },
    }),
    // Atualiza estoque (reverte a entrada)
    prisma.estoques.update({
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
    ...entrada.pagamentos_entrada.map((p) =>
      prisma.socios.update({
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
  const [aggregates, porTipoResult] = await Promise.all([
    prisma.entradas.aggregate({
      where: {
        dataEntrada: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      _count: { id: true },
      _sum: { custoTotal: true, quantidade: true },
    }),
    prisma.entradas.groupBy({
      by: ['tipo'],
      where: {
        dataEntrada: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      _sum: {
        custoTotal: true,
      },
    }),
  ])

  const porTipo = porTipoResult.reduce((acc, item) => {
    acc[item.tipo] = Number(item._sum.custoTotal) || 0
    return acc
  }, {} as Record<TipoEntrada, number>)

  return {
    totalEntradas: aggregates._count.id,
    totalInvestido: Number(aggregates._sum.custoTotal) || 0,
    totalQuantidade: aggregates._sum.quantidade || 0,
    porTipo,
  }
}
