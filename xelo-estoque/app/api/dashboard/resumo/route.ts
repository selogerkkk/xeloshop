import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { obterResumoVendas } from '@/lib/services/vendaService'

// Tipo inferido do Prisma para estoque com relações
 type EstoqueComRelacoes = Prisma.estoquesGetPayload<{
  include: {
    produtos: { select: { nome: true } }
    cotas: {
      include: {
        socios: { select: { nome: true; cor: true } }
      }
    }
  }
}>
import { obterResumoEntradas } from '@/lib/services/entradaService'
import { obterResumoSaques } from '@/lib/services/saqueService'
import { obterResumoDistribuicoes } from '@/lib/services/distribuicaoService'
import { obterResumoDividas } from '@/lib/services/dividaService'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: Request) {
  // Authorization check
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    )
  }

  // TODO: Check role (admin/finance) once roles are added to UserPayload
  // For now, all authenticated users can access
  // In future: if user.role not in ['admin', 'finance'], filter by user.id

  try {
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') ?? '30' // dias
    let dias = Number.parseInt(periodo, 10) // Explicit base 10

    // Validate and clamp
    if (!Number.isFinite(dias) || dias < 1) {
      // Default to 30 if invalid
      dias = 30
    } else if (dias > 365) {
      // Cap at 1 year
      dias = 365
    }

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
      obterResumoSaques(dataInicio),
      obterResumoDistribuicoes(dataInicio),
      obterResumoDividas(dataInicio),
      prisma.estoques.count({ where: { ativo: true } }),
      prisma.socios.count({ where: { ativo: true } }),
    ])

    // Resumo por sócio (limitado a 50)
    const socios = await prisma.socios.findMany({
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
      take: 50,
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

    // Resumo de estoques (limitado a 50)
    const estoques = await prisma.estoques.findMany({
      where: { ativo: true },
      include: {
        produtos: {
          select: { nome: true },
        },
        cotas: {
          include: {
            socios: {
              select: { nome: true, cor: true },
            },
          },
        },
      },
      take: 50,
    })

    const resumoEstoques = estoques.map((e: EstoqueComRelacoes) => ({
      id: e.id,
      nome: e.nome,
      tipo: e.tipo,
      produtoNome: e.produtos.nome,
      quantidadeDisponivel: e.quantidadeDisponivel,
      quantidadeTotal: e.quantidadeTotal,
      custoMedio: Number(e.custoMedio),
      valorTotalInvestido: Number(e.valorTotalInvestido),
      cotas: e.cotas.map((c) => ({
        socioNome: c.socios.nome,
        socioCor: c.socios.cor,
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
