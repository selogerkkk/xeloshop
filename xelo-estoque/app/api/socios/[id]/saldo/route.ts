import { NextResponse } from 'next/server'
import { obterSaldoDetalhado } from '@/lib/services/socioService'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params
    const saldo = await obterSaldoDetalhado(id)

    return NextResponse.json(saldo)
  } catch (error) {
    console.error('Erro ao buscar saldo:', error)
    const message = error instanceof Error ? error.message : 'Erro ao buscar saldo'

    // Return 404 only for explicit "not found" errors
    if (error instanceof Error && error.message === 'Sócio não encontrado') {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    // For all other errors, return 500
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
