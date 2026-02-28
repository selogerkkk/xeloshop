import { NextResponse } from 'next/server'
import {
  listarEstoques,
  criarEstoque,
  type CreateEstoqueInput,
} from '@/lib/services/estoqueService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const produtoId = searchParams.get('produtoId') ?? undefined
    const tipo = searchParams.get('tipo') ?? undefined
    const ativo = searchParams.get('ativo')

    const estoques = await listarEstoques({
      produtoId,
      tipo: tipo as CreateEstoqueInput['tipo'],
      ativo: ativo === 'true' ? true : ativo === 'false' ? false : undefined,
    })

    return NextResponse.json(estoques)
  } catch (error) {
    console.error('Erro ao listar estoques:', error)
    return NextResponse.json(
      { error: 'Erro ao listar estoques' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { produtoId, nome, tipo, localFisico } = body

    if (!produtoId || !nome || !tipo) {
      return NextResponse.json(
        { error: 'Dados incompletos. produtoId, nome e tipo são obrigatórios' },
        { status: 400 }
      )
    }

    if (tipo !== 'INDIVIDUAL' && tipo !== 'POOL') {
      return NextResponse.json(
        { error: 'Tipo deve ser INDIVIDUAL ou POOL' },
        { status: 400 }
      )
    }

    const estoque = await criarEstoque({
      produtoId,
      nome,
      tipo,
      localFisico,
    })

    return NextResponse.json(estoque, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar estoque:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar estoque'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
