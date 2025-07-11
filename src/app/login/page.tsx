'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

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

    // Após login, verifica a role
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
    <main className="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4 text-pink-700">Login</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <input {...register('email')} type="email" placeholder="Email" className="border p-2 rounded" required />
        <input {...register('senha')} type="password" placeholder="Senha" className="border p-2 rounded" required />
        <button disabled={carregando} type="submit" className="bg-pink-500 text-white py-2 rounded hover:bg-pink-600">
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
        {erro && <p className="text-red-500 text-sm">{erro}</p>}
      </form>
    </main>
  )
}