import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const { nome, linkProduto, sku } = body

    if (typeof nome !== 'string' || !nome.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    // Validate and normalize optional fields
    const validatedLinkProduto =
      linkProduto !== null && linkProduto !== undefined
        ? typeof linkProduto === 'string'
          ? linkProduto.trim() || null
          : null
        : null

    const validatedSku =
      sku !== null && sku !== undefined
        ? typeof sku === 'string'
          ? sku.trim() || null
          : null
        : null

    const produto = await prisma.produtos.create({
      data: {
        nome: nome.trim(),
        linkProduto: validatedLinkProduto,
        sku: validatedSku,
      }
    })

    return NextResponse.json(produto, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    // Trata erro de SKU duplicado (unique constraint)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target as string[] | undefined
      if (target?.includes('sku')) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
      }
    }
    // Não expõe detalhes internos do erro
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}
