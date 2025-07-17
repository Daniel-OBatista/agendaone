'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

type FormularioCadastro = {
  nome: string
  email: string
  senha: string
  telefone: string
}

export default function CadastroPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormularioCadastro>()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [telefoneExiste, setTelefoneExiste] = useState(false)
  const router = useRouter()

  const onSubmit = async (data: FormularioCadastro) => {
    setErro('')
    setTelefoneExiste(false)
    setCarregando(true)

    const { nome, email, senha, telefone } = data

    // Verifica se o telefone já está cadastrado
    const { data: usuarioExiste, error: erroVerificacao } = await supabase
      .from('users')
      .select('id')
      .eq('telefone', telefone)

    if (erroVerificacao) {
      setErro('Erro ao verificar o telefone.')
      setCarregando(false)
      return
    }

    if (usuarioExiste && usuarioExiste.length > 0) {
      setErro('Este telefone já está cadastrado.')
      setTelefoneExiste(true)
      setCarregando(false)
      return
    }

    // Cria conta no auth com e-mail fictício baseado no telefone
    const emailFalso = `${telefone.replace(/\D/g, '')}@exemplo.com`

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailFalso,
      password: senha,
    })

    if (authError || !authData.user) {
      setErro(authError?.message || 'Erro ao cadastrar.')
      setCarregando(false)
      return
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user?.id) {
      setErro('Confirme seu cadastro antes de continuar.')
      setCarregando(false)
      return
    }

    const user_id = userData.user.id

    const { error: erroInsert } = await supabase.from('users').insert([
      {
        id: user_id,
        nome,
        telefone,
        email: emailFalso,
        role: 'cliente',
      }
    ])

    if (erroInsert) {
      setErro(erroInsert.message)
    } else {
      router.push('/login')
    }

    setCarregando(false)
  }

  return (
    <main className="min-h-screen bg-pink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-sm border border-white/30 ring-2 ring-pink-300/30 p-6 rounded-3xl shadow-2xl">
        <div className="relative mb-6 flex justify-center items-center">
          <button
            onClick={() => router.push('/')}
            className="absolute left-0 text-pink-500 hover:text-pink-700 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-pink-700 text-center">🎀 Cadastro</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <input
            {...register('nome')}
            placeholder="Seu nome"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
          />
          <input
            {...register('telefone', {
              required: 'O telefone é obrigatório.',
              pattern: {
                value: /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/,
                message: 'Telefone inválido. Ex: 11 91234-5678',
              },
            })}
            placeholder="Telefone"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
          />
          {errors.telefone && (
            <p className="text-red-500 text-sm">{errors.telefone.message}</p>
          )}

          <input
            {...register('email', {
              required: 'O e-mail é obrigatório.',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'E-mail inválido',
              },
            })}
            type="email"
            placeholder="Seu e-mail"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}


          <input
            {...register('senha')}
            type="password"
            placeholder="Senha"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
          />

          {/* Barra de carregamento */}
          {carregando && (
            <motion.div
              className="h-1 w-full rounded-full overflow-hidden bg-pink-200 mb-2"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="h-full w-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-500"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
              />
            </motion.div>
          )}

          {/* Botão de cadastrar */}
          <motion.button
            type="submit"
            disabled={carregando}
            className={`relative flex items-center justify-center font-semibold py-2 rounded-full transition-all duration-300 overflow-hidden
              ${carregando ? 'bg-pink-500/60 cursor-wait' : 'bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700'}
              text-white shadow-lg ring-2 ring-pink-400 hover:scale-105`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10 tracking-wide">
              {carregando ? 'Cadastrando...' : 'Cadastrar'}
            </span>
          </motion.button>

          {/* Mensagem de erro */}
          {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}

          {/* Botão para redefinir senha */}
          <motion.button
            type="button"
            onClick={() => router.push('/redefinir-senha')}
            className="relative flex items-center justify-center font-semibold py-2 rounded-full transition-all duration-300 overflow-hidden bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white shadow-lg ring-2 ring-pink-400 hover:scale-105"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10 tracking-wide">🔐 Redefinir senha</span>
          </motion.button>
        </form>
      </div>
    </main>
  )
}
