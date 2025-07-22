'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, RotateCcw, XCircle, CheckCircle } from 'lucide-react'

type AgendamentoUsuario = {
  id: string
  data_hora: string
  status: string
  service_id: string
  operador_id: string
  services: { nome: string }[]
  operadores: { nome: string }[]
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
        .select(`
          id,
          data_hora,
          status,
          service_id,
          operador_id,
          services(nome),
          operadores(nome)
        `)
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

  function statusBadge(status: string) {
    if (status === 'cancelado')
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
          <XCircle size={16} /> Cancelado
        </span>
      )
    if (status === 'concluído')
      return (
        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
          <CheckCircle size={16} /> Concluído
        </span>
      )
    // padrão agendado
    return (
      <span className="inline-flex items-center gap-1 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-bold">
        <CalendarIcon /> Agendado
      </span>
    )
  }

  function CalendarIcon() {
    return (
      <svg width="16" height="16" fill="currentColor" className="inline-block mr-0.5" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H5A3 3 0 002 7v8a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM5 7h10a1 1 0 011 1v1H4V8a1 1 0 011-1zm-1 4h12v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z"></path></svg>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-white flex justify-center items-center px-4">
      <div className="w-full max-w-lg bg-white/80 rounded-3xl shadow-2xl ring-2 ring-pink-200 p-7 pb-10 flex flex-col gap-6 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push('/cliente')}
            className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm shadow"
          >
            <Home size={18} />
            Início
          </button>
          <h1 className="text-2xl font-bold text-pink-700 text-center w-full">
            Meus Agendamentos
          </h1>
        </div>

        {sucesso && (
          <div className="bg-green-100 text-green-800 border border-green-300 px-4 py-3 rounded-xl mb-2 text-sm text-center shadow animate-fade-in-down">
            {sucesso}
          </div>
        )}

        {carregando ? (
          <div className="w-full text-center text-zinc-500 py-8">Carregando...</div>
        ) : erro ? (
          <div className="text-red-500 text-center">{erro}</div>
        ) : agendamentos.length === 0 ? (
          <div className="text-zinc-600 text-center text-lg py-8">
            Você ainda não tem agendamentos.
          </div>
        ) : (
          <ul className="flex flex-col gap-6">
            {agendamentos.map((a) => {
              const ehFuturo = new Date(a.data_hora) > new Date()
              const podeAlterar = a.status === 'agendado' && ehFuturo

              return (
                <li key={a.id} className="border border-pink-200 rounded-2xl shadow-md bg-white/90 p-5 transition-all flex flex-col gap-2 hover:shadow-pink-200/70">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-pink-700 font-semibold text-lg">
                      {a.services?.[0]?.nome || '---'}
                    </span>
                    <span>{statusBadge(a.status)}</span>
                  </div>
                  <span className="text-zinc-500 text-sm">
                    <b>Colaborador:</b> {a.operadores?.[0]?.nome || '---'}
                  </span>
                  <span className="text-zinc-700 text-sm">
                    <b>Data:</b> {formatarData(a.data_hora)}
                  </span>

                  {podeAlterar && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button
                        onClick={() => cancelarAgendamento(a.id)}
                        className="flex items-center gap-1 bg-red-500 text-white px-4 py-1.5 rounded-full font-semibold shadow hover:bg-red-600 transition-all"
                      >
                        <XCircle size={18} /> Cancelar
                      </button>
                      <button
                        onClick={() => reagendar(a.service_id, a.id)}
                        className="flex items-center gap-1 bg-blue-500 text-white px-4 py-1.5 rounded-full font-semibold shadow hover:bg-blue-600 transition-all"
                      >
                        <RotateCcw size={18} /> Reagendar
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

      </div>
      {/* Fade-in animação */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(.48,1.62,.44,.91) both;
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.8s cubic-bezier(.48,1.62,.44,.91) both;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px);}
          to { opacity: 1; transform: translateY(0);}
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px);}
          to { opacity: 1; transform: translateY(0);}
        }
      `}</style>
    </main>
  )
}
