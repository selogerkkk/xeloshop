import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MAHORAGA v2 - Trading Dashboard',
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
        <main className="min-h-screen p-4 md:p-6 lg:p-8">
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-emerald-400 text-glow">
                  MAHORAGA v2
                </h1>
                <p className="text-gray-500 text-sm mt-1">Trading Portfolio Dashboard</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-emerald-500 font-mono">LIVE</span>
              </div>
            </div>
          </header>
          {children}
        </main>
      </body>
    </html>
  )
}
