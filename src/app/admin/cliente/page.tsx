'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'

type Usuario = {
  id: string
  nome: string
  email: string
  telefone?: string
  role: string
  ultimo_agendamento?: string | null
}

export default function ClientesAdminPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function verificarAdmin() {
      const { data: userData } = await supabase.auth.getUser()
      const { data: perfil } = await supabase
        .from('users')
        .select('role')
        .eq('id', userData.user?.id)
        .single()

      if (perfil?.role !== 'admin') {
        router.push('/')
        return
      }

      fetchUsuarios()
    }

    async function fetchUsuarios() {
      const { data, error } = await supabase
        .from('users')
        .select('id, nome, email, telefone, role')
        .neq('role', 'admin')

      if (error) setErro(error.message)
      else {
        const usuariosComUltimoAgendamento = await Promise.all(
          (data as Usuario[]).map(async (user) => {
            const { data: agendamento } = await supabase
              .from('appointments')
              .select('data_hora')
              .eq('user_id', user.id)
              .order('data_hora', { ascending: false })
              .limit(1)
              .single()

            return {
              ...user,
              ultimo_agendamento: agendamento?.data_hora || null,
            }
          })
        )
        setUsuarios(usuariosComUltimoAgendamento)
      }
    }

    verificarAdmin()
  }, [router])

  return (
    <main className="min-h-screen bg-pink-50 text-zinc-800 px-4 sm:px-8 md:px-12 lg:px-20 py-10 text-sm">
      <div className="mb-4 flex items-center justify-start gap-4">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm"
        >
          <Home size={18} />
          Início
        </button>

        <h1 className="text-2xl font-bold text-pink-700">👥 Meus Clientes</h1>
      </div>

      <hr className="border-t border-pink-300 mb-6" />

      {erro && <p className="text-red-500 mb-4">{erro}</p>}

      <div className="space-y-4">
  {/* TABELA para telas grandes */}
  <table className="hidden sm:table w-full border-collapse bg-white shadow-sm rounded overflow-hidden text-sm">
    <thead className="bg-pink-100 text-pink-800">
      <tr>
        <th className="p-3 text-left">Nome</th>
        <th className="p-3 text-left">Telefone</th>
        <th className="p-3 text-left">Últ. Agend.</th>
      </tr>
    </thead>
    <tbody>
      {usuarios.map((user) => (
        <tr key={user.id} className="border-t hover:bg-pink-50">
          <td className="p-3">{user.nome}</td>
          <td className="p-3">{user.telefone || '—'}</td>
          <td className="p-3">
            {user.ultimo_agendamento
              ? new Date(user.ultimo_agendamento).toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : '—'}
          </td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* CARDS para telas pequenas */}
  <div className="sm:hidden space-y-3">
    {usuarios.map((user) => (
      <div
        key={user.id}
        className="bg-white shadow-sm rounded p-3 border border-pink-100 space-y-1"
      >
    
        <p className="text-pink-600 font-semibold">{user.nome}</p>
        <p className="text-sm text-zinc-600">
          📞 {user.telefone || '—'}
        </p>
        <p className="text-sm text-zinc-600">
          📅{' '}
          {user.ultimo_agendamento
            ? new Date(user.ultimo_agendamento).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })
            : 'Sem agendamentos'}
        </p>
      </div>
    ))}
  </div>
</div>

    </main>
  )
}