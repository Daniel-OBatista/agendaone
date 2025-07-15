'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

type FormularioLogin = {
  email: string
  senha: string
}

export default function LoginPage() {
  const { register, handleSubmit } = useForm<FormularioLogin>()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  const onSubmit = async (data: FormularioLogin) => {
    setErro('')
    setCarregando(true)

    const { email, senha } = data

    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error || !loginData.session) {
      setErro(error?.message || 'Erro ao fazer login.')
      setCarregando(false)
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const { data: perfil } = await supabase
      .from('users')
      .select('role')
      .eq('id', userData.user?.id)
      .single()

    if (perfil?.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/cliente')
    }
  }

  return (
    <main className="min-h-screen bg-pink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow-md">
        {/* Cabeçalho com botão e título centralizado */}
        <div className="relative mb-6 flex justify-center items-center">
          {/* Botão absoluto alinhado à esquerda */}
          <button
            onClick={() => router.push('/')}
            className="absolute left-0 text-pink-500 hover:text-pink-700 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} />
          </button>

          {/* Título centralizado na linha */}
          <h2 className="text-2xl font-bold text-pink-700 text-center">🎀 Login</h2>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <input
            {...register('email')}
            type="email"
            placeholder="Seu e-mail"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
          />
          <input
            {...register('senha')}
            type="password"
            placeholder="Senha"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
          />
          <button
            disabled={carregando}
            type="submit"
            className="bg-pink-500 text-white py-2 rounded hover:bg-pink-600 transition-colors"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
          {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}
        </form>
      </div>
    </main>
  )
}
