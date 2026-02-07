'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body = isLogin 
        ? { email: form.email, password: form.password }
        : { nome: form.nome, email: form.email, password: form.password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError(data.error || 'Erro ao autenticar')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background - orbs floating freely across entire screen */}
      <div className="absolute -top-[200px] -left-[200px] w-[600px] h-[600px] bg-emerald-500/25 rounded-full blur-3xl floating-orb-1" />
      <div className="absolute top-[10%] right-[5%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl floating-orb-2" />
      <div className="absolute bottom-[5%] left-[20%] w-[700px] h-[700px] bg-blue-500/15 rounded-full blur-3xl floating-orb-3" />
      <div className="absolute top-[60%] right-[15%] w-[400px] h-[400px] bg-emerald-400/20 rounded-full blur-3xl floating-orb-4" />
      <div className="absolute top-[40%] -left-[100px] w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-3xl floating-orb-5" />
      <div className="absolute -bottom-[100px] right-[10%] w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-3xl floating-orb-6" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/30 mb-6 relative">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-pulse" />
            <svg 
              className="w-10 h-10 text-emerald-400 relative z-10" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-label="Lock icon"
            >
              <title>Lock icon</title>
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-white to-purple-400 bg-clip-text text-transparent">
            XELO ESTOQUE
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-mono">
            SISTEMA DE GERENCIAMENTO
          </p>
        </div>

        {/* Form container */}
        <div className="glass-card p-8 relative overflow-hidden">
          {/* Top glow line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          
          {/* Tab switcher */}
          <div className="flex mb-8 relative">
            <button 
              type="button"
              className={`flex-1 pb-2 text-center cursor-pointer transition-colors bg-transparent border-none ${
                isLogin ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setIsLogin(true)}
            >
              <span className="text-sm font-medium tracking-wider">LOGIN</span>
            </button>
            <button 
              type="button"
              className={`flex-1 pb-2 text-center cursor-pointer transition-colors bg-transparent border-none ${
                !isLogin ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setIsLogin(false)}
            >
              <span className="text-sm font-medium tracking-wider">CADASTRAR</span>
            </button>
            <div 
              className="absolute bottom-0 h-0.5 bg-emerald-500 transition-all duration-300"
              style={{ 
                width: '50%', 
                left: isLogin ? '0%' : '50%' 
              }}
            />
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="nome" className="text-xs uppercase tracking-wider text-gray-400">Nome</label>
                <div className="relative">
                <div className="input-icon">
                  <svg aria-label="User icon" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <title>User icon</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="nome"
                  type="text"
                  required
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  className="input-with-icon w-full"
                  placeholder="Seu nome"
                />
              </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-400">Email</label>
              <div className="relative">
                <div className="input-icon">
                  <svg aria-label="Email icon" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <title>Email icon</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="input-with-icon w-full"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs uppercase tracking-wider text-gray-400">Senha</label>
              <div className="relative">
                <div className="input-icon">
                  <svg aria-label="Password icon" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <title>Password icon</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="input-with-icon w-full"
                  placeholder="••••••"
                />
              </div>
              {!isLogin && (
                <p className="text-[10px] text-gray-500">Mínimo 6 caracteres</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-6 relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-white/10 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">Processando...</span>
                </span>
              ) : (
                <span className="text-sm font-medium tracking-wider">
                  {isLogin ? 'ENTRAR' : 'CRIAR CONTA'}
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sistema seguro</span>
              </div>
              <span>•</span>
              <span>JWT Auth</span>
              <span>•</span>
              <span>SSL</span>
            </div>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-[10px] text-gray-600 mt-6 font-mono">
          v1.0.0 • XELO SYSTEMS
        </p>
      </div>
    </div>
  )
}