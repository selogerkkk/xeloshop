import { prisma } from '@/lib/prisma'
import type { StatusVenda } from '@prisma/client'
import { verificarDisponibilidade } from './estoqueService'
import { calcularDistribuicaoDoLucro } from './cotaService'
import { atualizarSaldoAposDistribuicao } from './socioService'

export interface VendaItemInput {
  estoqueId: string
  quantidade: number
  precoUnitario: number
}

export interface CreateVendaInput {
  canal: string
  itens: VendaItemInput[]
  dataVenda?: Date
}

export interface VendaDetalhada {
  id: string
  canal: string
  receitaTotal: number
  custoTotal: number
  lucroTotal: number
  status: StatusVenda
  dataVenda: Date
  dataCancelamento?: Date
  motivoCancelamento?: string
  venda_itens: {
    id: string
    estoqueId: string
    estoqueNome: string
    produtoNome: string
    quantidade: number
    precoUnitario: number
    custoUnitario: number
    lucroTotal: number
  }[]
  distribuicoes_lucro: {
    id: string
    socioId: string
    socioNome: string
    socioCor: string
    percentualAplicado: number
    valor: number
    status: string
  }[]
}

/**
 * Lista todas as vendas
 */
export async function listarVendas(
  filtros?: {
    status?: StatusVenda
    canal?: string
    dataInicio?: Date
    dataFim?: Date
  }
): Promise<VendaDetalhada[]> {
  const vendas = await prisma.vendas.findMany({
    where: {
      status: filtros?.status,
      canal: filtros?.canal,
      dataVenda: {
        gte: filtros?.dataInicio,
        lte: filtros?.dataFim,
      },
    },
    include: {
      venda_itens: {
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
        },
      },
      distribuicoes_lucro: {
        include: {
          socios: {
            select: {
              id: true,
              nome: true,
              cor: true,
            },
          },
        },
      },
    },
    orderBy: { dataVenda: 'desc' },
  })

  return vendas.map((v) => ({
    id: v.id,
    canal: v.canal,
    receitaTotal: Number(v.receitaTotal),
    custoTotal: Number(v.custoTotal),
    lucroTotal: Number(v.lucroTotal),
    status: v.status,
    dataVenda: v.dataVenda,
    dataCancelamento: v.dataCancelamento || undefined,
    motivoCancelamento: v.motivoCancelamento || undefined,
    venda_itens: v.venda_itens.map((i) => ({
      id: i.id,
      estoqueId: i.estoqueId,
      estoqueNome: i.estoques.nome,
      produtoNome: i.estoques.produtos.nome,
      quantidade: i.quantidade,
      precoUnitario: Number(i.precoUnitario),
      custoUnitario: Number(i.custoUnitario),
      lucroTotal: Number(i.lucroTotal),
    })),
    distribuicoes_lucro: v.distribuicoes_lucro.map((d) => ({
      id: d.id,
      socioId: d.socioId,
      socioNome: d.socios.nome,
      socioCor: d.socios.cor,
      percentualAplicado: Number(d.percentualAplicado),
      valor: Number(d.valor),
      status: d.status,
    })),
  }))
}

/**
 * Busca uma venda por ID
 */
export async function buscarVendaPorId(
  id: string
): Promise<VendaDetalhada | null> {
  const venda = await prisma.vendas.findUnique({
    where: { id },
    include: {
      venda_itens: {
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
        },
      },
      distribuicoes_lucro: {
        include: {
          socios: {
            select: {
              id: true,
              nome: true,
              cor: true,
            },
          },
        },
      },
    },
  })

  if (!venda) return null

  return {
    id: venda.id,
    canal: venda.canal,
    receitaTotal: Number(venda.receitaTotal),
    custoTotal: Number(venda.custoTotal),
    lucroTotal: Number(venda.lucroTotal),
    status: venda.status,
    dataVenda: venda.dataVenda,
    dataCancelamento: venda.dataCancelamento || undefined,
    motivoCancelamento: venda.motivoCancelamento || undefined,
    venda_itens: venda.venda_itens.map((i) => ({
      id: i.id,
      estoqueId: i.estoqueId,
      estoqueNome: i.estoques.nome,
      produtoNome: i.estoques.produtos.nome,
      quantidade: i.quantidade,
      precoUnitario: Number(i.precoUnitario),
      custoUnitario: Number(i.custoUnitario),
      lucroTotal: Number(i.lucroTotal),
    })),
    distribuicoes_lucro: venda.distribuicoes_lucro.map((d) => ({
      id: d.id,
      socioId: d.socioId,
      socioNome: d.socios.nome,
      socioCor: d.socios.cor,
      percentualAplicado: Number(d.percentualAplicado),
      valor: Number(d.valor),
      status: d.status,
    })),
  }
}

