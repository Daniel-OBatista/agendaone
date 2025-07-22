'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { motion } from 'framer-motion'

type FormularioCadastro = {
  nome: string
  email: string
  senha: string
  telefone: string
  codigo: string
}

// Função para padronizar telefone antes de salvar no banco
function formatarTelefone(telefone: string) {
  telefone = telefone.replace(/\D/g, '')
  telefone = telefone.startsWith('55') ? telefone : `55${telefone}`
  return `+${telefone}`
}

export default function CadastroPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormularioCadastro>()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviandoCodigo, setEnviandoCodigo] = useState(false)
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [emailExiste, setEmailExiste] = useState(false)
  const [telefoneExiste, setTelefoneExiste] = useState(false)
  const [emailTelefone, setEmailTelefone] = useState('')
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

  const onSubmit = async (data: FormularioCadastro) => {
    setErro('')
    setEmailExiste(false)
    setTelefoneExiste(false)
    setEmailTelefone('')
    setCarregando(true)

    const { nome, email, senha, telefone, codigo } = data
    const telefonePadrao = formatarTelefone(telefone)

    // 1. Valida o código OTP no backend
    const respValidacao = await fetch('/api/verificar-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, codigo }),
    })
    const validacao = await respValidacao.json()

    if (!validacao.ok) {
      setErro(validacao.error || 'Código inválido ou expirado')
      setCarregando(false)
      return
    }

    // 2. Verifica se o e-mail já está cadastrado
    const { data: usuarioExiste, error: erroVerificacao } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)

    if (erroVerificacao) {
      setErro('Erro ao verificar o e-mail.')
      setCarregando(false)
      return
    }

    if (usuarioExiste && usuarioExiste.length > 0) {
      setErro('Este e-mail já está cadastrado.')
      setEmailExiste(true)
      setCarregando(false)
      return
    }

    // 3. Verifica se o telefone já está cadastrado
    const { data: telExiste, error: erroTel } = await supabase
      .from('users')
      .select('email')
      .eq('telefone', telefonePadrao);

    if (erroTel) {
      setErro('Erro ao verificar o telefone.');
      setCarregando(false);
      return;
    }

    if (telExiste && telExiste.length > 0) {
      setErro('Este telefone já está cadastrado.');
      setTelefoneExiste(true);
      setEmailTelefone(telExiste[0].email);
      setCarregando(false);
      return;
    }

    // 4. Cria conta no auth com o email informado pelo usuário
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: senha,
    })

    if (authError || !authData.user) {
      setErro(authError?.message || 'Erro ao cadastrar.')
      setCarregando(false)
      return
    }

    const user_id = authData.user.id

    // 5. Salva na tabela users com email real e telefone formatado
    const { error: erroInsert } = await supabase.from('users').insert([{
      id: user_id,
      nome,
      telefone: telefonePadrao,
      email: email,
      role: 'cliente',
    }])

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
            {...register('nome', { required: 'Nome obrigatório' })}
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

          {/* E-mail + botão de código */}
          <div className="relative flex items-center gap-2">
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
              className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400 w-full"
              required
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
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}

          {/* Campo do código */}
          <input
            {...register('codigo', {
              required: 'Digite o código recebido no e-mail.',
              pattern: {
                value: /^\d{6}$/,
                message: 'O código deve ter 6 dígitos.',
              },
            })}
            placeholder="Código de verificação"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          {errors.codigo && (
            <p className="text-red-500 text-sm">{errors.codigo.message}</p>
          )}
          {codigoEnviado && (
            <p className="text-green-600 text-sm">Código enviado para seu e-mail!</p>
          )}

          <input
            {...register('senha', { required: 'Senha obrigatória' })}
            type="password"
            placeholder="Senha"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
          />

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

          {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}

          {emailExiste && (
            <motion.button
              type="button"
              onClick={() => router.push('/redefinir-senha')}
              className="relative flex items-center justify-center font-semibold py-2 rounded-full transition-all duration-300 overflow-hidden bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white shadow-lg ring-2 ring-pink-400 hover:scale-105 mt-2"
            >
              🔐 Redefinir senha
            </motion.button>
          )}

          {telefoneExiste && (
            <motion.button
              type="button"
              onClick={() => router.push(`/redefinir-senha?email=${encodeURIComponent(emailTelefone)}`)}
              className="relative flex items-center justify-center font-semibold py-2 rounded-full transition-all duration-300 overflow-hidden bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white shadow-lg ring-2 ring-pink-400 hover:scale-105 mt-2"
            >
              🔐 Redefinir senha para {emailTelefone}
            </motion.button>
          )}
        </form>
      </div>
    </main>
  )
}
