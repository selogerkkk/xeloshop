import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterResumoVendas } from '@/lib/services/vendaService'
import { obterResumoEntradas } from '@/lib/services/entradaService'
import { obterResumoSaques } from '@/lib/services/saqueService'
import { obterResumoDistribuicoes } from '@/lib/services/distribuicaoService'
import { obterResumoDividas } from '@/lib/services/dividaService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') ?? '30' // dias
    const dias = parseInt(periodo)

    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - dias)

    const [
      resumoVendas,
      resumoEntradas,
      resumoSaques,
      resumoDistribuicoes,
      resumoDividas,
      estoquesAtivos,
      sociosAtivos,
    ] = await Promise.all([
      obterResumoVendas(dataInicio),
      obterResumoEntradas(dataInicio),
      obterResumoSaques(),
      obterResumoDistribuicoes(),
      obterResumoDividas(),
      prisma.estoque.count({ where: { ativo: true } }),
      prisma.socio.count({ where: { ativo: true } }),
    ])

    // Resumo por sócio
    const socios = await prisma.socio.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        cor: true,
        saldoDisponivel: true,
        saldoPendente: true,
        totalInvestido: true,
        totalRecebido: true,
        totalSacado: true,
      },
    })

    const resumoPorSocio = socios.map((s) => ({
      id: s.id,
      nome: s.nome,
      cor: s.cor,
      saldoDisponivel: Number(s.saldoDisponivel),
      saldoPendente: Number(s.saldoPendente),
      totalInvestido: Number(s.totalInvestido),
      totalRecebido: Number(s.totalRecebido),
      totalSacado: Number(s.totalSacado),
    }))

    // Resumo de estoques
    const estoques = await prisma.estoque.findMany({
      where: { ativo: true },
      include: {
        produto: {
          select: { nome: true },
        },
        cotas: {
          include: {
            socio: {
              select: { nome: true, cor: true },
            },
          },
        },
      },
    })

    const resumoEstoques = estoques.map((e) => ({
      id: e.id,
      nome: e.nome,
      tipo: e.tipo,
      produtoNome: e.produto.nome,
      quantidadeDisponivel: e.quantidadeDisponivel,
      quantidadeTotal: e.quantidadeTotal,
      custoMedio: Number(e.custoMedio),
      valorTotalInvestido: Number(e.valorTotalInvestido),
      cotas: e.cotas.map((c) => ({
        socioNome: c.socio.nome,
        socioCor: c.socio.cor,
        percentual: Number(c.percentual),
        valorInvestido: Number(c.valorInvestido),
      })),
    }))

    return NextResponse.json({
      periodo: dias,
      geral: {
        estoquesAtivos,
        sociosAtivos,
        vendas: resumoVendas,
        entradas: resumoEntradas,
        saques: resumoSaques,
        distribuicoes: resumoDistribuicoes,
        dividas: resumoDividas,
      },
      socios: resumoPorSocio,
      estoques: resumoEstoques,
    })
  } catch (error) {
    console.error('Erro ao buscar resumo do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar resumo do dashboard' },
      { status: 500 }
    )
  }
}
