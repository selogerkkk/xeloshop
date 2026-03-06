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

  return prisma.$transaction(async (tx) => {
    // Perform a conditional update on the socio to decrement saldoDisponivel
    // This atomic operation ensures that the balance is only decremented if sufficient funds exist
    const updateResult = await tx.socios.updateMany({
      where: {
        id: input.socioId,
        saldoDisponivel: {
          gte: input.valor,
        },
      },
      data: {
        saldoDisponivel: {
          decrement: input.valor,
        },
      },
    })

    // Verify the update affected exactly one row
    // If count is 0, either the socio doesn't exist or has insufficient balance
    if (updateResult.count === 0) {
      // Check if socio exists to provide appropriate error message
      const socio = await tx.socios.findUnique({
        where: { id: input.socioId },
        select: { id: true },
      })

      if (!socio) {
        throw new Error('Sócio não encontrado')
      }

      throw new Error('Saldo disponível insuficiente')
    }

    // Create the saque record within the same transaction
    // Both the balance decrement and saque creation commit together, preventing concurrent overdrafts
    return tx.saques.create({
      data: {
        id: crypto.randomUUID(),
        socioId: input.socioId,
        valor: input.valor,
        motivo: input.motivo,
        status: 'PENDENTE',
      },
    })
  })
}

/**
 * Atualiza o status de um saque
 * Revalida a transição dentro da transação para evitar pagamento em duplicidade
 */
export async function atualizarStatusSaque(
  id: string,
  status: StatusSaque
): Promise<saques> {
  const transicoesValidas: Record<StatusSaque, StatusSaque[]> = {
    PENDENTE: ['APROVADO', 'CANCELADO'],
    APROVADO: ['PAGO', 'CANCELADO'],
    PAGO: [],
    CANCELADO: [],
  }

  return prisma.$transaction(async (tx) => {
    // Re-lê o saque DENTRO da transação para garantir estado atual
    const saque = await tx.saques.findUnique({
      where: { id },
    })

    if (!saque) {
      throw new Error('Saque não encontrado')
    }

    // Valida transição de status dentro da transação
    if (!transicoesValidas[saque.status].includes(status)) {
      throw new Error(
        `Transição de status inválida: ${saque.status} -> ${status}`
      )
    }

    // Se está sendo pago, processa o saque
    if (status === 'PAGO') {
      await processarSaque(saque.socioId, Number(saque.valor), tx)
    }

    // Usa updateMany com CAS para garantir que só atualiza se status não mudou
    const atualizado = await tx.saques.updateMany({
      where: { id, status: saque.status },
      data: {
        status,
        dataPagamento: status === 'PAGO' ? new Date() : undefined,
      },
    })

    if (atualizado.count === 0) {
      throw new Error('Status do saque foi alterado por outra operação. Tente novamente.')
    }

    return tx.saques.findUniqueOrThrow({ where: { id } })
  })
}

/**
 * Cancela um saque pendente
 */
export async function cancelarSaque(
  id: string,
  motivo?: string
): Promise<saques> {
  // First, read the current saque to build the motivo string
  const saque = await prisma.saques.findUnique({
    where: { id },
  })

  if (!saque) {
    throw new Error('Saque não encontrado')
  }

  // Build the motivo string before the atomic update
  const motivoCancelado = motivo
    ? `${saque.motivo || ''} (Cancelado: ${motivo})`
    : saque.motivo

  // Perform an atomic conditional update (CAS) - only update if status is PENDENTE or APROVADO
  const resultado = await prisma.saques.updateMany({
    where: {
      id,
      OR: [{ status: 'PENDENTE' }, { status: 'APROVADO' }],
    },
    data: {
      status: 'CANCELADO',
      motivo: motivoCancelado,
    },
  })

  // If no rows were updated, the saque either doesn't exist or has an invalid status
  if (resultado.count === 0) {
    // Re-check to provide appropriate error message
    const saqueAtualizado = await prisma.saques.findUnique({
      where: { id },
    })

    if (!saqueAtualizado) {
      throw new Error('Saque não encontrado')
    }

    throw new Error('Apenas saques pendentes ou aprovados podem ser cancelados')
  }

  // Return the updated saque
  return prisma.saques.findUniqueOrThrow({
    where: { id },
  })
}

/**
 * Obtém resumo de saques
 */
export async function obterResumoSaques(
  dataInicio?: Date,
  dataFim?: Date
): Promise<{
  totalPendentes: number
  totalAprovados: number
  totalPagos: number
  valorTotalPendente: number
  valorTotalPago: number
}> {
  const whereClause = {
    dataSolicitacao: {
      gte: dataInicio,
      lte: dataFim,
    },
  }

  const [pendentes, aprovados, pagos] = await Promise.all([
    prisma.saques.aggregate({
      where: { ...whereClause, status: 'PENDENTE' },
      _count: { id: true },
      _sum: { valor: true },
    }),
    prisma.saques.aggregate({
      where: { ...whereClause, status: 'APROVADO' },
      _count: { id: true },
      _sum: { valor: true },
    }),
    prisma.saques.aggregate({
      where: { ...whereClause, status: 'PAGO' },
      _count: { id: true },
      _sum: { valor: true },
    }),
  ])

  return {
    totalPendentes: pendentes._count.id,
    totalAprovados: aprovados._count.id,
    totalPagos: pagos._count.id,
    valorTotalPendente:
      (Number(pendentes._sum.valor) || 0) + (Number(aprovados._sum.valor) || 0),
    valorTotalPago: Number(pagos._sum.valor) || 0,
  }
}
