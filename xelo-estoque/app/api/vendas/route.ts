import { NextResponse } from 'next/server'
import { listarVendas, criarVenda, previewDistribuicao } from '@/lib/services/vendaService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const canal = searchParams.get('canal') ?? undefined
    const dataInicio = searchParams.get('dataInicio')
      ? new Date(searchParams.get('dataInicio')!)
      : undefined
    const dataFim = searchParams.get('dataFim')
      ? new Date(searchParams.get('dataFim')!)
      : undefined

    const vendas = await listarVendas({
      status: status as 'CONCLUIDA' | 'CANCELADA' | undefined,
      canal,
      dataInicio,
      dataFim,
    })

    return NextResponse.json(vendas)
  } catch (error) {
    console.error('Erro ao listar vendas:', error)
    return NextResponse.json(
      { error: 'Erro ao listar vendas' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { canal, itens, dataVenda, preview } = body

    if (!canal || !itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { error: 'Canal e pelo menos um item são obrigatórios' },
        { status: 400 }
      )
    }

    // Valida estrutura dos itens
    for (const item of itens) {
      if (!item.estoqueId || item.quantidade === undefined || item.precoUnitario === undefined) {
        return NextResponse.json(
          { error: 'Cada item deve ter estoqueId, quantidade e precoUnitario' },
          { status: 400 }
        )
      }
      if (item.quantidade <= 0) {
        return NextResponse.json(
          { error: 'Quantidade deve ser maior que zero' },
          { status: 400 }
        )
      }
      if (item.precoUnitario <= 0) {
        return NextResponse.json(
          { error: 'Preço unitário deve ser maior que zero' },
          { status: 400 }
        )
      }
    }

    // Se for preview, retorna a distribuição sem criar a venda
    if (preview) {
      const previewData = await previewDistribuicao(itens)
      return NextResponse.json(previewData)
    }

    const resultado = await criarVenda({
      canal,
      itens,
      dataVenda: dataVenda ? new Date(dataVenda) : undefined,
    })

    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar venda:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar venda'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
