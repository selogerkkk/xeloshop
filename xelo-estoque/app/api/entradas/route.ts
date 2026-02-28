import { NextResponse } from 'next/server'
import {
  listarEntradas,
  criarEntrada,
  type CreateEntradaInput,
} from '@/lib/services/entradaService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const estoqueId = searchParams.get('estoqueId') ?? undefined
    const tipo = searchParams.get('tipo') ?? undefined
    const dataInicio = searchParams.get('dataInicio')
      ? new Date(searchParams.get('dataInicio')!)
      : undefined
    const dataFim = searchParams.get('dataFim')
      ? new Date(searchParams.get('dataFim')!)
      : undefined

    const entradas = await listarEntradas({
      estoqueId,
      tipo: tipo as CreateEntradaInput['tipo'],
      dataInicio,
      dataFim,
    })

    return NextResponse.json(entradas)
  } catch (error) {
    console.error('Erro ao listar entradas:', error)
    return NextResponse.json(
      { error: 'Erro ao listar entradas' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      estoqueId,
      tipo,
      quantidade,
      custoUnitario,
      fornecedor,
      dataEntrada,
      pagamentos,
    } = body

    if (!estoqueId || !tipo || quantidade === undefined || custoUnitario === undefined || !pagamentos) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    if (!['COMPRA', 'REPOSICAO', 'TRANSFERENCIA', 'AJUSTE'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Use: COMPRA, REPOSICAO, TRANSFERENCIA ou AJUSTE' },
        { status: 400 }
      )
    }

    if (quantidade <= 0) {
      return NextResponse.json(
        { error: 'Quantidade deve ser maior que zero' },
        { status: 400 }
      )
    }

    if (custoUnitario < 0) {
      return NextResponse.json(
        { error: 'Custo unitário não pode ser negativo' },
        { status: 400 }
      )
    }

    if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
      return NextResponse.json(
        { error: 'É necessário informar pelo menos um pagamento' },
        { status: 400 }
      )
    }

    // Valida estrutura dos pagamentos
    for (const pagamento of pagamentos) {
      if (!pagamento.socioId || pagamento.percentual === undefined || pagamento.valor === undefined) {
        return NextResponse.json(
          { error: 'Cada pagamento deve ter socioId, percentual e valor' },
          { status: 400 }
        )
      }
    }

    const entrada = await criarEntrada({
      estoqueId,
      tipo,
      quantidade,
      custoUnitario,
      fornecedor,
      dataEntrada: dataEntrada ? new Date(dataEntrada) : undefined,
      pagamentos,
    })

    return NextResponse.json(entrada, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar entrada:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar entrada'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
