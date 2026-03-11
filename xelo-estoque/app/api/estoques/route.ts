import { NextResponse } from 'next/server'
import {
  listarEstoques,
  criarEstoque,
  type CreateEstoqueInput,
} from '@/lib/services/estoqueService'

// Valid TipoEstoque values from the Prisma enum
const VALID_TIPO_VALUES = ['INDIVIDUAL', 'POOL'] as const
type TipoEstoque = typeof VALID_TIPO_VALUES[number]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const produtoId = searchParams.get('produtoId') ?? undefined
    const tipoParam = searchParams.get('tipo')
    const ativo = searchParams.get('ativo')

    // Validate tipo parameter if provided
    let tipo: CreateEstoqueInput['tipo'] | undefined = undefined
    if (tipoParam !== null) {
      if (!VALID_TIPO_VALUES.includes(tipoParam as TipoEstoque)) {
        return NextResponse.json(
          { error: 'Tipo deve ser INDIVIDUAL ou POOL' },
          { status: 400 }
        )
      }
      tipo = tipoParam as CreateEstoqueInput['tipo']
    }

    const estoques = await listarEstoques({
      produtoId,
      tipo,
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
  let body: unknown

  try {
    body = await request.json()
  } catch (error) {
    return NextResponse.json(
      { error: 'JSON malformado no corpo da requisição' },
      { status: 400 }
    )
  }

  // Verify body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Corpo da requisição deve ser um objeto' },
      { status: 400 }
    )
  }

  const { produtoId, nome, tipo, localFisico } = body as Record<string, unknown>

  // Type and structural validations
  if (typeof produtoId !== 'string' || produtoId.trim() === '') {
    return NextResponse.json(
      { error: 'produtoId é obrigatório e deve ser uma string não vazia' },
      { status: 400 }
    )
  }

  if (typeof nome !== 'string' || nome.trim() === '') {
    return NextResponse.json(
      { error: 'nome é obrigatório e deve ser uma string não vazia' },
      { status: 400 }
    )
  }

  if (typeof tipo !== 'string' || tipo.trim() === '') {
    return NextResponse.json(
      { error: 'tipo é obrigatório e deve ser uma string não vazia' },
      { status: 400 }
    )
  }

  // Enum validation for tipo
  if (tipo !== 'INDIVIDUAL' && tipo !== 'POOL') {
    return NextResponse.json(
      { error: 'Tipo deve ser INDIVIDUAL ou POOL' },
      { status: 400 }
    )
  }

  // Validate localFisico is either undefined or a non-empty string
  if (localFisico !== undefined && (typeof localFisico !== 'string' || localFisico.trim() === '')) {
    return NextResponse.json(
      { error: 'localFisico deve ser uma string não vazia quando fornecido' },
      { status: 400 }
    )
  }

  try {
    const estoque = await criarEstoque({
      produtoId,
      nome,
      tipo: tipo as 'INDIVIDUAL' | 'POOL',
      localFisico,
    })

    return NextResponse.json(estoque, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar estoque:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar estoque'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
