'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Home, RotateCcw, XCircle, CheckCircle } from 'lucide-react'

type Agendamento = {
  id: string
  codigo_atendimento?: string
  data_hora: string
  status: string
  operador_id: string
  service_id: string
  user_id: string
}

type Operador = { id: string; nome: string; foto_url?: string }
type Servico = { id: string; nome: string }
type Cliente = { id: string; nome: string }

export default function AgendamentosAdminPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [operadorSelecionado, setOperadorSelecionado] = useState<string>('todos')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date())
  const router = useRouter()

  // Carrega operadores, serviços e clientes
  async function fetchRelacionamentos() {
    const { data: ops } = await supabase.from('operadores').select('id, nome, foto_url')
    setOperadores(ops || [])
    const { data: svs } = await supabase.from('services').select('id, nome')
    setServicos(svs || [])
    const { data: cls } = await supabase.from('users').select('id, nome')
    setClientes(cls || [])
  }

  // Busca agendamentos
  async function fetchAgendamentos() {
    setCarregando(true)
    setErro('')
    let query = supabase
      .from('appointments')
      .select('id, codigo_atendimento, data_hora, status, operador_id, service_id, user_id')
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

  useEffect(() => {
    fetchRelacionamentos()
  }, [])

  useEffect(() => {
    fetchAgendamentos()
    // eslint-disable-next-line
  }, [operadorSelecionado, dataSelecionada])

  // Funções de ação
  async function marcarComoConcluido(id: string) {
    const confirmar = confirm('Marcar como concluído?')
    if (!confirmar) return
    const { error } = await supabase.from('appointments').update({ status: 'concluído' }).eq('id', id)
    if (error) {
      alert('Erro ao concluir: ' + error.message)
      setErro('Erro ao concluir: ' + error.message)
    } else {
      setSucesso('Agendamento concluído!')
      await fetchAgendamentos()
      setTimeout(() => setSucesso(''), 3000)
    }
  }

  async function cancelarAgendamento(id: string) {
    const confirmar = confirm('Cancelar este agendamento?')
    if (!confirmar) return
    const { error } = await supabase.from('appointments').update({ status: 'cancelado' }).eq('id', id)
    if (error) {
      alert('Erro ao cancelar: ' + error.message)
      setErro('Erro ao cancelar: ' + error.message)
    } else {
      setSucesso('Agendamento cancelado!')
      await fetchAgendamentos()
      setTimeout(() => setSucesso(''), 3000)
    }
  }

  function reagendarAgendamento(serviceId: string, agendamentoId: string) {
    // Marca como cancelado, depois redireciona para tela de reagendamento
    cancelarAgendamento(agendamentoId).then(() => {
      router.push(`/admin/reagendar?service=${serviceId}&reagendar=${agendamentoId}`)
    })
  }

  // Utils para mostrar nomes nas relações
  function nomeCliente(userId: string) {
    return clientes.find(c => c.id === userId)?.nome || '---'
  }
  function nomeOperador(operadorId: string) {
    return operadores.find(o => o.id === operadorId)?.nome || '---'
  }
  function nomeServico(serviceId: string) {
    return servicos.find(s => s.id === serviceId)?.nome || '---'
  }
  function fotoOperador(operadorId: string) {
    return operadores.find(o => o.id === operadorId)?.foto_url || '/logo.png'
  }

  // Filtros para o calendário
  const agendamentosDoDia = agendamentos.filter((a) =>
    isSameDay(parseISO(a.data_hora), dataSelecionada) &&
    (operadorSelecionado === 'todos' || a.operador_id === operadorSelecionado)
  )

  const horariosAgendados = agendamentosDoDia
    .filter((a) => a.status === 'agendado' || a.status === 'concluído')
    .map((a) => format(new Date(a.data_hora), 'HH:mm'))

  function gerarHorariosDisponiveis(duracao: number, agendados: string[], data: Date) {
    const horarios: string[] = []
    const horaInicio = 8
    const horaFim = 18
    for (let h = horaInicio; h < horaFim; h++) {
      for (let m = 0; m < 60; m += duracao) {
        if (h >= 12 && h < 13) continue
        const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        horarios.push(hora)
      }
    }
    if (format(data, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
      const horaAtual = new Date().getHours()
      return horarios.filter(horaStr => {
        const [h] = horaStr.split(':').map(Number)
        return h > horaAtual && !agendados.includes(horaStr)
      })
    }
    return horarios.filter(hora => !agendados.includes(hora))
  }
  const horariosDisponiveis = gerarHorariosDisponiveis(60, horariosAgendados, dataSelecionada)

  // Highlight calendário
  const marcarDias = ({ date }: { date: Date }) => {
    const tem = agendamentos.some((a) => isSameDay(parseISO(a.data_hora), date))
    return tem ? 'highlight' : undefined
  }

  // Badge de status
  function badge(status: string) {
    if (status === 'concluído')
      return (
        <span className="inline-flex items-center gap-1 bg-green-100 border border-green-300 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
          <CheckCircle size={15} /> Concluído
        </span>
      )
    if (status === 'cancelado')
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 border border-red-300 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
          <XCircle size={15} /> Cancelado
        </span>
      )
    return (
      <span className="inline-flex items-center gap-1 bg-pink-100 border border-pink-300 text-pink-700 px-3 py-1 rounded-full text-xs font-bold">
        Agendado
      </span>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-white text-zinc-800 px-4 sm:px-8 md:px-12 lg:px-20 py-10 text-sm">
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm"
          >
            <Home size={18} />
            Início
          </button>
          <h1 className="text-2xl font-bold text-pink-700">📅 Agendamentos</h1>
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
      {sucesso && <p className="text-green-700 bg-green-100 border border-green-200 rounded-md px-4 py-2 mb-2">{sucesso}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
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
            className="rounded-xl shadow-xl p-4 border border-pink-200 bg-white/80 backdrop-blur-md calendar-modern"
          />
        </div>
        {/* Horários disponíveis */}
        <div>
          <h3 className="text-lg font-semibold text-pink-700 mb-2">⏳ Horários Disponíveis</h3>
          {horariosDisponiveis.length === 0 ? (
            <p className="text-gray-600">Nenhum horário disponível.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in">
              {horariosDisponiveis.map((hora) => (
                <span
                  key={hora}
                  className="bg-white border border-pink-300 text-pink-700 px-4 py-[6px] rounded-full text-sm font-medium shadow hover:bg-pink-300 hover:text-pink-900 hover:shadow-pink-400/70 hover:scale-105 transition-all duration-300 text-center leading-tight flex items-center justify-center cursor-pointer"
                >
                  {hora}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Foto do operador */}
        <div className="flex justify-center items-start">
          <img
            src={
              operadorSelecionado === 'todos'
                ? '/logo.png'
                : fotoOperador(operadorSelecionado)
            }
            alt="Foto do operador"
            className="w-full max-w-md h-[280px] object-cover rounded-lg shadow-xl bg-zinc-100 mx-auto mt-4"
          />
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
                <p><b>👤 Cliente:</b> {nomeCliente(a.user_id)}</p>
                <p><b>👩‍🔧 Profissional:</b> {nomeOperador(a.operador_id)}</p>
                <p><b>💅 Serviço:</b> {nomeServico(a.service_id)}</p>
                <p><b>🕒 Horário:</b> {format(new Date(a.data_hora), 'HH:mm')}</p>
                <p className="text-xs mt-1 text-pink-600 font-mono">
                  <b>ID Atendimento:</b> {a.codigo_atendimento || a.id}
                </p>
                <p><b>Status:</b> {badge(a.status)}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {a.status === 'agendado' && (
                    <>
                      <button
                        type="button"
                        onClick={() => marcarComoConcluido(a.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition shadow hover:shadow-green-400/40"
                      >
                        <CheckCircle size={16} /> Concluir
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelarAgendamento(a.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition shadow hover:shadow-red-400/40"
                      >
                        <XCircle size={16} /> Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => reagendarAgendamento(a.service_id, a.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition shadow hover:shadow-blue-400/40 flex items-center gap-1"
                      >
                        <RotateCcw size={16} /> Reagendar
                      </button>
                    </>
                  )}
                  {a.status === 'concluído' && (
                    <span className="text-green-700 font-semibold">Atendimento concluído</span>
                  )}
                  {a.status === 'cancelado' && (
                    <span className="text-red-600 font-semibold">Atendimento cancelado</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <style jsx global>{`
        .react-calendar__tile.highlight {
          background: #fee2e2 !important;
          color: #be185d !important;
          font-weight: bold;
          border-radius: 999px;
          box-shadow: 0 0 0 2px #f472b644;
          transition: background 0.2s;
        }
      `}</style>
    </main>
  )
}
