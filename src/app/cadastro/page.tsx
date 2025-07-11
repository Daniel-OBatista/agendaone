'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function CadastroPage() {
  const { register, handleSubmit } = useForm()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  const onSubmit = async (data: any) => {
    setErro('')
    setCarregando(true)

    const { nome, email, senha } = data

    // 1. Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
    })

    if (authError || !authData.user) {
      setErro(authError?.message || 'Erro ao cadastrar.')
      setCarregando(false)
      return
    }

    // Tenta pegar o ID diretamente do usuário autenticado
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
    <main className="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4 text-pink-700">Cadastro</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <input {...register('nome')} placeholder="Seu nome" className="border p-2 rounded" required />
        <input {...register('email')} type="email" placeholder="Email" className="border p-2 rounded" required />
        <input {...register('senha')} type="password" placeholder="Senha" className="border p-2 rounded" required />
        <button disabled={carregando} type="submit" className="bg-pink-500 text-white py-2 rounded hover:bg-pink-600">
          {carregando ? 'Cadastrando...' : 'Cadastrar'}
        </button>
        {erro && <p className="text-red-500 text-sm">{erro}</p>}
      </form>
    </main>
  )
}
