import { NextResponse } from 'next/server'
import { listarSocios, criarSocio } from '@/lib/services/socioService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ativo = searchParams.get('ativo')

    const socios = await listarSocios(
      ativo === 'true' ? true : ativo === 'false' ? false : undefined
    )

    return NextResponse.json(socios)
  } catch (error) {
    console.error('Erro ao listar sócios:', error)
    return NextResponse.json(
      { error: 'Erro ao listar sócios' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, tipo, cor } = body

    if (!nome || !tipo || !cor) {
      return NextResponse.json(
        { error: 'Nome, tipo e cor são obrigatórios' },
        { status: 400 }
      )
    }

    if (tipo !== 'PESSOA' && tipo !== 'EMPRESA') {
      return NextResponse.json(
        { error: 'Tipo deve ser PESSOA ou EMPRESA' },
        { status: 400 }
      )
    }

    const socio = await criarSocio({ nome, tipo, cor })

    return NextResponse.json(socio, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar sócio:', error)
    const message =
      error instanceof Error ? error.message : 'Erro ao criar sócio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
