'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type AgendamentoUsuario = {
  id: string
  data_hora: string
  status: string
  service_id: string
  services: { nome: string }[]
}

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoUsuario[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function fetchAgendamentos() {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user?.id) {
        setErro('Você precisa estar logado.')
        setCarregando(false)
        return
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('id, data_hora, status, service_id, services(nome)')
        .eq('user_id', userData.user.id)
        .order('data_hora', { ascending: true })

      if (error) {
        setErro(error.message)
      } else {
        setAgendamentos(data as AgendamentoUsuario[])
      }

      setCarregando(false)
    }

    fetchAgendamentos()
  }, [])

  async function cancelarAgendamento(id: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelado' })
      .eq('id', id)

    if (error) {
      alert('Erro ao cancelar: ' + error.message)
    } else {
      setAgendamentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelado' } : a))
      )
    }
  }

  const formatarData = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-pink-700 mb-4">Meus Agendamentos</h1>

      {carregando ? (
        <p>Carregando...</p>
      ) : erro ? (
        <p className="text-red-500">{erro}</p>
      ) : agendamentos.length === 0 ? (
        <p>Você ainda não tem agendamentos.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {agendamentos.map((a) => (
            <li key={a.id} className="border p-4 rounded shadow-sm bg-white">
              <p><strong>Serviço:</strong> {a.services[0]?.nome || '---'}</p>
              <p><strong>Data:</strong> {formatarData(a.data_hora)}</p>
              <p><strong>Status:</strong> {a.status}</p>

              {a.status === 'agendado' &&
                new Date(a.data_hora) > new Date() && (
                  <button
                    onClick={() => cancelarAgendamento(a.id)}
                    className="mt-2 bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                  >
                    Cancelar
                  </button>
                )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
