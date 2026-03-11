import { NextResponse } from 'next/server'
import { listarSaques, criarSaque } from '@/lib/services/saqueService'
import type { StatusSaque } from '@prisma/client'

const STATUS_VALIDOS: StatusSaque[] = ['PENDENTE', 'APROVADO', 'PAGO', 'CANCELADO']

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const socioId = searchParams.get('socioId') ?? undefined
    const statusParam = searchParams.get('status')

    // Valida status
    let status: StatusSaque | undefined
    if (statusParam) {
      if (!STATUS_VALIDOS.includes(statusParam as StatusSaque)) {
        return NextResponse.json(
          { error: `Status inválido. Valores aceitos: ${STATUS_VALIDOS.join(', ')}` },
          { status: 400 }
        )
      }
      status = statusParam as StatusSaque
    }

    const saques = await listarSaques({
      socioId,
      status,
    })

    return NextResponse.json(saques)
  } catch (error) {
    console.error('Erro ao listar saques:', error)
    return NextResponse.json(
      { error: 'Erro ao listar saques' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Payload inválido' },
        { status: 400 }
      )
    }

    const { socioId, valor, motivo } = body

    if (!socioId || valor === undefined) {
      return NextResponse.json(
        { error: 'Sócio e valor são obrigatórios' },
        { status: 400 }
      )
    }

    // Normaliza e valida valor como número
    const valorNumerico = typeof valor === 'string' ? parseFloat(valor) : Number(valor)
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      return NextResponse.json(
        { error: 'Valor deve ser um número maior que zero' },
        { status: 400 }
      )
    }

    const saque = await criarSaque({ socioId, valor: valorNumerico, motivo })

    return NextResponse.json(saque, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar saque:', error)
    // Diferencia erro de cliente (400) de erro interno (500)
    const isClientError = error instanceof Error &&
      /insuficiente|não encontrad|inválid/i.test(error.message)

    const status = isClientError ? 400 : 500
    const message = isClientError ? (error as Error).message : 'Erro ao criar saque'

    return NextResponse.json({ error: message }, { status })
  }
}
