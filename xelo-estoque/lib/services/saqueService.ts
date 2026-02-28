import { prisma } from '@/lib/prisma'
import type { StatusSaque, Saque } from '@prisma/client'
import { processarSaque } from './socioService'

export interface CreateSaqueInput {
  socioId: string
  valor: number
  motivo?: string
}

export interface UpdateSaqueInput {
  status: StatusSaque
}

export interface SaqueDetalhado extends Saque {
  socio: {
    id: string
    nome: string
    cor: string
  }
}

/**
 * Lista todos os saques
 */
export async function listarSaques(
  filtros?: {
    socioId?: string
    status?: StatusSaque
  }
): Promise<SaqueDetalhado[]> {
  return prisma.saque.findMany({
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
    orderBy: { dataSolicitacao: 'desc' },
  })
}

/**
 * Busca um saque por ID
 */
export async function buscarSaquePorId(id: string): Promise<SaqueDetalhado | null> {
  return prisma.saque.findUnique({
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
 * Cria uma solicitação de saque
 */
export async function criarSaque(input: CreateSaqueInput): Promise<Saque> {
  if (input.valor <= 0) {
    throw new Error('Valor deve ser maior que zero')
  }

  const socio = await prisma.socio.findUnique({
    where: { id: input.socioId },
  })

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  if (Number(socio.saldoDisponivel) < input.valor) {
    throw new Error('Saldo disponível insuficiente')
  }

  return prisma.saque.create({
    data: {
      socioId: input.socioId,
      valor: input.valor,
      motivo: input.motivo,
      status: 'PENDENTE',
    },
  })
}

/**
 * Atualiza o status de um saque
 */
export async function atualizarStatusSaque(
  id: string,
  status: StatusSaque
): Promise<Saque> {
  const saque = await prisma.saque.findUnique({
    where: { id },
  })

  if (!saque) {
    throw new Error('Saque não encontrado')
  }

  // Valida transições de status
  const transicoesValidas: Record<StatusSaque, StatusSaque[]> = {
    PENDENTE: ['APROVADO', 'CANCELADO'],
    APROVADO: ['PAGO', 'CANCELADO'],
    PAGO: [],
    CANCELADO: [],
  }

  if (!transicoesValidas[saque.status].includes(status)) {
    throw new Error(
      `Transição de status inválida: ${saque.status} -> ${status}`
    )
  }

  return prisma.$transaction(async (tx) => {
    // Se está sendo pago, processa o saque
    if (status === 'PAGO') {
      await processarSaque(saque.socioId, Number(saque.valor))
    }

    // Atualiza o saque
    return tx.saque.update({
      where: { id },
      data: {
        status,
        dataPagamento: status === 'PAGO' ? new Date() : undefined,
      },
    })
  })
}

/**
 * Cancela um saque pendente
 */
export async function cancelarSaque(
  id: string,
  motivo?: string
): Promise<Saque> {
  const saque = await prisma.saque.findUnique({
    where: { id },
  })

  if (!saque) {
    throw new Error('Saque não encontrado')
  }

  if (saque.status !== 'PENDENTE' && saque.status !== 'APROVADO') {
    throw new Error('Apenas saques pendentes ou aprovados podem ser cancelados')
  }

  return prisma.saque.update({
    where: { id },
    data: {
      status: 'CANCELADO',
      motivo: motivo ? `${saque.motivo || ''} (Cancelado: ${motivo})` : saque.motivo,
    },
  })
}

/**
 * Obtém resumo de saques
 */
export async function obterResumoSaques(): Promise<{
  totalPendentes: number
  totalAprovados: number
  totalPagos: number
  valorTotalPendente: number
  valorTotalPago: number
}> {
  const [pendentes, aprovados, pagos] = await Promise.all([
    prisma.saque.findMany({ where: { status: 'PENDENTE' } }),
    prisma.saque.findMany({ where: { status: 'APROVADO' } }),
    prisma.saque.findMany({ where: { status: 'PAGO' } }),
  ])

  return {
    totalPendentes: pendentes.length,
    totalAprovados: aprovados.length,
    totalPagos: pagos.length,
    valorTotalPendente: [...pendentes, ...aprovados].reduce(
      (sum, s) => sum + Number(s.valor),
      0
    ),
    valorTotalPago: pagos.reduce((sum, s) => sum + Number(s.valor), 0),
  }
}
