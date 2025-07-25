'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, X, RotateCcw } from 'lucide-react'

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
  const [carregando, setCarregando] = useState(false)

  async function fetchUsuarios() {
    setCarregando(true)
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
    setCarregando(false)
  }

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

    verificarAdmin()
    // eslint-disable-next-line
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
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-fuchsia-100 text-zinc-800 px-2 sm:px-8 md:px-16 py-10 relative overflow-x-hidden">
      {/* BG Blur */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-pink-200 opacity-30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-fuchsia-200 opacity-25 rounded-full blur-2xl pointer-events-none" />

      {/* Botão Início flutuante */}
      <button
        onClick={() => router.push('/admin')}
        className="fixed top-5 left-5 z-30 bg-gradient-to-br from-pink-100 to-fuchsia-100 border border-pink-300 text-pink-600 p-3 rounded-full shadow-lg hover:from-pink-500 hover:to-fuchsia-500 hover:text-white hover:scale-110 transition-all"
        title="Voltar para o início"
        aria-label="Início"
      >
        <Home size={28} />
      </button>

      {/* Botão Atualizar flutuante */}
      <button
        onClick={fetchUsuarios}
        className="fixed bottom-6 right-6 z-30 bg-gradient-to-br from-pink-100 to-fuchsia-200 border border-pink-300 text-pink-700 p-4 rounded-full shadow-2xl hover:from-fuchsia-600 hover:to-pink-600 hover:text-white hover:scale-110 transition-all"
        title="Atualizar clientes"
        aria-label="Atualizar"
      >
        <RotateCcw size={22} />
      </button>

      {/* TÍTULO CENTRALIZADO */}
      <div className="w-full flex flex-col items-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-pink-700 text-center tracking-tight relative inline-block leading-tight drop-shadow-pink-100">
          Meus Clientes
          <span className="block h-1 w-2/3 mx-auto bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-full mt-4 animate-pulse transition-all duration-300" />
        </h1>
      </div>

      {/* FILTRO ALINHADO À ESQUERDA */}
      <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-end md:justify-start gap-3 mb-7 w-full">
        <div className="flex flex-col md:flex-row md:items-end gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
            className="border border-pink-300 rounded-lg px-4 py-2 w-full md:w-64 text-base shadow bg-white focus:ring-2 focus:ring-pink-200 transition"
          />
          <button
            onClick={() => setOrdemAZ((prev) => !prev)}
            className="text-sm bg-pink-200 text-pink-800 px-4 py-2 rounded-lg shadow border border-pink-300 hover:bg-pink-300 transition font-medium"
          >
            {ordemAZ ? 'A-Z' : 'Z-A'}
          </button>
        </div>
      </div>

      {/* TABELA */}
      <div className="max-w-3xl mx-auto w-full rounded-xl shadow-md bg-white/80 overflow-x-auto">
        {carregando ? (
          <div className="flex justify-center items-center h-32">
            <span className="w-10 h-10 border-4 border-pink-300 border-t-fuchsia-500 rounded-full animate-spin inline-block" />
            <span className="ml-3 text-pink-700 font-medium">Carregando clientes...</span>
          </div>
        ) : (
          <table className="w-full border-collapse rounded-xl overflow-hidden text-base">
            <thead>
              <tr className="bg-pink-50 text-pink-900 font-bold">
                <th className="py-3 px-4 text-left">Nome</th>
                <th className="py-3 px-4 text-left">Telefone</th>
                <th className="py-3 px-4 text-left">Últ. Agendamento</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-pink-100 hover:bg-pink-50/70 transition cursor-pointer"
                >
                  <td
                    className="py-3 px-4 text-pink-600 hover:underline font-semibold"
                    onClick={() => abrirAgendamentos(user)}
                  >
                    {user.nome}
                  </td>
                  <td className="py-3 px-4">
                    {user.telefone ? (
                      <a
                        href={`https://wa.me/${user.telefone.replace(/^\+/, '')}?text=${encodeURIComponent(`Olá ${user.nome}, tudo bem?`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:underline flex items-center gap-1"
                        title="Enviar mensagem no WhatsApp"
                      >
                        {user.telefone}
                        {/* Ícone WhatsApp */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={18}
                          height={18}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          className="ml-1"
                        >
                          <path d="M20.52 3.48A11.77 11.77 0 0 0 12 0 12 12 0 0 0 2.05 17.56L0 24l6.63-2A12 12 0 0 0 12 24h.01A12 12 0 0 0 24 12a11.94 11.94 0 0 0-3.48-8.52zm-8.51 19.5a10.1 10.1 0 0 1-5.16-1.42l-.37-.22-3.94 1.18 1.21-3.83-.24-.39A10.08 10.08 0 1 1 21.94 12a9.98 9.98 0 0 1-9.93 10.98zm5.46-7.19c-.3-.15-1.79-.89-2.07-.99-.28-.1-.48-.15-.68.15-.19.29-.77.99-.94 1.19-.17.2-.35.22-.65.07a8.15 8.15 0 0 1-2.39-1.48 8.92 8.92 0 0 1-1.65-2.05c-.17-.3 0-.46.13-.6.13-.13.29-.34.43-.51.14-.18.19-.3.29-.5.1-.2.05-.37-.03-.52-.08-.15-.68-1.63-.93-2.23-.25-.6-.5-.51-.68-.52-.18-.01-.38-.01-.58-.01-.2 0-.52.07-.79.37s-1.04 1.01-1.04 2.47.81 2.86 1.57 3.77c.76.91 2.26 2.39 4.49 3.01.63.18 1.12.29 1.5.38.63.16 1.2.13 1.65.08.5-.05 1.52-.62 1.74-1.21.21-.59.21-1.09.15-1.21-.07-.12-.28-.19-.58-.33z" />
                        </svg>
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4">
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
        )}
      </div>

      {/* Modal de Agendamentos */}
      {clienteSelecionado && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-pink-700">
                Agendamentos de {clienteSelecionado.nome}
              </h2>
              <button
                onClick={() => {
                  setClienteSelecionado(null)
                  setAgendamentosCliente([])
                }}
                className="text-zinc-500 hover:text-red-500 rounded-full p-1"
                title="Fechar"
              >
                <X size={22} />
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
                    <span className="text-sm font-medium text-pink-700">
                      {new Date(a.data_hora).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                    <button
                      onClick={() => cancelarAgendamento(a.id)}
                      className="text-red-500 text-xs font-bold hover:underline px-2 py-1 rounded hover:bg-red-50 transition"
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

      {/* ANIMAÇÃO MODAL */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeInModal 0.5s;
        }
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.96);}
          to { opacity: 1; transform: scale(1);}
        }
      `}</style>
    </main>
  )
}
