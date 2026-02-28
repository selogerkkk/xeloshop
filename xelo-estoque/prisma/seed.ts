import { PrismaClient, TipoSocio } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Criar sócios iniciais: Nato, Ruan e Empresa
  const socios = await Promise.all([
    prisma.socios.upsert({
      where: { id: 'nato-id' },
      update: {},
      create: {
        id: 'nato-id',
        nome: 'Nato',
        tipo: TipoSocio.PESSOA,
        cor: '#3B82F6', // Azul
        ativo: true,
        saldoDisponivel: 0,
        saldoPendente: 0,
        totalInvestido: 0,
        totalRecebido: 0,
        totalSacado: 0,
      },
    }),
    prisma.socios.upsert({
      where: { id: 'ruan-id' },
      update: {},
      create: {
        id: 'ruan-id',
        nome: 'Ruan',
        tipo: TipoSocio.PESSOA,
        cor: '#10B981', // Verde
        ativo: true,
        saldoDisponivel: 0,
        saldoPendente: 0,
        totalInvestido: 0,
        totalRecebido: 0,
        totalSacado: 0,
      },
    }),
    prisma.socios.upsert({
      where: { id: 'empresa-id' },
      update: {},
      create: {
        id: 'empresa-id',
        nome: 'Empresa',
        tipo: TipoSocio.EMPRESA,
        cor: '#6B7280', // Cinza
        ativo: true,
        saldoDisponivel: 0,
        saldoPendente: 0,
        totalInvestido: 0,
        totalRecebido: 0,
        totalSacado: 0,
      },
    }),
  ])

  console.log(`✅ Criados ${socios.length} sócios:`)
  socios.forEach(s => console.log(`   - ${s.nome} (${s.tipo})`))

  console.log('🌱 Seed completado!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
