import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const produtos = await prisma.produto.findMany({
      include: {
        _count: {
          select: { vendas: true }
        }
      },
      orderBy: {
        atualizadoEm: 'desc'
      }
    })
    return NextResponse.json(produtos)
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, custo, precoVenda, quantidade } = body

    if (!nome || custo === undefined || precoVenda === undefined || quantidade === undefined) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const produto = await prisma.produto.create({
      data: {
        nome,
        custo,
        precoVenda,
        quantidade: parseInt(quantidade)
      }
    })

    return NextResponse.json(produto)
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}
