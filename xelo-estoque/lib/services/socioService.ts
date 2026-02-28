import { prisma } from '@/lib/prisma'
import type { TipoSocio, Socio } from '@prisma/client'

export interface CreateSocioInput {
  nome: string
  tipo: TipoSocio
  cor: string
}

export interface UpdateSocioInput {
  nome?: string
  cor?: string
  ativo?: boolean
}

export interface SaldoDetalhado {
  socio: Socio
  cotasAtivas: {
    estoqueNome: string
    produtoNome: string
    percentual: number
    valorInvestido: number
  }[]
  distribuicoesPendentes: number
  distribuicoesLiberadas: number
  distribuicoesRetidas: number
  dividasAtivas: number
}

/**
 * Lista todos os sócios
 */
export async function listarSocios(ativo?: boolean): Promise<Socio[]> {
  return prisma.socio.findMany({
    where: ativo !== undefined ? { ativo } : undefined,
    orderBy: { nome: 'asc' },
  })
}

/**
 * Busca um sócio por ID
 */
export async function buscarSocioPorId(id: string): Promise<Socio | null> {
  return prisma.socio.findUnique({
    where: { id },
  })
}

/**
 * Cria um novo sócio
 */
export async function criarSocio(input: CreateSocioInput): Promise<Socio> {
  return prisma.socio.create({
    data: {
      nome: input.nome,
      tipo: input.tipo,
      cor: input.cor,
      saldoDisponivel: 0,
      saldoPendente: 0,
      totalInvestido: 0,
      totalRecebido: 0,
      totalSacado: 0,
    },
  })
}

/**
 * Atualiza um sócio existente
 */
export async function atualizarSocio(
  id: string,
  input: UpdateSocioInput
): Promise<Socio> {
  return prisma.socio.update({
    where: { id },
    data: input,
  })
}

/**
 * Exclui um sócio (apenas se não tiver movimentações)
 */
export async function excluirSocio(id: string): Promise<void> {
  const socio = await prisma.socio.findUnique({
    where: { id },
    include: {
      cotas: true,
      pagamentos: true,
      distribuicoes: true,
      saques: true,
      dividas: true,
    },
  })

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  if (
    socio.cotas.length > 0 ||
    socio.pagamentos.length > 0 ||
    socio.distribuicoes.length > 0 ||
    socio.saques.length > 0 ||
    socio.dividas.length > 0
  ) {
    throw new Error('Não é possível excluir sócio com movimentações')
  }

  await prisma.socio.delete({
    where: { id },
  })
}

/**
 * Obtém o saldo detalhado de um sócio
 */
export async function obterSaldoDetalhado(
  socioId: string
): Promise<SaldoDetalhado> {
  const socio = await prisma.socio.findUnique({
    where: { id: socioId },
    include: {
      cotas: {
        where: {
          estoque: { ativo: true },
        },
        include: {
          estoque: {
            include: {
              produto: true,
            },
          },
        },
      },
      distribuicoes: true,
      dividas: {
        where: { status: 'ATIVA' },
      },
    },
  })

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  const distribuicoesPendentes = socio.distribuicoes
    .filter((d) => d.status === 'PENDENTE')
    .reduce((sum, d) => sum + Number(d.valor), 0)

  const distribuicoesLiberadas = socio.distribuicoes
    .filter((d) => d.status === 'LIBERADO')
    .reduce((sum, d) => sum + Number(d.valor), 0)

  const distribuicoesRetidas = socio.distribuicoes
    .filter((d) => d.status === 'RETIDO')
    .reduce((sum, d) => sum + Number(d.valor), 0)

  const dividasAtivas = socio.dividas.reduce(
    (sum, d) => sum + Number(d.valorPendente),
    0
  )

  return {
    socio,
    cotasAtivas: socio.cotas.map((c) => ({
      estoqueNome: c.estoque.nome,
      produtoNome: c.estoque.produto.nome,
      percentual: Number(c.percentual),
      valorInvestido: Number(c.valorInvestido),
    })),
    distribuicoesPendentes,
    distribuicoesLiberadas,
    distribuicoesRetidas,
    dividasAtivas,
  }
}

/**
 * Atualiza saldos do sócio após uma distribuição
 */
export async function atualizarSaldoAposDistribuicao(
  socioId: string,
  valorDistribuicao: number
): Promise<void> {
  await prisma.socio.update({
    where: { id: socioId },
    data: {
      saldoPendente: {
        increment: valorDistribuicao,
      },
    },
  })
}

/**
 * Libera saldo pendente para disponível
 */
export async function liberarSaldoPendente(
  socioId: string,
  valor: number
): Promise<void> {
  await prisma.$transaction([
    prisma.socio.update({
      where: { id: socioId },
      data: {
        saldoPendente: {
          decrement: valor,
        },
        saldoDisponivel: {
          increment: valor,
        },
        totalRecebido: {
          increment: valor,
        },
      },
    }),
  ])
}

/**
 * Processa um saque do sócio
 */
export async function processarSaque(
  socioId: string,
  valor: number
): Promise<void> {
  const socio = await prisma.socio.findUnique({
    where: { id: socioId },
  })

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  if (Number(socio.saldoDisponivel) < valor) {
    throw new Error('Saldo insuficiente')
  }

  await prisma.socio.update({
    where: { id: socioId },
    data: {
      saldoDisponivel: {
        decrement: valor,
      },
      totalSacado: {
        increment: valor,
      },
    },
  })
}

/**
 * Adiciona investimento ao total investido do sócio
 */
export async function adicionarInvestimento(
  socioId: string,
  valor: number
): Promise<void> {
  await prisma.socio.update({
    where: { id: socioId },
    data: {
      totalInvestido: {
        increment: valor,
      },
    },
  })
}