/**
 * Pré-visualiza a distribuição do lucro de uma venda
 * Útil para mostrar ao usuário antes de confirmar
 */
export async function previewDistribuicao(
  itens: VendaItemInput[]
): Promise<{
  itens: {
    estoqueId: string
    quantidade: number
    precoUnitario: number
    custoUnitario: number
    lucroTotal: number
    distribuicao: {
      socioId: string
      percentual: number
      valor: number
    }[]
  }[]
  resumo: {
    receitaTotal: number
    custoTotal: number
    lucroTotal: number
    distribuicaoPorSocio: Record<
      string,
      { nome: string; cor: string; valor: number; percentual: number }
    >
  }
}> {
  const resultadoItens = []
  let receitaTotal = 0
  let custoTotal = 0
  let lucroTotal = 0

  // Collect all estoqueIds to fetch in a single query (avoids N+1)
  const estoqueIds = Array.from(new Set(itens.map((item) => item.estoqueId)))

  // Fetch all estoques with their data in one query
  const estoques = await prisma.estoques.findMany({
    where: { id: { in: estoqueIds } },
    include: {
      produtos: true,
      cotas: {
        include: {
          socios: true,
        },
      },
    },
  })

  // Build lookup map for O(1) access
  const estoqueMap = new Map(estoques.map((e) => [e.id, e]))

  // Build socio data map from already-fetched data
  const socioData: Record<string, { nome: string; cor: string }> = {}

  for (const item of itens) {
    const estoque = estoqueMap.get(item.estoqueId)

    if (!estoque) {
      throw new Error(`Estoque ${item.estoqueId} não encontrado`)
    }

    if (estoque.quantidadeDisponivel < item.quantidade) {
      throw new Error(
        `Quantidade insuficiente no estoque ${estoque.nome}. Disponível: ${estoque.quantidadeDisponivel}, Solicitado: ${item.quantidade}`
      )
    }

    const custoUnitario = Number(estoque.custoMedio)
    const itemCustoTotal = custoUnitario * item.quantidade
    const itemReceitaTotal = item.precoUnitario * item.quantidade
    const itemLucroTotal = itemReceitaTotal - itemCustoTotal

    // Build socio data map from already-fetched data
    for (const cota of estoque.cotas) {
      if (!socioData[cota.socioId]) {
        socioData[cota.socioId] = {
          nome: cota.socios.nome,
          cor: cota.socios.cor,
        }
      }
    }

    // Calcula distribuição baseada nas cotas
    const distribuicao = estoque.cotas.map((c) => ({
      socioId: c.socioId,
      percentual: Number(c.percentual),
      valor: Math.round((itemLucroTotal * Number(c.percentual)) / 100 * 100) / 100,
    }))

    resultadoItens.push({
      estoqueId: item.estoqueId,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      custoUnitario,
      lucroTotal: itemLucroTotal,
      distribuicao,
    })

    receitaTotal += itemReceitaTotal
    custoTotal += itemCustoTotal
    lucroTotal += itemLucroTotal
  }

  // Calcula distribuição total por sócio
  const distribuicaoPorSocio: Record<
    string,
    { nome: string; cor: string; valor: number; percentual: number }
  > = {}

  for (const item of resultadoItens) {
    for (const dist of item.distribuicao) {
      if (!distribuicaoPorSocio[dist.socioId]) {
        distribuicaoPorSocio[dist.socioId] = {
          nome: socioData[dist.socioId]?.nome || 'Desconhecido',
          cor: socioData[dist.socioId]?.cor || '#6B7280',
          valor: 0,
          percentual: 0,
        }
      }
      distribuicaoPorSocio[dist.socioId].valor += dist.valor
    }
  }

  // Calculate percentage for each socio based on total profit
  for (const socioId of Object.keys(distribuicaoPorSocio)) {
    // Round the accumulated value to 2 decimal places to match currency precision
    distribuicaoPorSocio[socioId].valor = Math.round(distribuicaoPorSocio[socioId].valor * 100) / 100
    const valor = distribuicaoPorSocio[socioId].valor
    distribuicaoPorSocio[socioId].percentual =
      lucroTotal > 0 ? (valor / lucroTotal) * 100 : 0
  }

  return {
    itens: resultadoItens,
    resumo: {
      receitaTotal,
      custoTotal,
      lucroTotal,
      distribuicaoPorSocio,
    },
  }
}

