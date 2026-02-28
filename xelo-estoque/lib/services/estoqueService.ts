import { prisma } from '@/lib/prisma'
import type { TipoEstoque, Estoque } from '@prisma/client'

export interface CreateEstoqueInput {
  produtoId: string
  nome: string
  tipo: TipoEstoque
  localFisico?: string
}

export interface UpdateEstoqueInput {
  nome?: string
  localFisico?: string
  ativo?: boolean
}

export interface EstoqueComCotas extends Estoque {
  cotas: {
    id: string
    socioId: string
    socioNome: string
    socioCor: string
    percentual: number
    valorInvestido: number
  }[]
  produto: {
    id: string
    nome: string
  }
}

/**
 * Lista todos os estoques
 */
export async function listarEstoques(
  filtros?: {
    produtoId?: string
    tipo?: TipoEstoque
    ativo?: boolean
  }
): Promise<Estoque[]> {
  return prisma.estoque.findMany({
    where: {
      produtoId: filtros?.produtoId,
      tipo: filtros?.tipo,
      ativo: filtros?.ativo,
    },
    include: {
      produto: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
    orderBy: { criadoEm: 'desc' },
  })
}

/**
 * Busca um estoque por ID
 */
export async function buscarEstoquePorId(
  id: string
): Promise<EstoqueComCotas | null> {
  const estoque = await prisma.estoque.findUnique({
    where: { id },
    include: {
      produto: true,
      cotas: {
        include: {
          socio: true,
        },
      },
      entradas: {
        orderBy: { dataEntrada: 'desc' },
        take: 10,
      },
    },
  })

  if (!estoque) return null

  return {
    ...estoque,
    cotas: estoque.cotas.map((c) => ({
      id: c.id,
      socioId: c.socioId,
      socioNome: c.socio.nome,
      socioCor: c.socio.cor,
      percentual: Number(c.percentual),
      valorInvestido: Number(c.valorInvestido),
    })),
  }
}

/**
 * Cria um novo estoque
 */
export async function criarEstoque(
  input: CreateEstoqueInput
): Promise<Estoque> {
  const produto = await prisma.produto.findUnique({
    where: { id: input.produtoId },
  })

  if (!produto) {
    throw new Error('Produto não encontrado')
  }

  return prisma.estoque.create({
    data: {
      produtoId: input.produtoId,
      nome: input.nome,
      tipo: input.tipo,
      localFisico: input.localFisico,
      quantidadeTotal: 0,
      quantidadeDisponivel: 0,
      custoMedio: 0,
      valorTotalInvestido: 0,
    },
  })
}

/**
 * Atualiza um estoque existente
 */
export async function atualizarEstoque(
  id: string,
  input: UpdateEstoqueInput
): Promise<Estoque> {
  return prisma.estoque.update({
    where: { id },
    data: input,
  })
}

/**
 * Exclui um estoque (apenas se vazio)
 */
export async function excluirEstoque(id: string): Promise<void> {
  const estoque = await prisma.estoque.findUnique({
    where: { id },
    include: {
      cotas: true,
      entradas: true,
      vendaItens: true,
    },
  })

  if (!estoque) {
    throw new Error('Estoque não encontrado')
  }

  if (estoque.quantidadeTotal > 0) {
    throw new Error('Não é possível excluir estoque com quantidade')
  }

  if (estoque.entradas.length > 0 || estoque.vendaItens.length > 0) {
    throw new Error('Não é possível excluir estoque com movimentações')
  }

  await prisma.estoque.delete({
    where: { id },
  })
}

/**
 * Busca estoques disponíveis para venda de um produto
 */
export async function buscarEstoquesDisponiveis(
  produtoId: string,
  quantidadeMinima = 1
): Promise<Estoque[]> {
  return prisma.estoque.findMany({
    where: {
      produtoId,
      ativo: true,
      quantidadeDisponivel: {
        gte: quantidadeMinima,
      },
    },
    include: {
      produto: {
        select: {
          id: true,
          nome: true,
        },
      },
      cotas: {
        include: {
          socio: {
            select: {
              id: true,
              nome: true,
              cor: true,
            },
          },
        },
      },
    },
    orderBy: { criadoEm: 'asc' },
  })
}

/**
 * Atualiza o custo médio e quantidade após uma entrada
 */
export async function atualizarAposEntrada(
  estoqueId: string,
  quantidade: number,
  custoUnitario: number
): Promise<void> {
  const estoque = await prisma.estoque.findUnique({
    where: { id: estoqueId },
  })

  if (!estoque) {
    throw new Error('Estoque não encontrado')
  }

  const custoTotal = quantidade * custoUnitario
  const novoValorTotal = Number(estoque.valorTotalInvestido) + custoTotal
  const novaQuantidade = estoque.quantidadeTotal + quantidade
  const novoCustoMedio =
    novaQuantidade > 0 ? novoValorTotal / novaQuantidade : 0

  await prisma.estoque.update({
    where: { id: estoqueId },
    data: {
      quantidadeTotal: novaQuantidade,
      quantidadeDisponivel: {
        increment: quantidade,
      },
      custoMedio: novoCustoMedio,
      valorTotalInvestido: novoValorTotal,
    },
  })
}

/**
 * Atualiza quantidade após uma venda
 */
export async function atualizarAposVenda(
  estoqueId: string,
  quantidade: number
): Promise<void> {
  const estoque = await prisma.estoque.findUnique({
    where: { id: estoqueId },
  })

  if (!estoque) {
    throw new Error('Estoque não encontrado')
  }

  if (estoque.quantidadeDisponivel < quantidade) {
    throw new Error('Quantidade insuficiente em estoque')
  }

  await prisma.estoque.update({
    where: { id: estoqueId },
    data: {
      quantidadeTotal: {
        decrement: quantidade,
      },
      quantidadeDisponivel: {
        decrement: quantidade,
      },
    },
  })
}

/**
 * Restaura quantidade após cancelamento de venda
 */
export async function restaurarAposCancelamento(
  estoqueId: string,
  quantidade: number
): Promise<void> {
  const estoque = await prisma.estoque.findUnique({
    where: { id: estoqueId },
  })

  if (!estoque) {
    throw new Error('Estoque não encontrado')
  }

  await prisma.estoque.update({
    where: { id: estoqueId },
    data: {
      quantidadeTotal: {
        increment: quantidade,
      },
      quantidadeDisponivel: {
        increment: quantidade,
      },
    },
  })
}

/**
 * Calcula o custo médio atual do estoque
 */
export function calcularCustoMedio(
  estoque: Estoque
): number {
  return Number(estoque.custoMedio)
}

/**
 * Verifica se há quantidade suficiente em estoque
 */
export async function verificarDisponibilidade(
  estoqueId: string,
  quantidade: number
): Promise<boolean> {
  const estoque = await prisma.estoque.findUnique({
    where: { id: estoqueId },
    select: { quantidadeDisponivel: true },
  })

  if (!estoque) return false

  return estoque.quantidadeDisponivel >= quantidade
}
