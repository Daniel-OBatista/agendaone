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
type HorarioDia = null | {
  dia_semana: number
  inicio: string
  fim: string
  almoco_inicio: string
  almoco_fim: string
}
type Operador = { id: string; nome: string; foto_url?: string; horarios?: HorarioDia[] }
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
  const [horariosOperador, setHorariosOperador] = useState<HorarioDia[]>([])

  const router = useRouter()

  async function fetchRelacionamentos() {
    // Carrega operadores + horários
    const { data: ops } = await supabase.from('operadores').select('id, nome, foto_url')
    let operadoresComHorarios = []
    if (ops) {
      operadoresComHorarios = await Promise.all(
        ops.map(async (op: Operador) => {
          const { data: horarios } = await supabase
            .from('horarios_operador')
            .select('*')
            .eq('operador_id', op.id)
          // Monta array de 6 posições (segunda a sábado)
          const horariosArray: HorarioDia[] = [null, null, null, null, null, null]
          if (horarios && horarios.length > 0) {
            horarios.forEach((h: any) => {
              const idx = (h.dia_semana ?? 1) - 1
              if (idx >= 0 && idx < 6) {
                horariosArray[idx] = {
                  dia_semana: h.dia_semana,
                  inicio: h.hora_inicio,
                  fim: h.hora_fim,
                  almoco_inicio: h.almoco_inicio,
                  almoco_fim: h.almoco_fim,
                }
              }
            })
          }
          return { ...op, horarios: horariosArray }
        })
      )
      setOperadores(operadoresComHorarios)
    }
    const { data: svs } = await supabase.from('services').select('id, nome')
    setServicos(svs || [])
    const { data: cls } = await supabase.from('users').select('id, nome')
    setClientes(cls || [])
  }

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

  // Carregar horários do operador quando muda seleção
  useEffect(() => {
    if (operadorSelecionado === 'todos') {
      setHorariosOperador([])
      return
    }
    const op = operadores.find(o => o.id === operadorSelecionado)
    setHorariosOperador(op?.horarios || [])
  }, [operadorSelecionado, operadores])

  useEffect(() => { fetchRelacionamentos() }, [])
  useEffect(() => { fetchAgendamentos() }, [operadorSelecionado, dataSelecionada])

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

  // Monta agendamentos do dia
  const agendamentosDoDia = agendamentos.filter((a) =>
    isSameDay(parseISO(a.data_hora), dataSelecionada) &&
    (operadorSelecionado === 'todos' || a.operador_id === operadorSelecionado)
  )

  // Pega horários já agendados
  const horariosAgendados = agendamentosDoDia
    .filter((a) => a.status === 'agendado' || a.status === 'concluído')
    .map((a) => format(new Date(a.data_hora), 'HH:mm'))

  // Pega horários do operador selecionado (ou padrão 08-18h c/ almoço)
  function gerarHorariosDisponiveis() {
    let horarios: string[] = []
    // Pega a configuração do operador selecionado ou padrão
    let expIni = '08:00', expFim = '18:00', mAlmIni: string | null = '12:00', mAlmFim: string | null = '13:00'
    if (operadorSelecionado !== 'todos' && horariosOperador.length > 0) {
      // Descobre o dia da semana da data selecionada (segunda=1 ... sábado=6)
      const idx = dataSelecionada.getDay() - 1 // segunda=1
      const confDia = horariosOperador[idx]
      if (confDia) {
        expIni = confDia.inicio || '08:00'
        expFim = confDia.fim || '18:00'
        mAlmIni = confDia.almoco_inicio || null
        mAlmFim = confDia.almoco_fim || null
      }
    }
    // Gera horários de acordo com expediente e almoço
    const [iniH, iniM] = expIni.split(':').map(Number)
    const [fimH, fimM] = expFim.split(':').map(Number)
    for (let h = iniH; h < fimH; h++) {
      for (let m = h === iniH ? iniM : 0; m < 60; m += 60) {
        // pula horário de almoço se configurado
        if (mAlmIni && mAlmFim) {
          const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
          if (horaStr >= mAlmIni && horaStr < mAlmFim) continue
        }
        const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        horarios.push(horaStr)
      }
    }
    // Remove horários já agendados
    if (format(dataSelecionada, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
      const horaAtual = new Date().getHours()
      return horarios.filter(horaStr => {
        const [h] = horaStr.split(':').map(Number)
        return h > horaAtual && !horariosAgendados.includes(horaStr)
      })
    }
    return horarios.filter(hora => !horariosAgendados.includes(hora))
  }
  const horariosDisponiveis = gerarHorariosDisponiveis()

  const marcarDias = ({ date }: { date: Date }) => {
    const tem = agendamentos.some((a) => isSameDay(parseISO(a.data_hora), date))
    return tem ? 'highlight' : undefined
  }

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
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-fuchsia-100 text-zinc-800 px-2 sm:px-8 md:px-16 py-10 relative overflow-x-hidden">
      {/* BG Blur */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-pink-200 opacity-30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-fuchsia-200 opacity-25 rounded-full blur-2xl pointer-events-none" />

      {/* Botão Início flutuante */}
      <button
        type="button"
        onClick={() => router.push('/admin')}
        className="fixed top-5 left-5 z-30 bg-gradient-to-br from-pink-100 to-fuchsia-100 border border-pink-300 text-pink-600 p-3 rounded-full shadow-lg hover:from-pink-500 hover:to-fuchsia-500 hover:text-white hover:scale-110 transition-all"
        title="Voltar para o início"
        aria-label="Início"
      >
        <Home size={28} />
      </button>

      {/* Botão Atualizar flutuante */}
      <button
        onClick={fetchAgendamentos}
        className="fixed bottom-6 right-6 z-30 bg-gradient-to-br from-pink-100 to-fuchsia-200 border border-pink-300 text-pink-700 p-4 rounded-full shadow-2xl hover:from-fuchsia-600 hover:to-pink-600 hover:text-white hover:scale-110 transition-all"
        title="Atualizar agendamentos"
        aria-label="Atualizar"
      >
        <RotateCcw size={22} />
      </button>

      {/* TÍTULO CENTRALIZADO */}
      <div className="w-full flex flex-col items-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-pink-700 text-center tracking-tight relative inline-block leading-tight drop-shadow-pink-100">
          Meus atendimentos
          <span className="block h-1 w-2/3 mx-auto bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-full mt-4 animate-pulse transition-all duration-300" />
        </h1>
      </div>

      {/* GRELHA: Calendário, Horários, Foto+Filtro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7 items-start mb-10">
        {/* Calendário */}
        <div className="calendar-modern bg-white/80 rounded-2xl shadow-xl p-3 border-2 border-pink-100 backdrop-blur-lg">
          <Calendar
            locale="pt-BR"
            onChange={(date) => setDataSelecionada(date as Date)}
            value={dataSelecionada}
            tileClassName={marcarDias}
            calendarType="iso8601"
            formatShortWeekday={(locale, date) => format(date, 'EEEEE', { locale: ptBR })}
            formatMonthYear={(locale, date) => format(date, 'MMMM yyyy', { locale: ptBR })}
            className="w-full border-0 bg-transparent"
          />
        </div>
        {/* Horários disponíveis */}
        <div className="w-full">
          <h3 className="text-lg font-bold text-pink-700 mb-2 text-center">⏳ Horários Disponíveis</h3>
          {horariosDisponiveis.length === 0 ? (
            <p className="text-gray-600 text-center">Nenhum horário disponível.</p>
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
        {/* Foto do operador + filtro */}
        <div className="flex flex-col items-center gap-3">
          <img
            src={
              operadorSelecionado === 'todos'
                ? '/logo.png'
                : fotoOperador(operadorSelecionado)
            }
            alt="Foto do operador"
            className="w-full max-w-md h-[230px] object-cover rounded-lg shadow-xl bg-zinc-100 mx-auto mt-4"
          />
          {/* Filtro ocupa a mesma largura da foto */}
          <div className="w-full max-w-md mt-2">
            <div className="bg-white/80 border border-pink-100 rounded-xl px-6 py-2 shadow flex items-center gap-3 w-full">
              <label className="text-sm text-pink-800 font-medium">Operador:</label>
              <select
                value={operadorSelecionado}
                onChange={(e) => setOperadorSelecionado(e.target.value)}
                className="border border-pink-200 rounded px-3 py-1 text-sm shadow bg-white focus:ring-2 focus:ring-pink-200 transition w-full"
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
        </div>
      </div>

      {/* LINHA FINA DIVISÓRIA */}
      <div className="w-full max-w-3xl mx-auto border-t-[1.5px] border-pink-300 mb-7 shadow-pink-100" />

      {/* TABELA DE AGENDAMENTOS */}
      <div className="max-w-3xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-2 text-center text-pink-700 tracking-wide">
          Agendamentos em {format(dataSelecionada, 'dd/MM/yyyy')}
        </h2>
        <p className="text-sm text-gray-700 text-center mb-4">
          📊 Total: {agendamentosDoDia.length} agendamento{agendamentosDoDia.length !== 1 ? 's' : ''}
        </p>
        {carregando ? (
          <div className="flex justify-center items-center h-32">
            <span className="w-10 h-10 border-4 border-pink-300 border-t-fuchsia-500 rounded-full animate-spin inline-block" />
            <span className="ml-3 text-pink-700 font-medium">Carregando agendamentos...</span>
          </div>
        ) : agendamentosDoDia.length === 0 ? (
          <p className="text-center text-gray-500">Nenhum agendamento neste dia.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="w-full text-sm bg-white/80 rounded-lg">
              <thead>
                <tr className="bg-pink-50 text-pink-900 font-bold">
                  <th className="py-2 px-3 text-left">Cliente</th>
                  <th className="py-2 px-3 text-left">Profissional</th>
                  <th className="py-2 px-3 text-left">Serviço</th>
                  <th className="py-2 px-3 text-center">Horário</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {agendamentosDoDia.map((a) => (
                  <tr key={a.id} className="border-t border-pink-100 hover:bg-pink-50/70 transition">
                    <td className="py-2 px-3">{nomeCliente(a.user_id)}</td>
                    <td className="py-2 px-3">{nomeOperador(a.operador_id)}</td>
                    <td className="py-2 px-3">{nomeServico(a.service_id)}</td>
                    <td className="py-2 px-3 text-center">{format(new Date(a.data_hora), 'HH:mm')}h</td>
                    <td className="py-2 px-3 text-center">{badge(a.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {erro && <p className="text-red-500 mt-4">{erro}</p>}
        {sucesso && <p className="text-green-700 bg-green-100 border border-green-200 rounded-md px-4 py-2 mt-2">{sucesso}</p>}
      </div>

      <style jsx global>{`
        /* Highlight para dias com agendamento */
        .react-calendar__tile.highlight {
          background: #fee2e2 !important;
          color: #be185d !important;
          font-weight: bold;
          border-radius: 999px;
          box-shadow: 0 0 0 2px #f472b644;
          transition: background 0.2s;
        }
        /* Bolinha estilizada para o dia de hoje */
        .react-calendar__tile--now {
          background: none !important;
          color: #be185d !important;
          position: relative;
          font-weight: bold;
        }
        .react-calendar__tile--now::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 6px;
          transform: translateX(-50%);
          width: 8px;
          height: 8px;
          background: #f43f5e;
          border-radius: 50%;
          box-shadow: 0 2px 8px #f472b680;
          display: block;
        }
        /* Seleção múltipla/single (não deixa sobrescrever o dot) */
        .react-calendar__tile--active {
          background: #fbcfe8 !important;
          color: #a21caf !important;
          border-radius: 1.8rem;
        }
        @media (max-width: 640px) {
          .calendar-modern {
            padding: 0.7rem 0.45rem !important;
            max-width: 94vw !important;
            margin-bottom: 1rem !important;
            border-radius: 1.15rem !important;
            box-shadow: 0 2px 8px #d946ef1a !important;
            font-size: 0.93rem !important;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.7s;
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px);}
          100% { opacity: 1; transform: none;}
        }
      `}</style>
    </main>
  )
}
