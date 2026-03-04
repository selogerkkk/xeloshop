import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const todos = searchParams.get('todos') === 'true'

    // Move o filtro para a query do Prisma (mais eficiente)
    const produtos = await prisma.produtos.findMany({
      where: todos ? undefined : { ativo: true },
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

    return NextResponse.json(produtos)
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    // Não expõe detalhes internos do erro
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const { nome, linkProduto, sku } = body

    if (typeof nome !== 'string' || !nome.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const produto = await prisma.produtos.create({
      data: {
        nome: nome.trim(),
        linkProduto: linkProduto || null,
        sku: sku || null,
      }
    })

    return NextResponse.json(produto, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    // Não expõe detalhes internos do erro
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}
