'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

type AgendamentoCompleto = {
  id: string
  data_hora: string
  status: string
  users: { nome: string }[]
  services: { nome: string }[]
}

export default function AgendamentosAdminPage() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoCompleto[]>([])
  const [erro, setErro] = useState('')
  const router = useRouter()

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

      fetchAgendamentos()
    }

    async function fetchAgendamentos() {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          data_hora,
          status,
          users (nome),
          services (nome)
        `)
        .order('data_hora', { ascending: true })

      if (error) {
        setErro(error.message)
      } else {
        setAgendamentos(data as AgendamentoCompleto[])
      }
    }

    verificarAdmin()
  }, [router])

  const formatarData = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  async function atualizarStatus(id: string, novoStatus: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: novoStatus })
      .eq('id', id)

    if (!error) {
      setAgendamentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: novoStatus } : a))
      )
    } else {
      alert('Erro ao atualizar status: ' + error.message)
    }
  }

  async function excluirAgendamento(id: string) {
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (!error) {
      setAgendamentos((prev) => prev.filter((a) => a.id !== id))
    }
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-pink-700 mb-4">Todos os Agendamentos</h1>

      {erro && <p className="text-red-500 mb-4">{erro}</p>}

      <ul className="flex flex-col gap-4">
        {agendamentos.map((a) => (
          <li key={a.id} className="border p-4 rounded bg-white shadow-sm">
            <p><strong>Cliente:</strong> {a.users[0]?.nome || '---'}</p>
            <p><strong>Serviço:</strong> {a.services[0]?.nome || '---'}</p>
            <p><strong>Data:</strong> {formatarData(a.data_hora)}</p>
            <p><strong>Status:</strong> {a.status}</p>

            <div className="flex gap-2 mt-2">
              {a.status !== 'concluído' && (
                <button
                  onClick={() => atualizarStatus(a.id, 'concluído')}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Marcar como Concluído
                </button>
              )}
              {a.status !== 'cancelado' && (
                <button
                  onClick={() => atualizarStatus(a.id, 'cancelado')}
                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => excluirAgendamento(a.id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
