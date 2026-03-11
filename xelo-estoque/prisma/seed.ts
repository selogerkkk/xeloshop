import { PrismaClient, TipoSocio } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Criar usuários para login (senha: 'password')
  const passwordHash = await bcrypt.hash('password', 10)

  const usuarios = await Promise.all([
    prisma.usuarios.upsert({
      where: { email: 'nato@xeloshop.com' },
      update: {},
      create: {
        email: 'nato@xeloshop.com',
        passwordHash,
        nome: 'Nato',
        ativo: true,
      },
    }),
    prisma.usuarios.upsert({
      where: { email: 'ruan@xeloshop.com' },
      update: {},
      create: {
        email: 'ruan@xeloshop.com',
        passwordHash,
        nome: 'Ruan',
        ativo: true,
      },
    }),
    prisma.usuarios.upsert({
      where: { email: 'empresa@xeloshop.com' },
      update: {},
      create: {
        email: 'empresa@xeloshop.com',
        passwordHash,
        nome: 'Empresa',
        ativo: true,
      },
    }),
  ])

  console.log(`✅ Criados ${usuarios.length} usuários:`)
  for (const u of usuarios) {
    console.log(`   - ${u.nome} (${u.email})`)
  }

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
  for (const s of socios) {
    console.log(`   - ${s.nome} (${s.tipo})`)
  }

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
