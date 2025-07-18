'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Send } from 'lucide-react'
import { motion } from 'framer-motion'

type FormularioSenha = {
  email: string
  codigo: string
  senha: string
  confirmarSenha: string
}

export default function NovaSenhaPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormularioSenha>()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviandoCodigo, setEnviandoCodigo] = useState(false)
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const router = useRouter()

  // Envia código OTP via e-mail
  const handleEnviarCodigo = async () => {
    setErro('')
    setCodigoEnviado(false)
    setEnviandoCodigo(true)
    const email = watch('email')

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErro('Digite um e-mail válido para receber o código.')
      setEnviandoCodigo(false)
      return
    }

    const resp = await fetch('/api/enviar-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await resp.json()
    if (data.ok) {
      setCodigoEnviado(true)
    } else {
      setErro(data.error || 'Erro ao enviar o código')
    }
    setEnviandoCodigo(false)
  }

  const onSubmit = async (data: FormularioSenha) => {
    setErro('')
    setCarregando(true)

    // 1. Valide o código OTP no backend com email
    const respValidacao = await fetch('/api/verificar-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, codigo: data.codigo }),
    })
    const validacao = await respValidacao.json()

    if (!validacao.ok) {
      setErro(validacao.error || 'Código inválido ou expirado')
      setCarregando(false)
      return
    }

    // 2. Troque a senha no Supabase Auth pelo backend
    const respReset = await fetch('/api/redefinir-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        codigo: data.codigo,
        senha: data.senha,
      }),
    })
    const reset = await respReset.json()

    if (!reset.ok) {
      setErro(reset.error || 'Erro ao redefinir a senha')
      setCarregando(false)
      return
    }

    setCarregando(false)
    router.push('/login')
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
          <h1 className="text-2xl font-bold text-pink-700 text-center">🎀 Nova Senha</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* E-mail */}
          <input
            {...register('email', {
              required: 'O e-mail é obrigatório.',
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: 'E-mail inválido.',
              },
            })}
            placeholder="Seu e-mail"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}

          {/* Código de verificação + botão de envio */}
          <div className="relative flex items-center gap-2">
          <input
            {...register('codigo', {
              required: 'Digite o código recebido no e-mail.',
              pattern: {
                value: /^\d{6}$/,
                message: 'O código deve ter 6 dígitos.',
              },
            })}
              placeholder="Digite o código de verificação"
              // ou:
              // placeholder="Código de verificação 👉"
              className="w-full border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          <button
            type="button"
            disabled={enviandoCodigo}
            onClick={handleEnviarCodigo}
            className="px-2.5 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-semibold flex items-center gap-1 text-sm hover:from-pink-600 hover:to-fuchsia-700 transition-all duration-300 ring-2 ring-pink-300 shadow"
            style={{ whiteSpace: 'nowrap' }}
          >
            {enviandoCodigo ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <>
                <Send size={14} /> Enviar código
              </>
            )}
          </button>
        </div>

          {errors.codigo && (
            <p className="text-red-500 text-sm">{errors.codigo.message}</p>
          )}
          {codigoEnviado && (
            <p className="text-green-600 text-sm">Código enviado para seu e-mail!</p>
          )}

          {/* Senha */}
          <div className="relative">
            <input
              {...register('senha', { required: 'A senha é obrigatória' })}
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Digite sua nova senha"
              className="w-full border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-zinc-500"
              onClick={() => setMostrarSenha(!mostrarSenha)}
            >
              {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {errors.senha && <p className="text-red-500 text-sm">{errors.senha.message}</p>}
          </div>

          {/* Confirmar senha */}
          <div className="relative">
            <input
              {...register('confirmarSenha', {
                required: 'Confirme a senha',
                validate: (value) => value === watch('senha') || 'As senhas não coincidem',
              })}
              type={mostrarConfirmar ? 'text' : 'password'}
              placeholder="Confirmar senha"
              className="w-full border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-zinc-500"
              onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
            >
              {mostrarConfirmar ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {errors.confirmarSenha && <p className="text-red-500 text-sm">{errors.confirmarSenha.message}</p>}
          </div>

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

          <motion.button
            type="submit"
            disabled={carregando}
            className={`relative flex items-center justify-center font-semibold py-3 rounded-full transition-all duration-300 overflow-hidden
              ${carregando ? 'bg-pink-500/60 cursor-wait' : 'bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700'}
              text-white shadow-lg ring-2 ring-pink-400 hover:scale-105`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10 tracking-wide">
              {carregando ? 'Salvando...' : 'Salvar nova senha'}
            </span>
          </motion.button>

          {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}
        </form>
      </div>
    </main>
  )
}
