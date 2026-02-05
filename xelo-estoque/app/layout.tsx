import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'XeloShop - Controle de Estoque',
  description: 'Sistema simples de controle de estoque e vendas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <main className="max-w-6xl mx-auto p-4">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-blue-600">📦 XeloShop</h1>
            <p className="text-gray-600">Controle de Estoque e Vendas</p>
          </header>
          {children}
        </main>
      </body>
    </html>
  )
}
