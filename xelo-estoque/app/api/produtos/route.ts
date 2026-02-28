import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const todos = searchParams.get('todos') === 'true'

    const produtos = await prisma.produto.findMany({
      include: {
        estoques: {
          select: {
            id: true,
            nome: true,
            tipo: true,
            quantidadeDisponivel: true,
            quantidadeTotal: true,
            ativo: true,
          },
        },
      },
      orderBy: {
        atualizadoEm: 'desc'
      }
    })

    // Filtra no JavaScript se não quiser mostrar inativos
    const produtosFiltrados = todos
      ? produtos
      : produtos.filter(p => p.ativo !== false)

    return NextResponse.json(produtosFiltrados)
  } catch (error: any) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json({ error: 'Erro ao buscar produtos', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, linkProduto, sku } = body

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const produto = await prisma.produto.create({
      data: {
        nome,
        linkProduto: linkProduto || null,
        sku: sku || null,
      }
    })

    return NextResponse.json(produto, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar produto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
