'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'

type FormularioCadastro = {
  nome: string
  email: string
  senha: string
  telefone: string
}

export default function CadastroPage() {
  const { register, handleSubmit } = useForm<FormularioCadastro>()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  const onSubmit = async (data: FormularioCadastro) => {
    setErro('')
    setCarregando(true)

    const { nome, email, senha, telefone } = data

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
    })

    if (authError || !authData.user) {
      setErro(authError?.message || 'Erro ao cadastrar.')
      setCarregando(false)
      return
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user?.id) {
      setErro('Usuário não está autenticado. Confirme seu email antes de continuar.')
      setCarregando(false)
      return
    }

    const user_id = userData.user.id

    const { error: insertError } = await supabase.from('users').insert([
      {
        id: user_id,
        nome,
        telefone,
        email,
        role: 'cliente',
      },
    ])

    if (insertError) {
      setErro(insertError.message)
    } else {
      router.push('/login')
    }

    setCarregando(false)
  }

  return (
    <main className="min-h-screen bg-pink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow-md">
        <div className="mb-4">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm"
          >
            <Home size={18} />
            Início do Admin
          </button>
        </div>
        <h2 className="text-2xl font-bold text-pink-700 mb-6 text-center">🎀 Cadastro</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <input
            {...register('nome')}
            placeholder="Seu nome"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
          />
          <input
            {...register('telefone')}
            placeholder="Telefone (ex: 11 91234-5678)"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
          />
          <input
            {...register('email')}
            type="email"
            placeholder="Email"
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
            {carregando ? 'Cadastrando...' : 'Cadastrar'}
          </button>
          {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}
        </form>
      </div>
    </main>
  )
}
