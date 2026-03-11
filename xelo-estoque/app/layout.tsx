import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { ReactQueryProvider } from '@/providers/react-query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Xeloshop - Controle de Estoque',
  description: 'Sistema profissional de controle de estoque e vendas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} min-h-screen bg-black`}>
        <ReactQueryProvider>
          <main className="min-h-screen">
            <Header />
            {children}
          </main>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
