import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const vendas = await prisma.venda.findMany({
      include: {
        produto: {
          select: {
            id: true,
            nome: true,
            custo: true
          }
        }
      },
      orderBy: {
        vendidoEm: 'desc'
      }
    })
    return NextResponse.json(vendas)
  } catch (error) {
    console.error('Erro ao buscar vendas:', error)
    return NextResponse.json({ error: 'Erro ao buscar vendas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { produtoId, quantidade, canal, precoReal, dataVenda } = body

    if (!produtoId || !quantidade || !canal || precoReal === undefined) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Verifica estoque
    const produto = await prisma.produto.findUnique({
      where: { id: produtoId }
    })

    if (!produto) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    if (produto.quantidade < quantidade) {
      return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 })
    }

    // Cria venda e atualiza estoque em transação
    const vendaData: {
      produtoId: string
      quantidade: number
      canal: string
      precoReal: number
      vendidoEm?: Date
    } = {
      produtoId,
      quantidade: Number.parseInt(quantidade),
      canal,
      precoReal
    }

    if (dataVenda) {
      vendaData.vendidoEm = new Date(dataVenda)
    }

    const [venda] = await prisma.$transaction([
      prisma.venda.create({
        data: vendaData
      }),
      prisma.produto.update({
        where: { id: produtoId },
        data: {
          quantidade: {
            decrement: Number.parseInt(quantidade)
          }
        }
      })
    ])

    return NextResponse.json(venda)
  } catch (error) {
    console.error('Erro ao criar venda:', error)
    return NextResponse.json({ error: 'Erro ao criar venda' }, { status: 500 })
  }
}