/**
 * Cria uma nova venda com distribuição automática do lucro
 */
export async function criarVenda(
  input: CreateVendaInput
): Promise<{ vendaId: string }> {
  // Validações básicas
  if (!input.canal || !input.itens || input.itens.length === 0) {
    throw new Error('Canal e pelo menos um item são obrigatórios')
  }

  // Per-item validation
  for (const item of input.itens) {
    if (item.quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero')
    }
    if (item.precoUnitario < 0) {
      throw new Error('Preço unitário não pode ser negativo')
    }
  }

  // Executa tudo em uma transação
  return prisma.$transaction(async (tx) => {
    // Atomic availability check and decrement using updateMany
    for (const item of input.itens) {
      const result = await tx.estoques.updateMany({
        where: {
          id: item.estoqueId,
          quantidadeDisponivel: { gte: item.quantidade }
        },
        data: {
          quantidadeTotal: { decrement: item.quantidade },
          quantidadeDisponivel: { decrement: item.quantidade }
        }
      })

      if (result.count === 0) {
        const estoque = await tx.estoques.findUnique({
          where: { id: item.estoqueId },
          select: { nome: true }
        })
        throw new Error(
          estoque
            ? `Quantidade insuficiente no estoque ${estoque.nome}`
            : `Estoque ${item.estoqueId} não encontrado`
        )
      }
    }

    let receitaTotal = 0
    let custoTotal = 0
    let lucroTotal = 0

    // Cria a venda
    const venda = await tx.vendas.create({
      data: {
        id: crypto.randomUUID(),
        canal: input.canal,
        receitaTotal: 0,
        custoTotal: 0,
        lucroTotal: 0,
        status: 'CONCLUIDA',
        dataVenda: input.dataVenda ?? new Date(),
      },
    })

    // Processa cada item
    for (const item of input.itens) {
      const estoque = await tx.estoques.findUnique({
        where: { id: item.estoqueId },
        include: { cotas: true },
      })

      if (!estoque) {
        throw new Error(`Estoque ${item.estoqueId} não encontrado`)
      }

      const custoUnitario = Number(estoque.custoMedio)
      const itemCustoTotal = custoUnitario * item.quantidade
      const itemReceitaTotal = item.precoUnitario * item.quantidade
      const itemLucroTotal = itemReceitaTotal - itemCustoTotal

      // Cria o item da venda
      await tx.venda_itens.create({
        data: {
          id: crypto.randomUUID(),
          vendaId: venda.id,
          estoqueId: item.estoqueId,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          custoUnitario,
          lucroTotal: itemLucroTotal,
        },
      })

      // Cria distribuições do lucro
      for (const cota of estoque.cotas) {
        const valorDistribuicao = Math.round(
          (itemLucroTotal * Number(cota.percentual)) / 100 * 100
        ) / 100

        await tx.distribuicoes_lucro.create({
          data: {
            id: crypto.randomUUID(),
            vendaId: venda.id,
            socioId: cota.socioId,
            percentualAplicado: cota.percentual,
            valor: valorDistribuicao,
            status: 'PENDENTE',
          },
        })

        // Atualiza saldo pendente do sócio
        await tx.socios.update({
          where: { id: cota.socioId },
          data: {
            saldoPendente: {
              increment: valorDistribuicao,
            },
          },
        })
      }

      receitaTotal += itemReceitaTotal
      custoTotal += itemCustoTotal
      lucroTotal += itemLucroTotal
    }

    // Atualiza totais da venda (arredonda para 2 casas decimais para precisão monetária)
    await tx.vendas.update({
      where: { id: venda.id },
      data: {
        receitaTotal: Math.round(receitaTotal * 100) / 100,
        custoTotal: Math.round(custoTotal * 100) / 100,
        lucroTotal: Math.round(lucroTotal * 100) / 100,
      },
    })

    return { vendaId: venda.id }
  })
}

