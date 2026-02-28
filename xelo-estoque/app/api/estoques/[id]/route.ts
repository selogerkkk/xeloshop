import { NextResponse } from 'next/server'
import {
  buscarEstoquePorId,
  atualizarEstoque,
  excluirEstoque,
} from '@/lib/services/estoqueService'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params
    const estoque = await buscarEstoquePorId(id)

    if (!estoque) {
      return NextResponse.json(
        { error: 'Estoque não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(estoque)
  } catch (error) {
    console.error('Erro ao buscar estoque:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estoque' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params
    const body = await request.json()
    const { nome, localFisico, ativo } = body

    const estoque = await atualizarEstoque(id, {
      nome,
      localFisico,
      ativo,
    })

    return NextResponse.json(estoque)
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error)
    const message =
      error instanceof Error ? error.message : 'Erro ao atualizar estoque'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params
    await excluirEstoque(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir estoque:', error)
    const message =
      error instanceof Error ? error.message : 'Erro ao excluir estoque'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
