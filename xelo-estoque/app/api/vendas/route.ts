import { NextResponse } from 'next/server'
import { listarVendas, criarVenda, previewDistribuicao } from '@/lib/services/vendaService'
import type { StatusVenda } from '@prisma/client'

const STATUS_VALIDOS: StatusVenda[] = ['CONCLUIDA', 'CANCELADA', 'PENDENTE']

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const canal = searchParams.get('canal') ?? undefined
    const dataInicioParam = searchParams.get('dataInicio')
    const dataFimParam = searchParams.get('dataFim')

    // Valida status
    let status: StatusVenda | undefined
    if (statusParam) {
      if (!STATUS_VALIDOS.includes(statusParam as StatusVenda)) {
        return NextResponse.json(
          { error: `Status inválido. Valores aceitos: ${STATUS_VALIDOS.join(', ')}` },
          { status: 400 }
        )
      }
      status = statusParam as StatusVenda
    }

    // Valida datas
    let dataInicio: Date | undefined
    if (dataInicioParam) {
      const parsed = new Date(dataInicioParam)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'dataInicio deve ser uma data válida' },
          { status: 400 }
        )
      }
      dataInicio = parsed
    }

    let dataFim: Date | undefined
    if (dataFimParam) {
      const parsed = new Date(dataFimParam)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'dataFim deve ser uma data válida' },
          { status: 400 }
        )
      }
      dataFim = parsed
    }

    const vendas = await listarVendas({
      status,
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
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Payload inválido' },
        { status: 400 }
      )
    }

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
      if (typeof item.quantidade !== 'number' || item.quantidade <= 0) {
        return NextResponse.json(
          { error: 'Quantidade deve ser um número maior que zero' },
          { status: 400 }
        )
      }
      if (typeof item.precoUnitario !== 'number' || item.precoUnitario <= 0) {
        return NextResponse.json(
          { error: 'Preço unitário deve ser um número maior que zero' },
          { status: 400 }
        )
      }
    }

    // Valida dataVenda se fornecida
    let dataVendaParsed: Date | undefined
    if (dataVenda) {
      dataVendaParsed = new Date(dataVenda)
      if (isNaN(dataVendaParsed.getTime())) {
        return NextResponse.json(
          { error: 'dataVenda deve ser uma data válida' },
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
      dataVenda: dataVendaParsed,
    })

    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar venda:', error)
    // Diferencia erro de cliente (400) de erro interno (500)
    const isClientError = error instanceof Error &&
      /insuficiente|não encontrad|inválid/i.test(error.message)

    const status = isClientError ? 400 : 500
    const message = isClientError ? (error as Error).message : 'Erro ao criar venda'

    return NextResponse.json({ error: message }, { status })
  }
}
