import { prisma } from '@/lib/prisma'
import type { TipoSocio, socios, PrismaClient } from '@prisma/client'
import type { DefaultArgs } from '@prisma/client/runtime/library'

type TransactionClient = Omit<
  PrismaClient<DefaultArgs, never, DefaultArgs>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

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
  socio: socios
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
export async function listarSocios(ativo?: boolean): Promise<socios[]> {
  return prisma.socios.findMany({
    where: ativo !== undefined ? { ativo } : undefined,
    orderBy: { nome: 'asc' },
  })
}

/**
 * Busca um sócio por ID
 */
export async function buscarSocioPorId(id: string): Promise<socios | null> {
  return prisma.socios.findUnique({
    where: { id },
  })
}

/**
 * Cria um novo sócio
 */
export async function criarSocio(input: CreateSocioInput): Promise<socios> {
  return prisma.socios.create({
    data: {
      id: crypto.randomUUID(),
      nome: input.nome,
      tipo: input.tipo,
      cor: input.cor,
      saldoDisponivel: 0,
      saldoPendente: 0,
      totalInvestido: 0,
      totalRecebido: 0,
      totalSacado: 0,
      atualizadoEm: new Date(),
    },
  })
}

/**
 * Atualiza um sócio existente
 */
export async function atualizarSocio(
  id: string,
  input: UpdateSocioInput
): Promise<socios> {
  return prisma.socios.update({
    where: { id },
    data: input,
  })
}

/**
 * Exclui um sócio (apenas se não tiver movimentações)
 */
export async function excluirSocio(id: string): Promise<void> {
  const socio = await prisma.socios.findUnique({
    where: { id },
    include: {
      cotas: true,
      distribuicoes_lucro: true,
      saques: true,
      dividas_ajuste: true,
      pagamentos_entrada: true,
    },
  })

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  if (
    socio.cotas.length > 0 ||
    socio.distribuicoes_lucro.length > 0 ||
    socio.saques.length > 0 ||
    socio.dividas_ajuste.length > 0 ||
    socio.pagamentos_entrada.length > 0
  ) {
    throw new Error('Não é possível excluir sócio com movimentações')
  }

  await prisma.socios.delete({
    where: { id },
  })
}

/**
 * Obtém o saldo detalhado de um sócio
 */
export async function obterSaldoDetalhado(
  socioId: string
): Promise<SaldoDetalhado> {
  const socio = await prisma.socios.findUnique({
    where: { id: socioId },
    include: {
      cotas: {
        where: {
          estoques: { ativo: true },
        },
        include: {
          estoques: {
            include: {
              produtos: true,
            },
          },
        },
      },
      distribuicoes_lucro: true,
      dividas_ajuste: {
        where: { status: 'ATIVA' },
      },
    },
  })

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  const distribuicoesPendentes = socio.distribuicoes_lucro
    .filter((d) => d.status === 'PENDENTE')
    .reduce((sum, d) => sum + Number(d.valor), 0)

  const distribuicoesLiberadas = socio.distribuicoes_lucro
    .filter((d) => d.status === 'LIBERADO')
    .reduce((sum, d) => sum + Number(d.valor), 0)

  const distribuicoesRetidas = socio.distribuicoes_lucro
    .filter((d) => d.status === 'RETIDO')
    .reduce((sum, d) => sum + Number(d.valor), 0)

  const dividasAtivas = socio.dividas_ajuste.reduce(
    (sum, d) => sum + Number(d.valorPendente),
    0
  )

  return {
    socio,
    cotasAtivas: socio.cotas.map((c: typeof socio.cotas[0]) => ({
      estoqueNome: c.estoques.nome,
      produtoNome: c.estoques.produtos.nome,
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
  await prisma.socios.update({
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
 * Valida limites e valores antes de processar
 */
export async function liberarSaldoPendente(
  socioId: string,
  valor: number
): Promise<void> {
  // Validações de entrada
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error('Valor deve ser um número positivo')
  }

  // Verifica existência e saldo do sócio
  const socio = await prisma.socios.findUnique({
    where: { id: socioId },
    select: { id: true, saldoPendente: true },
  })

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  const saldoPendente = Number(socio.saldoPendente)

  if (saldoPendente < valor) {
    throw new Error(`Saldo pendente insuficiente. Disponível: ${saldoPendente}, Solicitado: ${valor}`)
  }

  // Usa updateMany com condição para garantir atomicidade
  const atualizado = await prisma.socios.updateMany({
    where: {
      id: socioId,
      saldoPendente: { gte: valor },
    },
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
  })

  if (atualizado.count === 0) {
    throw new Error('Saldo pendente foi alterado por outra operação')
  }
}

/**
 * Processa um saque do sócio
 * Usa updateMany condicional para garantir atomicidade (evita TOCTOU)
 */
export async function processarSaque(
  socioId: string,
  valor: number,
  tx?: TransactionClient
): Promise<void> {
  const client = tx || prisma

  // Verifica existência para mensagem de erro adequada
  const socio = await client.socios.findUnique({
    where: { id: socioId },
    select: { id: true, saldoDisponivel: true },
  })

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  // updateMany com condição garante atomicidade: só decrementa se saldo >= valor
  const atualizado = await client.socios.updateMany({
    where: { id: socioId, saldoDisponivel: { gte: valor } },
    data: {
      saldoDisponivel: { decrement: valor },
      totalSacado: { increment: valor },
    },
  })

  if (atualizado.count === 0) {
    throw new Error('Saldo insuficiente')
  }
}

/**
 * Adiciona investimento ao total investido do sócio
 */
export async function adicionarInvestimento(
  socioId: string,
  valor: number
): Promise<void> {
  await prisma.socios.update({
    where: { id: socioId },
    data: {
      totalInvestido: {
        increment: valor,
      },
    },
  })
}
