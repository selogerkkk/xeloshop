import { NextResponse } from 'next/server'
import { buscarVendaPorId } from '@/lib/services/vendaService'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const venda = await buscarVendaPorId(id)

    if (!venda) {
      return NextResponse.json(
        { error: 'Venda não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(venda)
  } catch (error) {
    console.error('Erro ao buscar venda:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar venda' },
      { status: 500 }
    )
  }
}
