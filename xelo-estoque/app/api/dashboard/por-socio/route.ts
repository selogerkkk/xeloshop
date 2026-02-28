import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { distribuicoes_lucro, dividas_ajuste, saques } from '@prisma/client'

interface DistribuicaoComValor extends distribuicoes_lucro {
  valor: number
}

interface DividaComValorPendente extends dividas_ajuste {
  valorPendente: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const socioId = searchParams.get('socioId')

    if (!socioId) {
      return NextResponse.json(
        { error: 'socioId é obrigatório' },
        { status: 400 }
      )
    }

    const socio = await prisma.socios.findUnique({
      where: { id: socioId },
      include: {
        cotas: {
          include: {
            estoques: {
              include: {
                produtos: true,
              },
            },
          },
        },
        distribuicoes_lucro: {
          orderBy: { dataDistribuicao: 'desc' },
          take: 50,
        },
        saques: {
          orderBy: { dataSolicitacao: 'desc' },
          take: 20,
        },
        dividas_ajuste: {
          where: { status: 'ATIVA' },
        },
      },
    })

    if (!socio) {
      return NextResponse.json(
        { error: 'Sócio não encontrado' },
        { status: 404 }
      )
    }

    // Calcula totais
    const totalDistribuicoesPendentes = socio.distribuicoes_lucro
      .filter((d: DistribuicaoComValor) => d.status === 'PENDENTE')
      .reduce((sum: number, d: DistribuicaoComValor) => sum + Number(d.valor), 0)

    const totalDistribuicoesLiberadas = socio.distribuicoes_lucro
      .filter((d: DistribuicaoComValor) => d.status === 'LIBERADO')
      .reduce((sum: number, d: DistribuicaoComValor) => sum + Number(d.valor), 0)

    const totalDistribuicoesRetidas = socio.distribuicoes_lucro
      .filter((d: DistribuicaoComValor) => d.status === 'RETIDO')
      .reduce((sum: number, d: DistribuicaoComValor) => sum + Number(d.valor), 0)

    const totalDividas = socio.dividas_ajuste.reduce(
      (sum: number, d: DividaComValorPendente) => sum + Number(d.valorPendente),
      0
    )

    // Posições em estoques (cotas)
    const posicoes = socio.cotas.map((c) => ({
      estoqueId: c.estoqueId,
      estoqueNome: c.estoques.nome,
      tipo: c.estoques.tipo,
      produtoNome: c.estoques.produtos.nome,
      quantidadeEmEstoque: c.estoques.quantidadeDisponivel,
      percentual: Number(c.percentual),
      valorInvestido: Number(c.valorInvestido),
      valorAtual: Number(c.estoques.valorTotalInvestido) * (Number(c.percentual) / 100),
    }))

    return NextResponse.json({
      socio: {
        id: socio.id,
        nome: socio.nome,
        tipo: socio.tipo,
        cor: socio.cor,
        ativo: socio.ativo,
        saldoDisponivel: Number(socio.saldoDisponivel),
        saldoPendente: Number(socio.saldoPendente),
        totalInvestido: Number(socio.totalInvestido),
        totalRecebido: Number(socio.totalRecebido),
        totalSacado: Number(socio.totalSacado),
      },
      distribuicoes: {
        pendente: totalDistribuicoesPendentes,
        liberado: totalDistribuicoesLiberadas,
        retido: totalDistribuicoesRetidas,
        historicoRecente: socio.distribuicoes_lucro.map((d: DistribuicaoComValor) => ({
          id: d.id,
          valor: Number(d.valor),
          status: d.status,
          data: d.dataDistribuicao,
        })),
      },
      saques: {
        recentes: socio.saques.map((s: saques) => ({
          id: s.id,
          valor: Number(s.valor),
          status: s.status,
          dataSolicitacao: s.dataSolicitacao,
          dataPagamento: s.dataPagamento,
        })),
      },
      dividas: {
        total: totalDividas,
        items: socio.dividas_ajuste.map((d: DividaComValorPendente) => ({
          id: d.id,
          valorOriginal: Number(d.valorOriginal),
          valorPendente: Number(d.valorPendente),
          motivo: d.motivo,
          dataCriacao: d.dataCriacao,
        })),
      },
      posicoes,
    })
  } catch (error) {
    console.error('Erro ao buscar dados do sócio:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do sócio' },
      { status: 500 }
    )
  }
}
