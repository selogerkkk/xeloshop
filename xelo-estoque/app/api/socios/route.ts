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
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'JSON inválido no corpo da requisição' },
        { status: 400 }
      )
    }

    const { nome, tipo, cor } = body

    // Validate nome is a non-empty string
    if (typeof nome !== 'string' || nome.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório e deve ser uma string não vazia' },
        { status: 400 }
      )
    }

    // Validate tipo is a string and exactly 'PESSOA' or 'EMPRESA'
    if (typeof tipo !== 'string' || (tipo !== 'PESSOA' && tipo !== 'EMPRESA')) {
      return NextResponse.json(
        { error: 'Tipo é obrigatório e deve ser PESSOA ou EMPRESA' },
        { status: 400 }
      )
    }

    // Validate cor is a non-empty string
    if (typeof cor !== 'string' || cor.trim() === '') {
      return NextResponse.json(
        { error: 'Cor é obrigatória e deve ser uma string não vazia' },
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
