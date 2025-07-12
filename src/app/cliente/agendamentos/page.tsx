'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

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
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const router = useRouter()

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
    const confirmar = confirm('Deseja realmente cancelar este agendamento?')
    if (!confirmar) return

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelado' })
      .eq('id', id)

    if (error) {
      setErro('Erro ao cancelar: ' + error.message)
    } else {
      setAgendamentos((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: 'cancelado' } : a
        )
      )
      setSucesso('Agendamento cancelado com sucesso!')
      setTimeout(() => setSucesso(''), 4000)
    }
  }

  function reagendar(serviceId: string, agendamentoId: string) {
    router.push(`/cliente/agendar?service=${serviceId}&reagendar=${agendamentoId}`)
  }

  const formatarData = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-pink-700 mb-4">Meus Agendamentos</h1>

      {sucesso && (
        <div className="bg-green-100 text-green-800 border border-green-300 p-3 rounded mb-4 text-sm">
          {sucesso}
        </div>
      )}

      {carregando ? (
        <p>Carregando...</p>
      ) : erro ? (
        <p className="text-red-500">{erro}</p>
      ) : agendamentos.length === 0 ? (
        <p>Você ainda não tem agendamentos.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {agendamentos.map((a) => {
            const ehFuturo = new Date(a.data_hora) > new Date()
            const podeAlterar = a.status === 'agendado' && ehFuturo

            return (
              <li key={a.id} className="border p-4 rounded shadow-sm bg-white">
                <p><strong>Serviço:</strong> {a.services[0]?.nome || '---'}</p>
                <p><strong>Data:</strong> {formatarData(a.data_hora)}</p>
                <p><strong>Status:</strong> {a.status}</p>

                {podeAlterar && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => cancelarAgendamento(a.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => reagendar(a.service_id, a.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Reagendar
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
