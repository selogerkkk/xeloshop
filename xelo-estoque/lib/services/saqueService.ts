import { prisma } from '@/lib/prisma'
import type { StatusSaque, saques } from '@prisma/client'
import { processarSaque } from './socioService'

export interface CreateSaqueInput {
  socioId: string
  valor: number
  motivo?: string
}

export interface UpdateSaqueInput {
  status: StatusSaque
}

export interface SaqueDetalhado extends saques {
  socios: {
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
  return prisma.saques.findMany({
    where: {
      socioId: filtros?.socioId,
      status: filtros?.status,
    },
    include: {
      socios: {
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
  return prisma.saques.findUnique({
    where: { id },
    include: {
      socios: {
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
export async function criarSaque(input: CreateSaqueInput): Promise<saques> {
  if (input.valor <= 0) {
    throw new Error('Valor deve ser maior que zero')
  }

  const socio = await prisma.socios.findUnique({
    where: { id: input.socioId },
  })

  if (!socio) {
    throw new Error('Sócio não encontrado')
  }

  if (Number(socio.saldoDisponivel) < input.valor) {
    throw new Error('Saldo disponível insuficiente')
  }

  return prisma.saques.create({
    data: {
      id: crypto.randomUUID(),
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
): Promise<saques> {
  const saque = await prisma.saques.findUnique({
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
    // Se está sendo pago, processa o saque (passando transaction client)
    if (status === 'PAGO') {
      await processarSaque(saque.socioId, Number(saque.valor), tx)
    }

    // Atualiza o saque
    return tx.saques.update({
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
): Promise<saques> {
  const saque = await prisma.saques.findUnique({
    where: { id },
  })

  if (!saque) {
    throw new Error('Saque não encontrado')
  }

  if (saque.status !== 'PENDENTE' && saque.status !== 'APROVADO') {
    throw new Error('Apenas saques pendentes ou aprovados podem ser cancelados')
  }

  return prisma.saques.update({
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
    prisma.saques.findMany({ where: { status: 'PENDENTE' } }),
    prisma.saques.findMany({ where: { status: 'APROVADO' } }),
    prisma.saques.findMany({ where: { status: 'PAGO' } }),
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
