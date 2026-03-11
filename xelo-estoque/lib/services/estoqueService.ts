import { prisma } from '@/lib/prisma'
import type { Prisma, TipoEstoque, estoques } from '@prisma/client'

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

export interface EstoqueComCotas extends estoques {
  cotas: {
    id: string
    socioId: string
    socioNome: string
    socioCor: string
    percentual: number
    valorInvestido: number
  }[]
  produtos: {
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
): Promise<estoques[]> {
  return prisma.estoques.findMany({
    where: {
      produtoId: filtros?.produtoId,
      tipo: filtros?.tipo,
      ativo: filtros?.ativo,
    },
    include: {
      produtos: {
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
  const estoque = await prisma.estoques.findUnique({
    where: { id },
    include: {
      produtos: true,
      cotas: {
        include: {
          socios: true,
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
    cotas: estoque.cotas.map((c: typeof estoque.cotas[0]) => ({
      id: c.id,
      socioId: c.socioId,
      socioNome: c.socios.nome,
      socioCor: c.socios.cor,
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
): Promise<estoques> {
  const produto = await prisma.produtos.findUnique({
    where: { id: input.produtoId },
  })

  if (!produto) {
    throw new Error('Produto não encontrado')
  }

  return prisma.estoques.create({
    data: {
      id: crypto.randomUUID(),
      produtoId: input.produtoId,
      nome: input.nome,
      tipo: input.tipo,
      localFisico: input.localFisico,
      quantidadeTotal: 0,
      quantidadeDisponivel: 0,
      custoMedio: 0,
      valorTotalInvestido: 0,
      atualizadoEm: new Date(),
    },
  })
}

/**
 * Atualiza um estoque existente
 */
export async function atualizarEstoque(
  id: string,
  input: UpdateEstoqueInput
): Promise<estoques> {
  return prisma.estoques.update({
    where: { id },
    data: input,
  })
}

/**
 * Exclui um estoque (apenas se vazio)
 */
export async function excluirEstoque(id: string): Promise<void> {
  const estoque = await prisma.estoques.findUnique({
    where: { id },
    include: {
      cotas: true,
      entradas: true,
      venda_itens: true,
    },
  })

  if (!estoque) {
    throw new Error('Estoque não encontrado')
  }

  if (estoque.quantidadeTotal > 0) {
    throw new Error('Não é possível excluir estoque com quantidade')
  }

  if (estoque.entradas.length > 0 || estoque.venda_itens.length > 0) {
    throw new Error('Não é possível excluir estoque com movimentações')
  }

  await prisma.estoques.delete({
    where: { id },
  })
}

/**
 * Busca estoques disponíveis para venda de um produto
 */
export async function buscarEstoquesDisponiveis(
  produtoId: string,
  quantidadeMinima = 1
): Promise<estoques[]> {
  return prisma.estoques.findMany({
    where: {
      produtoId,
      ativo: true,
      quantidadeDisponivel: {
        gte: quantidadeMinima,
      },
    },
    include: {
      produtos: {
        select: {
          id: true,
          nome: true,
        },
      },
      cotas: {
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
  // Validate input parameters
  if (quantidade <= 0) {
    throw new Error('Quantidade deve ser maior que zero')
  }
  if (custoUnitario < 0) {
    throw new Error('Custo unitário não pode ser negativo')
  }

  const estoque = await prisma.estoques.findUnique({
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

  await prisma.estoques.update({
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
  quantidade: number,
  tx?: Prisma.TransactionClient
): Promise<void> {
  // Validate input parameter
  if (quantidade <= 0) {
    throw new Error('Quantidade deve ser maior que zero')
  }

  const client = tx || prisma

  const estoque = await client.estoques.findUnique({
    where: { id: estoqueId },
  })

  if (!estoque) {
    throw new Error('Estoque não encontrado')
  }

  if (estoque.quantidadeDisponivel < quantidade) {
    throw new Error('Quantidade insuficiente em estoque')
  }

  await client.estoques.update({
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
  quantidade: number,
  tx?: Prisma.TransactionClient
): Promise<void> {
  // Validate input parameter
  if (quantidade <= 0) {
    throw new Error('Quantidade deve ser maior que zero')
  }

  const client = tx || prisma

  const estoque = await client.estoques.findUnique({
    where: { id: estoqueId },
  })

  if (!estoque) {
    throw new Error('Estoque não encontrado')
  }

  await client.estoques.update({
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
  estoque: estoques
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
  const estoque = await prisma.estoques.findUnique({
    where: { id: estoqueId },
    select: { quantidadeDisponivel: true },
  })

  if (!estoque) return false

  return estoque.quantidadeDisponivel >= quantidade
}
