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

function gerarHorariosDisponiveis(duracao: number, agendamentos: string[]) {
  const horarios: string[] = []
  const horaInicio = 8
  const horaFim = 18
  const intervalo = duracao

  for (let h = horaInicio; h < horaFim; h++) {
    for (let m = 0; m < 60; m += intervalo) {
      const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      if (h >= 12 && h < 13) continue
      if (!agendamentos.includes(hora)) {
        horarios.push(hora)
      }
    }
  }

  return horarios
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
          users!fk_usuario(nome),
          services(nome)
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
    const confirmar = confirm('Deseja realmente excluir este agendamento?')
    if (!confirmar) return

    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (!error) {
      setAgendamentos((prev) => prev.filter((a) => a.id !== id))
    } else {
      alert('Erro ao excluir: ' + error.message)
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

  const horariosAgendados = agendamentosDoDia.map((a) =>
    format(new Date(a.data_hora), 'HH:mm')
  )

  const horariosDisponiveis = gerarHorariosDisponiveis(60, horariosAgendados)

  const marcarDias = ({ date }: { date: Date }) => {
    const tem = agendamentos.some((a) => isSameDay(parseISO(a.data_hora), date))
    return tem ? 'highlight' : undefined
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-white text-zinc-800 px-4 sm:px-8 md:px-12 lg:px-20 py-10 text-sm">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out both;
        }
        .react-calendar {
          border: 2px solid #be185d;
          background-color: #fff;
          border-radius: 8px;
          padding: 8px;
          width: 100%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .react-calendar__tile {
          border-radius: 6px;
          padding: 8px 0;
          transition: background 0.3s ease, color 0.3s ease;
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
        .react-calendar__month-view__weekdays abbr {
          text-decoration: none;
          color: #555;
          font-weight: 500;
        }
      `}</style>

      <div className="mb-4 flex items-center justify-start gap-4">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm"
        >
          <Home size={18} />
          Início
        </button>

        <h1 className="text-2xl font-bold text-pink-700">📅 Meus Atendimentos</h1>
      </div>

      <hr className="border-t border-pink-300 mb-6" />

      {erro && <p className="text-red-500 mb-4">{erro}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        <div>
          <h3 className="text-lg font-semibold text-pink-700 mb-2">⏳ Horários Disponíveis</h3>
          {horariosDisponiveis.length === 0 ? (
            <p className="text-gray-600">Nenhum horário disponível.</p>
          ) : (
            <div className="flex flex-wrap gap-2 animate-fade-in">
              {horariosDisponiveis.map((hora) => (
                <span
                  key={hora}
                  className="bg-white border border-pink-300 text-pink-700 px-4 py-1 rounded-full text-sm font-medium shadow hover:shadow-pink-300/50 hover:scale-105 transition-all duration-300"
                >
                  {hora}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-1 text-center text-pink-700 tracking-wide border-b border-pink-300 pb-2">
          Agendamentos em {format(dataSelecionada, 'dd/MM/yyyy')}
        </h2>
        <p className="text-sm text-gray-700 text-center mb-4">
          📊 Total: {agendamentosDoDia.length} agendamento{agendamentosDoDia.length !== 1 ? 's' : ''}
        </p>

        {carregando ? (
          <p className="text-center text-gray-500">Carregando agendamentos...</p>
        ) : agendamentosDoDia.length === 0 ? (
          <p className="text-center text-gray-500">Nenhum agendamento neste dia.</p>
        ) : (
          <ul className="flex flex-col gap-4 max-w-xl mx-auto">
            {agendamentosDoDia.map((a) => (
              <li key={a.id} className="border p-4 rounded bg-white/60 backdrop-blur-md shadow-md hover:shadow-lg transition-all">
                <p><strong>👤 Cliente:</strong> {a.users[0]?.nome || '---'}</p>
                <p><strong>💅 Serviço:</strong> {a.services[0]?.nome || '---'}</p>
                <p><strong>🕒 Horário:</strong> {format(new Date(a.data_hora), 'HH:mm')}</p>
                <p><strong>Status:</strong> {badge(a.status)}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {a.status !== 'concluído' && (
                    <button
                      onClick={() => atualizarStatus(a.id, 'concluído')}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition shadow hover:shadow-green-400/40"
                    >
                      ✅ Concluído
                    </button>
                  )}
                  {a.status !== 'cancelado' && (
                    <button
                      onClick={() => atualizarStatus(a.id, 'cancelado')}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition shadow hover:shadow-yellow-400/40"
                    >
                      🚫 Cancelar
                    </button>
                  )}
                  <button
                    onClick={() => excluirAgendamento(a.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition shadow hover:shadow-red-400/40"
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
