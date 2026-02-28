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
      { nome: string; valor: number }
    >
  }
}> {
  const resultadoItens = []
  let receitaTotal = 0
  let custoTotal = 0
  let lucroTotal = 0

  for (const item of itens) {
    const estoque = await prisma.estoques.findUnique({
      where: { id: item.estoqueId },
      include: {
        produtos: true,
        cotas: {
          include: {
            socios: true,
          },
        },
      },
    })

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

    // Calcula distribuição baseada nas cotas
    const distribuicao = estoque.cotas.map((c) => ({
      socioId: c.socioId,
      percentual: Number(c.percentual),
      valor: Number((itemLucroTotal * Number(c.percentual)) / 100),
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
  const distribuicaoPorSocio: Record<string, { nome: string; valor: number }> =
    {}

  for (const item of resultadoItens) {
    for (const dist of item.distribuicao) {
      if (!distribuicaoPorSocio[dist.socioId]) {
        const socio = await prisma.socios.findUnique({
          where: { id: dist.socioId },
          select: { nome: true },
        })
        distribuicaoPorSocio[dist.socioId] = {
          nome: socio?.nome || 'Desconhecido',
          valor: 0,
        }
      }
      distribuicaoPorSocio[dist.socioId].valor += dist.valor
    }
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

  // Executa tudo em uma transação
  return prisma.$transaction(async (tx) => {
    // Verifica disponibilidade DENTRO da transação (evita TOCTOU)
    for (const item of input.itens) {
      const estoque = await tx.estoques.findUnique({
        where: { id: item.estoqueId },
        select: { quantidadeDisponivel: true, nome: true }
      })

      if (!estoque) {
        throw new Error(`Estoque ${item.estoqueId} não encontrado`)
      }

      if (estoque.quantidadeDisponivel < item.quantidade) {
        throw new Error(
          `Quantidade insuficiente no estoque ${estoque.nome}. Disponível: ${estoque.quantidadeDisponivel}`
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

      // Atualiza estoque
      await tx.estoques.update({
        where: { id: item.estoqueId },
        data: {
          quantidadeTotal: {
            decrement: item.quantidade,
          },
          quantidadeDisponivel: {
            decrement: item.quantidade,
          },
        },
      })

      // Cria distribuições do lucro
      for (const cota of estoque.cotas) {
        const valorDistribuicao = Number(
          (itemLucroTotal * Number(cota.percentual)) / 100
        )

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

    // Atualiza totais da venda
    await tx.vendas.update({
      where: { id: venda.id },
      data: {
        receitaTotal,
        custoTotal,
        lucroTotal,
      },
    })

    return { vendaId: venda.id }
  })
}

/**
 * Cancela uma venda
 * Restaura estoque, cria dívidas de ajuste e reverte saldos
 */
export async function cancelarVenda(
  vendaId: string,
  motivo: string
): Promise<void> {
  const venda = await prisma.vendas.findUnique({
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

  await prisma.$transaction(async (tx) => {
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

      // Reverte saldo pendente
      await tx.socios.update({
        where: { id: dist.socioId },
        data: {
          saldoPendente: {
            decrement: Number(dist.valor),
          },
        },
      })
    }

    // 3. Marca venda como cancelada
    await tx.vendas.update({
      where: { id: vendaId },
      data: {
        status: 'CANCELADA',
        dataCancelamento: new Date(),
        motivoCancelamento: motivo,
      },
    })
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
  const vendas = await prisma.vendas.findMany({
    where: {
      status: 'CONCLUIDA',
      dataVenda: {
        gte: dataInicio,
        lte: dataFim,
      },
    },
  })

  const totalVendas = vendas.length
  const receitaTotal = vendas.reduce(
    (sum, v) => sum + Number(v.receitaTotal),
    0
  )
  const custoTotal = vendas.reduce(
    (sum, v) => sum + Number(v.custoTotal),
    0
  )
  const lucroTotal = vendas.reduce(
    (sum, v) => sum + Number(v.lucroTotal),
    0
  )

  const porCanal = vendas.reduce((acc, v) => {
    if (!acc[v.canal]) {
      acc[v.canal] = { receita: 0, lucro: 0 }
    }
    acc[v.canal].receita += Number(v.receitaTotal)
    acc[v.canal].lucro += Number(v.lucroTotal)
    return acc
  }, {} as Record<string, { receita: number; lucro: number }>)

  return {
    totalVendas,
    receitaTotal,
    custoTotal,
    lucroTotal,
    porCanal,
  }
}
