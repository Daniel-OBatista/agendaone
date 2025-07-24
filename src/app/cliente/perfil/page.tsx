'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, User } from 'lucide-react'

type FormularioPerfil = {
  nome: string
  email: string
  telefone: string
}

export default function PerfilPage() {
  const [form, setForm] = useState<FormularioPerfil>({ nome: '', email: '', telefone: '' })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function fetchPerfil() {
      setCarregando(true)
      setErro('')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user?.id) {
        setErro('Você precisa estar logado.')
        setCarregando(false)
        return
      }
      const { data: usuario, error } = await supabase
        .from('users')
        .select('nome, email, telefone')
        .eq('id', userData.user.id)
        .single()
      if (error || !usuario) {
        setErro('Erro ao carregar perfil.')
      } else {
        setForm({
          nome: usuario.nome || '',
          email: usuario.email || '',
          telefone: usuario.telefone || ''
        })
      }
      setCarregando(false)
    }
    fetchPerfil()
  }, [])

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setCarregando(true)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.id) {
      setErro('Usuário não autenticado.')
      setCarregando(false)
      return
    }

    // Atualizar usuário
    const { error } = await supabase
      .from('users')
      .update({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone
      })
      .eq('id', userData.user.id)

    if (error) {
      setErro('Erro ao atualizar perfil: ' + error.message)
    } else {
      setSucesso('Perfil atualizado com sucesso!')
    }
    setCarregando(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-white flex justify-center items-center py-8 px-2">
      <div className="bg-white/80 rounded-2xl shadow-xl ring-2 ring-pink-200 max-w-md w-full p-8 flex flex-col gap-6 items-center">
        <div className="w-full flex items-center mb-4 relative">
          <button
            onClick={() => router.push('/cliente')}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow border-2 border-fuchsia-500 hover:bg-fuchsia-50 transition"
            title="Meus Agendamentos"
          >
            <Home size={22} className="text-fuchsia-600" />
          </button>
          <h1 className="w-full text-2xl font-bold text-pink-700 text-center flex items-center justify-center gap-2">
            <User className="text-fuchsia-600" /> Editar Perfil
          </h1>
        </div>

        <form className="w-full flex flex-col gap-5" onSubmit={handleSalvar}>
          <div>
            <label className="block text-sm font-medium text-pink-700 mb-1">Nome:</label>
            <input
              name="nome"
              type="text"
              value={form.nome}
              onChange={handleInputChange}
              className="w-full border border-pink-300 rounded p-2 text-zinc-700 focus:ring-2 focus:ring-pink-400"
              required
              disabled={carregando}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-pink-700 mb-1">Telefone:</label>
            <input
              name="telefone"
              type="tel"
              value={form.telefone}
              onChange={handleInputChange}
              className="w-full border border-pink-300 rounded p-2 text-zinc-700 focus:ring-2 focus:ring-pink-400"
              required
              disabled={carregando}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-pink-700 mb-1">E-mail:</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              className="w-full border border-pink-300 rounded p-2 text-zinc-700 focus:ring-2 focus:ring-pink-400"
              required
              disabled={carregando}
            />
          </div>
          <button
            type="submit"
            disabled={carregando}
            className="w-full mt-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white py-3 rounded-full font-bold hover:scale-105 transition-all shadow-lg ring-2 ring-pink-300"
          >
            {carregando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>

        {erro && <p className="text-red-500 text-center text-sm">{erro}</p>}
        {sucesso && <p className="text-green-600 text-center text-sm">{sucesso}</p>}
      </div>
    </main>
  )
}
