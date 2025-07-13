'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, X } from 'lucide-react'

type Usuario = {
  id: string
  nome: string
  telefone?: string
  role: string
  ultimo_agendamento?: string | null
}

type Agendamento = {
  id: string
  data_hora: string
}

export default function ClientesAdminPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [erro, setErro] = useState('')
  const [filtroNome, setFiltroNome] = useState('')
  const [ordemAZ, setOrdemAZ] = useState(true)
  const [agendamentosCliente, setAgendamentosCliente] = useState<Agendamento[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Usuario | null>(null)

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
        .select('id, nome, telefone, role')
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

  const usuariosFiltrados = usuarios
    .filter((u) => u.nome.toLowerCase().includes(filtroNome.toLowerCase()))
    .sort((a, b) => {
      return ordemAZ ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome)
    })

  async function abrirAgendamentos(usuario: Usuario) {
    const { data } = await supabase
      .from('appointments')
      .select('id, data_hora')
      .eq('user_id', usuario.id)
      .order('data_hora', { ascending: false })

    setClienteSelecionado(usuario)
    setAgendamentosCliente(data || [])
  }

  async function cancelarAgendamento(id: string) {
    const confirmar = confirm('Deseja cancelar este agendamento?')
    if (!confirmar) return
    await supabase.from('appointments').delete().eq('id', id)
    setAgendamentosCliente((prev) => prev.filter((a) => a.id !== id))
  }

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

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={filtroNome}
          onChange={(e) => setFiltroNome(e.target.value)}
          className="border border-pink-300 rounded px-3 py-1"
        />
        <button
          onClick={() => setOrdemAZ((prev) => !prev)}
          className="text-sm bg-pink-200 text-pink-800 px-2 py-1 rounded hover:bg-pink-300"
        >
          {ordemAZ ? 'A-Z' : 'Z-A'}
        </button>
      </div>

      <table className="w-full border-collapse bg-white shadow-sm rounded overflow-hidden text-sm">
        <thead className="bg-pink-100 text-pink-800">
          <tr>
            <th className="p-3 text-left">Nome</th>
            <th className="p-3 text-left">Telefone</th>
            <th className="p-3 text-left">Últ. Agend.</th>
          </tr>
        </thead>
        <tbody>
          {usuariosFiltrados.map((user) => (
            <tr
              key={user.id}
              className="border-t hover:bg-pink-50 cursor-pointer"
            >
              <td
                className="p-3 text-pink-600 hover:underline"
                onClick={() => abrirAgendamentos(user)}
              >
                {user.nome}
              </td>
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

      {/* Modal de Agendamentos */}
      {clienteSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-pink-700">
                Agendamentos de {clienteSelecionado.nome}
              </h2>
              <button
                onClick={() => {
                  setClienteSelecionado(null)
                  setAgendamentosCliente([])
                }}
              >
                <X size={20} />
              </button>
            </div>

            {agendamentosCliente.length === 0 ? (
              <p className="text-zinc-500">Nenhum agendamento encontrado.</p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-auto">
                {agendamentosCliente.map((a) => (
                  <li
                    key={a.id}
                    className="flex justify-between items-center border-b pb-1"
                  >
                    <span className="text-sm">
                      {new Date(a.data_hora).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                    <button
                      onClick={() => cancelarAgendamento(a.id)}
                      className="text-red-500 text-xs hover:underline"
                    >
                      Cancelar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
