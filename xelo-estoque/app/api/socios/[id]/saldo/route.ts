import { NextResponse } from 'next/server'
import { obterSaldoDetalhado } from '@/lib/services/socioService'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const saldo = await obterSaldoDetalhado(id)

    return NextResponse.json(saldo)
  } catch (error) {
    console.error('Erro ao buscar saldo:', error)
    const message = error instanceof Error ? error.message : 'Erro ao buscar saldo'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
