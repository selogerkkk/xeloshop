import { NextResponse } from 'next/server'
import { listarSaques, criarSaque } from '@/lib/services/saqueService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const socioId = searchParams.get('socioId') ?? undefined
    const status = searchParams.get('status') ?? undefined

    const saques = await listarSaques({
      socioId,
      status: status as 'PENDENTE' | 'APROVADO' | 'PAGO' | 'CANCELADO' | undefined,
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
    const body = await request.json()
    const { socioId, valor, motivo } = body

    if (!socioId || valor === undefined) {
      return NextResponse.json(
        { error: 'Sócio e valor são obrigatórios' },
        { status: 400 }
      )
    }

    if (valor <= 0) {
      return NextResponse.json(
        { error: 'Valor deve ser maior que zero' },
        { status: 400 }
      )
    }

    const saque = await criarSaque({ socioId, valor, motivo })

    return NextResponse.json(saque, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar saque:', error)
    const message =
      error instanceof Error ? error.message : 'Erro ao criar saque'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
