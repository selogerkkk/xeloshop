import { NextResponse } from 'next/server'
import { buscarSocioPorId, atualizarSocio } from '@/lib/services/socioService'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params
    const socio = await buscarSocioPorId(id)

    if (!socio) {
      return NextResponse.json(
        { error: 'Sócio não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(socio)
  } catch (error) {
    console.error('Erro ao buscar sócio:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar sócio' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params
    const body = await request.json()
    const { nome, cor, ativo } = body

    const socio = await atualizarSocio(id, {
      nome,
      cor,
      ativo,
    })

    return NextResponse.json(socio)
  } catch (error) {
    console.error('Erro ao atualizar sócio:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar sócio' },
      { status: 500 }
    )
  }
}
