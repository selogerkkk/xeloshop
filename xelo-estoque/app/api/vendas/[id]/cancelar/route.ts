import { NextResponse } from 'next/server'
import { cancelarVenda } from '@/lib/services/vendaService'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = params
    const body = await request.json()
    const { motivo } = body

    if (!motivo) {
      return NextResponse.json(
        { error: 'Motivo do cancelamento é obrigatório' },
        { status: 400 }
      )
    }

    await cancelarVenda(id, motivo)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao cancelar venda:', error)
    const message = error instanceof Error ? error.message : 'Erro ao cancelar venda'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
