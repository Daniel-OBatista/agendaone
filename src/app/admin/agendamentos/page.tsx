'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Home, RotateCcw } from 'lucide-react'

type Agendamento = {
  id: string
  data_hora: string
  status: string
  operador_id: string
  user_id: string
  user?: { nome: string }[]
  service?: { nome: string }[]
  operador?: { nome: string }[]
}

type Operador = {
  id: string
  nome: string
  foto_url?: string
}

function gerarHorariosDisponiveis(duracao: number, agendamentos: string[], dataSelecionada: Date) {
  const horarios: string[] = []
  const horaInicio = 8
  const horaFim = 18
  const intervalo = duracao

  for (let h = horaInicio; h < horaFim; h++) {
    for (let m = 0; m < 60; m += intervalo) {
      const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      if (h >= 12 && h < 13) continue
      horarios.push(hora)
    }
  }
  // Exibir apenas horários futuros no dia atual
  if (format(dataSelecionada, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
    const horaAtual = new Date().getHours()
    return horarios.filter(horaStr => {
      const [h] = horaStr.split(':').map(Number)
      return h > horaAtual && !agendamentos.includes(horaStr)
    })
  }
  return horarios.filter(hora => !agendamentos.includes(hora))
}

export default function AgendamentosAdminPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [operadorSelecionado, setOperadorSelecionado] = useState<string>('todos')
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
      await carregarOperadores()
    }
    verificarAdmin()
  }, [router])

  useEffect(() => {
    fetchAgendamentos()
    // eslint-disable-next-line
  }, [operadorSelecionado, dataSelecionada])

  async function carregarOperadores() {
    const { data, error } = await supabase.from('operadores').select('id, nome, foto_url').order('nome')
    if (error) {
      setErro('Erro ao carregar operadores: ' + error.message)
    } else {
      setOperadores(data as Operador[])
    }
  }

  async function fetchAgendamentos() {
    setCarregando(true)
    let query = supabase
      .from('appointments')
      .select(`
  id,
  data_hora,
  status,
  operador_id,
  user_id,
  user:fk_appointments_user(nome),
  service:appointments_service_id_fkey(nome),
  operador:fk_operador(nome)
`)






      .order('data_hora', { ascending: true })

    if (operadorSelecionado !== 'todos') {
      query = query.eq('operador_id', operadorSelecionado)
    }
    const { data, error } = await query
    if (error) {
      setErro('Erro ao carregar agendamentos: ' + error.message)
      setAgendamentos([])
    } else {
      setAgendamentos(data || [])
    }
    setCarregando(false)
  }

  async function atualizarStatus(id: string, novoStatus: string) {
    const confirmar = confirm(`Deseja realmente atualizar o status para "${novoStatus}"?`)
    if (!confirmar) return
    const { error } = await supabase
      .from('appointments')
      .update({ status: novoStatus })
      .eq('id', id)
    if (!error) {
      await fetchAgendamentos()
    } else {
      alert('Erro ao atualizar status: ' + error.message)
    }
  }

  async function excluirAgendamento(id: string) {
    const confirmar = confirm('Deseja realmente excluir este agendamento?')
    if (!confirmar) return
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (!error) {
      await fetchAgendamentos()
    } else {
      alert('Erro ao excluir: ' + error.message)
    }
  }

  function reagendarAgendamento(agendamento: Agendamento) {
    router.push(`/admin/reagendar?id=${agendamento.id}`)
  }

  const badge = (status: string) => {
    const cores: Record<string, string> = {
      'concluído': 'bg-green-200 text-green-700',
      'cancelado': 'bg-yellow-200 text-yellow-700',
      'pendente': 'bg-gray-200 text-gray-700',
      'agendado': 'bg-pink-200 text-pink-700'
    }
    return (
      <span className={`px-2 py-1 rounded text-sm font-medium ${cores[status] || 'bg-gray-200'}`}>
        {status}
      </span>
    )
  }

  const agendamentosDoDia = agendamentos.filter((a) =>
    isSameDay(parseISO(a.data_hora), dataSelecionada) &&
    (operadorSelecionado === 'todos' || a.operador_id === operadorSelecionado)
  )

  const horariosAgendados = agendamentosDoDia
    .filter((a) => a.status === 'agendado' || a.status === 'concluído')
    .map((a) => format(new Date(a.data_hora), 'HH:mm'))

  const horariosDisponiveis = gerarHorariosDisponiveis(60, horariosAgendados, dataSelecionada)

  const marcarDias = ({ date }: { date: Date }) => {
    const tem = agendamentos.some((a) => isSameDay(parseISO(a.data_hora), date))
    return tem ? 'highlight' : undefined
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-white text-zinc-800 px-4 sm:px-8 md:px-12 lg:px-20 py-10 text-sm">
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm"
          >
            <Home size={18} />
            Início
          </button>
          <h1 className="text-2xl font-bold text-pink-700">📅 Meus Atendimentos</h1>
        </div>
        <div>
          <label className="text-sm text-pink-800 font-medium mr-2">Filtrar por operador:</label>
          <select
            value={operadorSelecionado}
            onChange={(e) => setOperadorSelecionado(e.target.value)}
            className="border border-pink-300 rounded px-3 py-1 text-sm"
          >
            <option value="todos">Todos</option>
            {operadores.map((op) => (
              <option key={op.id} value={op.id}>
                {op.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <hr className="border-t border-pink-300 mb-6" />
      {erro && <p className="text-red-500 mb-4">{erro}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div>
          <Calendar
            locale="pt-BR"
            onChange={(date) => setDataSelecionada(date as Date)}
            value={dataSelecionada}
            tileClassName={marcarDias}
            calendarType="iso8601"
            formatShortWeekday={(locale, date) => format(date, 'EEEEE', { locale: ptBR })}
            formatMonthYear={(locale, date) => format(date, 'MMMM yyyy', { locale: ptBR })}
            className="rounded-xl shadow-xl p-4 border border-pink-200 bg-white/80 backdrop-blur-md calendar-modern"
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-pink-700 mb-2">⏳ Horários Disponíveis</h3>
          {horariosDisponiveis.length === 0 ? (
            <p className="text-gray-600">Nenhum horário disponível.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in">
              {horariosDisponiveis.map((hora) => (
                <span
                  key={hora}
                  className="bg-white border border-pink-300 text-pink-700 px-4 py-[6px] rounded-full text-sm font-medium shadow hover:shadow-pink-300/50 hover:scale-105 transition-all duration-300 text-center leading-tight flex items-center justify-center"
                >
                  {hora}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Foto do operador */}
        <div className="flex justify-center items-start">
          <div className="flex justify-center items-start">
            <img
              src={
                operadorSelecionado === 'todos'
                  ? '/logo.png'
                  : operadores.find((o) => o.id === operadorSelecionado)?.foto_url || '/logo.png'
              }
              alt="Foto do operador"
              className="w-full max-w-md h-[280px] object-cover rounded-lg shadow-xl bg-zinc-100 mx-auto mt-4"
            />
          </div>
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
    <li
      key={a.id}
      className="border p-4 rounded bg-white/60 backdrop-blur-md shadow-md hover:shadow-lg transition-all"
    >
      <p><strong>👤 Cliente:</strong> {a.user?.[0]?.nome || '---'}</p>

      <p><strong>💅 Serviço:</strong> {a.service?.[0]?.nome || '---'}</p>
      <p><strong>🕒 Horário:</strong> {format(new Date(a.data_hora), 'HH:mm')}</p>
      <p><strong>Status:</strong> {badge(a.status)}</p>
      <div className="flex gap-2 mt-3 flex-wrap">
        {a.status !== 'concluído' && (
          <>
            <button
              onClick={() => atualizarStatus(a.id, 'concluído')}
              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition shadow hover:shadow-green-400/40"
            >
              ✅ Concluído
            </button>
            <button
              onClick={() => atualizarStatus(a.id, 'cancelado')}
              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition shadow hover:shadow-yellow-400/40"
            >
              🚫 Cancelar
            </button>
            <button
              onClick={() => reagendarAgendamento(a)}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition shadow hover:shadow-blue-400/40 flex items-center gap-1"
            >
              <RotateCcw size={16} /> Reagendar
            </button>
          </>
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
