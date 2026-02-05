import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Busca a venda primeiro pra saber a quantidade
    const venda = await prisma.venda.findUnique({
      where: { id: params.id }
    })

    if (!venda) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }

    // Apaga a venda e devolve a quantidade ao estoque em transação
    await prisma.$transaction([
      prisma.venda.delete({
        where: { id: params.id }
      }),
      prisma.produto.update({
        where: { id: venda.produtoId },
        data: {
          quantidade: {
            increment: venda.quantidade
          }
        }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir venda:', error)
    return NextResponse.json({ error: 'Erro ao excluir venda' }, { status: 500 })
  }
}
