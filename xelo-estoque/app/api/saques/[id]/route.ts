import { NextResponse } from 'next/server'
import { atualizarStatusSaque, buscarSaquePorId } from '@/lib/services/saqueService'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const saque = await buscarSaquePorId(id)

    if (!saque) {
      return NextResponse.json(
        { error: 'Saque não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(saque)
  } catch (error) {
    console.error('Erro ao buscar saque:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar saque' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status é obrigatório' },
        { status: 400 }
      )
    }

    if (!['PENDENTE', 'APROVADO', 'PAGO', 'CANCELADO'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido. Use: PENDENTE, APROVADO, PAGO ou CANCELADO' },
        { status: 400 }
      )
    }

    const saque = await atualizarStatusSaque(id, status)

    return NextResponse.json(saque)
  } catch (error) {
    console.error('Erro ao atualizar saque:', error)
    const message = error instanceof Error ? error.message : 'Erro ao atualizar saque'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
