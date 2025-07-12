'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Home } from 'lucide-react'

type AgendamentoCompleto = {
  id: string
  data_hora: string
  status: string
  users: { nome: string }[]
  services: { nome: string }[]
}

export default function AgendamentosAdminPage() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoCompleto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date())
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
      setCarregando(false)
    }

    verificarAdmin()
  }, [router])

  const formatarDataHora = (iso: string) =>
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

  const badge = (status: string) => {
    const cores: Record<string, string> = {
      'concluído': 'bg-green-200 text-green-700',
      'cancelado': 'bg-yellow-200 text-yellow-700',
      'pendente': 'bg-gray-200 text-gray-700'
    }
    return (
      <span className={`px-2 py-1 rounded text-sm font-medium ${cores[status] || 'bg-gray-200'}`}>
        {status}
      </span>
    )
  }

  const agendamentosDoDia = agendamentos.filter((a) =>
    isSameDay(parseISO(a.data_hora), dataSelecionada)
  )

  const marcarDias = ({ date }: { date: Date }) => {
    const tem = agendamentos.some((a) => isSameDay(parseISO(a.data_hora), date))
    return tem ? 'highlight' : undefined
  }

  return (
   
    // (Todo o restante do seu código permanece igual até a tag <main>)
    <main className="p-6 max-w-5xl mx-auto bg-pink-50 min-h-screen">
    <div className="mb-4">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm"
        >
          <Home size={18} />
          Início do Admin
        </button>
      </div>
    <h1 className="text-2xl font-bold text-pink-700 mb-6">
        📅 Meus atendimentos
    </h1>

    {erro && <p className="text-red-500 mb-4">{erro}</p>}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calendário */}
        <div>
        <Calendar
            locale="pt-BR"
            onChange={(date) => setDataSelecionada(date as Date)}
            value={dataSelecionada}
            tileClassName={marcarDias}
            calendarType="iso8601"
            formatShortWeekday={(locale, date) => format(date, 'EEEEE', { locale: ptBR })}
            formatMonthYear={(locale, date) => format(date, 'MMMM yyyy', { locale: ptBR })}
        />
        <style>{`
            .react-calendar {
                border: 2px solid #be185d; /* rosa escuro */
                background-color: #fff;
                border-radius: 8px;
                padding: 8px;
                color: #444;
                width: 100%;
              }              

            .react-calendar__tile {
            border-radius: 6px;
            padding: 8px 0;
            }

            .react-calendar__tile--now {
            background: #fde2f3 !important;
            color: #d63384 !important;
            font-weight: bold;
            }

            .react-calendar__tile--active {
            background: #ec4899 !important;
            color: white !important;
            }

            .highlight {
            background: #f472b6 !important;
            color: white !important;
            border-radius: 9999px;
            font-weight: bold;
            }

            .react-calendar__month-view__days__day {
            color: #333;
            }

            .react-calendar__navigation__label {
            color: #ec4899 !important;
            font-weight: bold;
            }

            .react-calendar__navigation__arrow {
            color: #ec4899 !important;
            }

            .react-calendar__month-view__weekdays abbr {
            text-decoration: none;
            color: #555;
            font-weight: 500;
            }
        `}</style>
        </div>

        {/* Lista do dia selecionado */}
        <div>
        <h2 className="text-xl font-semibold mb-2 text-pink-700">
            Agendamentos em {format(dataSelecionada, 'dd/MM/yyyy')}
        </h2>
        <p className="text-sm text-gray-700 mb-4">
            📊 Total: {agendamentosDoDia.length} agendamento{agendamentosDoDia.length !== 1 ? 's' : ''}
        </p>

        {carregando ? (
            <p className="text-gray-500">Carregando agendamentos...</p>
        ) : agendamentosDoDia.length === 0 ? (
            <p className="text-gray-500">Nenhum agendamento neste dia.</p>
        ) : (
            <ul className="flex flex-col gap-4">
            {agendamentosDoDia.map((a) => (
                <li key={a.id} className="border p-4 rounded bg-white dark:bg-zinc-800 shadow-sm">
                <p><strong>👤 Cliente:</strong> {a.users[0]?.nome || '---'}</p>
                <p><strong>💅 Serviço:</strong> {a.services[0]?.nome || '---'}</p>
                <p><strong>🕒 Horário:</strong> {format(new Date(a.data_hora), 'HH:mm')}</p>
                <p><strong>Status:</strong> {badge(a.status)}</p>

                <div className="flex gap-2 mt-3 flex-wrap">
                    {a.status !== 'concluído' && (
                    <button
                        onClick={() => atualizarStatus(a.id, 'concluído')}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition"
                    >
                        ✅ Concluído
                    </button>
                    )}
                    {a.status !== 'cancelado' && (
                    <button
                        onClick={() => atualizarStatus(a.id, 'cancelado')}
                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                    >
                        🚫 Cancelar
                    </button>
                    )}
                    <button
                    onClick={() => excluirAgendamento(a.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                    >
                    🗑️ Excluir
                    </button>
                </div>
                </li>
            ))}
            </ul>
        )}
        </div>
    </div>
    </main>

  )
}