/**
 * Cancela uma venda
 * Restaura estoque, cria dívidas de ajuste e reverte saldos
 * Usa CAS (Compare-And-Swap) com updateMany para evitar cancelamento duplicado em corrida
 */
export async function cancelarVenda(
  vendaId: string,
  motivo: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Get venda with CAS-style check inside transaction
    const venda = await tx.vendas.findUnique({
      where: { id: vendaId },
      include: {
        venda_itens: true,
        distribuicoes_lucro: true,
      },
    })

    if (!venda) {
      throw new Error('Venda não encontrada')
    }

    if (venda.status === 'CANCELADA') {
      throw new Error('Venda já está cancelada')
    }

    // 1. Restaura quantidade dos estoques
    for (const item of venda.venda_itens) {
      await tx.estoques.update({
        where: { id: item.estoqueId },
        data: {
          quantidadeTotal: {
            increment: item.quantidade,
          },
          quantidadeDisponivel: {
            increment: item.quantidade,
          },
        },
      })
    }

    // 2. Marca distribuições como RETIDO e cria dívidas
    for (const dist of venda.distribuicoes_lucro) {
      // Marca como retido
      await tx.distribuicoes_lucro.update({
        where: { id: dist.id },
        data: { status: 'RETIDO' },
      })

      // Cria dívida de ajuste
      await tx.dividas_ajuste.create({
        data: {
          id: crypto.randomUUID(),
          socioId: dist.socioId,
          valorOriginal: dist.valor,
          valorPendente: dist.valor,
          motivo: `Cancelamento de venda: ${motivo}`,
          referenciaId: vendaId,
          status: 'ATIVA',
        },
      })

      // Reverte do campo correto: LIBERADO → saldoDisponivel, demais → saldoPendente
      if (dist.status === 'LIBERADO') {
        await tx.socios.update({
          where: { id: dist.socioId },
          data: { saldoDisponivel: { decrement: Number(dist.valor) } },
        })
      } else {
        await tx.socios.update({
          where: { id: dist.socioId },
          data: { saldoPendente: { decrement: Number(dist.valor) } },
        })
      }
    }

    // 3. CAS-style update - only updates if status hasn't changed
    const result = await tx.vendas.updateMany({
      where: {
        id: vendaId,
        status: { not: 'CANCELADA' }
      },
      data: {
        status: 'CANCELADA',
        dataCancelamento: new Date(),
        motivoCancelamento: motivo,
      }
    })

    if (result.count === 0) {
      throw new Error('Venda já foi cancelada por outra operação')
    }
  })
}

/**
 * Obtém resumo de vendas por período
 */
export async function obterResumoVendas(
  dataInicio?: Date,
  dataFim?: Date
): Promise<{
  totalVendas: number
  receitaTotal: number
  custoTotal: number
  lucroTotal: number
  porCanal: Record<string, { receita: number; lucro: number }>
}> {
  const [aggregates, porCanalResult] = await Promise.all([
    prisma.vendas.aggregate({
      where: {
        status: 'CONCLUIDA',
        dataVenda: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      _count: { id: true },
      _sum: { receitaTotal: true, custoTotal: true, lucroTotal: true },
    }),
    prisma.vendas.groupBy({
      by: ['canal'],
      where: {
        status: 'CONCLUIDA',
        dataVenda: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      _sum: {
        receitaTotal: true,
        lucroTotal: true,
      },
    }),
  ])

  const porCanal = porCanalResult.reduce((acc, item) => {
    acc[item.canal] = {
      receita: Number(item._sum.receitaTotal) || 0,
      lucro: Number(item._sum.lucroTotal) || 0,
    }
    return acc
  }, {} as Record<string, { receita: number; lucro: number }>)

  return {
    totalVendas: aggregates._count.id,
    receitaTotal: Number(aggregates._sum.receitaTotal) || 0,
    custoTotal: Number(aggregates._sum.custoTotal) || 0,
    lucroTotal: Number(aggregates._sum.lucroTotal) || 0,
    porCanal,
  }
}
