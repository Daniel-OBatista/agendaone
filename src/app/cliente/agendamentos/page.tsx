'use client'

import { Suspense, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format, isSameDay, parseISO, isBefore, isAfter, isSunday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Home, RotateCcw, CheckCircle } from 'lucide-react'

type Servico = { id: string; nome: string; valor: number; duracao?: number }
type Operador = {
  id: string
  nome: string
  foto_url?: string
  bloqueio_inicio?: string | null
  bloqueio_fim?: string | null
  trabalha_sabado?: boolean | null
  horarios?: HorarioDia[]
}
type HorarioDia = null | {
  dia_semana: number
  inicio: string
  fim: string
  almoco_inicio: string
  almoco_fim: string
}

type Agendamento = {
  id: string
  data_hora: string
  status: string
  operador_id: string
}

export default function ClienteAgendarPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center mt-12 text-pink-600">Carregando...</div>}>
      <ClienteAgendarPage />
    </Suspense>
  )
}

function ClienteAgendarPage() {
  const router = useRouter()
  const search = useSearchParams()
  const serviceId = search.get('service') || ''
  const reagendarId = search.get('reagendar') || ''

  const [servicos, setServicos] = useState<Servico[]>([])
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [operadorId, setOperadorId] = useState<string>('')
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date())
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [duracao, setDuracao] = useState<number>(60)

  // Feriados fixos (pt-BR, personalizar conforme a necessidade)
  const feriados = [
    '01-01', '21-04', '01-05', '07-09', '12-10', '02-11', '15-11', '25-12'
  ]

  useEffect(() => {
    async function fetchData() {
      setCarregando(true)
      setErro('')
      try {
        const { data: svcs } = await supabase.from('services').select('*')
        setServicos(svcs || [])
        // Busca todos operadores com campos de bloqueio e horários
        const { data: ops } = await supabase
          .from('operadores')
          .select('id, nome, foto_url, bloqueio_inicio, bloqueio_fim, trabalha_sabado')
        const operadoresComHorarios = await Promise.all(
          (ops || []).map(async (op: any) => {
            const { data: hs } = await supabase
              .from('horarios_operador')
              .select('*')
              .eq('operador_id', op.id)
            const horarios: HorarioDia[] = [null, null, null, null, null, null]
            if (hs) {
              hs.forEach((h: any) => {
                const idx = (h.dia_semana ?? 1) - 1
                if (idx >= 0 && idx < 6) {
                  horarios[idx] = {
                    dia_semana: h.dia_semana,
                    inicio: h.hora_inicio,
                    fim: h.hora_fim,
                    almoco_inicio: h.almoco_inicio,
                    almoco_fim: h.almoco_fim,
                  }
                }
              })
            }
            return { ...op, horarios }
          })
        )
        setOperadores(operadoresComHorarios)
      } catch (e) {
        setErro('Erro ao carregar dados iniciais.')
      }
      setCarregando(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    async function buscar() {
      if (!operadorId) return
      setCarregando(true)
      setErro('')
      const serv = servicos.find(s => s.id === serviceId)
      setDuracao(serv?.duracao ?? 60)
      const { data: ags } = await supabase
        .from('appointments')
        .select('id, data_hora, status, operador_id')
        .eq('operador_id', operadorId)
        .in('status', ['agendado', 'concluído'])
      setAgendamentos(ags || [])
      setCarregando(false)
    }
    buscar()
    // eslint-disable-next-line
  }, [operadorId, serviceId])

  function isFeriado(date: Date) {
    const mes = String(date.getMonth() + 1).padStart(2, '0')
    const dia = String(date.getDate()).padStart(2, '0')
    return feriados.includes(`${dia}-${mes}`)
  }
  function isAusenciaBloqueada(date: Date, operador?: Operador) {
    if (!operador?.bloqueio_inicio || !operador?.bloqueio_fim) return false
    const inicio = parseISO(operador.bloqueio_inicio)
    const fim = parseISO(operador.bloqueio_fim)
    return isAfter(date, inicio) && isBefore(date, fim)
  }
  function isDiaDisponivel(date: Date) {
    if (!operadorId) return false
    const operador = operadores.find(op => op.id === operadorId)
    if (!operador) return false
    if (isFeriado(date)) return false
    if (isSunday(date)) return false
    if (isAusenciaBloqueada(date, operador)) return false
    // Sábado só se permitido
    if (date.getDay() === 6 && !operador.trabalha_sabado) return false
    // Precisa ter expediente cadastrado nesse dia
    const idx = date.getDay() === 0 ? 6 : date.getDay() - 1
    if (!operador.horarios?.[idx]) return false
    return true
  }

  // CORRIGIDO: Checagem explícita de null nos campos de almoço!
  function gerarHorariosDisponiveis() {
    if (!operadorId || !isDiaDisponivel(dataSelecionada)) return []
    const operador = operadores.find(op => op.id === operadorId)
    if (!operador) return []
    const idx = dataSelecionada.getDay() === 0 ? 6 : dataSelecionada.getDay() - 1
    const horarioDia = operador.horarios?.[idx]
    if (!horarioDia) return []

    const agsDoDia = agendamentos
      .filter(a => isSameDay(parseISO(a.data_hora), dataSelecionada))
      .map(a => format(parseISO(a.data_hora), 'HH:mm'))

    const horarios: string[] = []
    const inicio = horarioDia.inicio
    const fim = horarioDia.fim
    const almIni = horarioDia.almoco_inicio
    const almFim = horarioDia.almoco_fim

    let [h, m] = inicio.split(':').map(Number)
    const [hf, mf] = fim.split(':').map(Number)
    const [ha, ma] = almIni ? almIni.split(':').map(Number) : [null, null]
    const [hfAlm, mfAlm] = almFim ? almFim.split(':').map(Number) : [null, null]
    const step = duracao

    while (h < hf || (h === hf && m < mf)) {
      const horarioStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

      let emAlmoco = false
      if (ha !== null && ma !== null && hfAlm !== null && mfAlm !== null) {
        // início do almoço: ha:ma   fim do almoço: hfAlm:mfAlm
        const horaAtual = h * 60 + m
        const inicioAlmoco = (ha as number) * 60 + (ma as number)
        const fimAlmoco = (hfAlm as number) * 60 + (mfAlm as number)
        if (horaAtual >= inicioAlmoco && horaAtual < fimAlmoco) {
          emAlmoco = true
        }
      }

      const disponivel = !agsDoDia.includes(horarioStr) && !emAlmoco

      if (disponivel) {
        horarios.push(horarioStr)
      }
      // Avança o intervalo
      m += step
      while (m >= 60) { h++; m -= 60 }
    }

    return horarios
  }

  const horariosDisponiveis = gerarHorariosDisponiveis()
  const operadorSelecionado = operadores.find(op => op.id === operadorId)
  const servicoSelecionado = servicos.find(s => s.id === serviceId)

  function tileDisabled({ date }: { date: Date }) {
    return !isDiaDisponivel(date)
  }

  async function agendar() {
    setErro('')
    if (!serviceId || !operadorId || !dataSelecionada || !horarioSelecionado) {
      setErro('Preencha todos os campos.')
      return
    }
    const [h, m] = horarioSelecionado.split(':').map(Number)
    const data = new Date(dataSelecionada)
    data.setHours(h)
    data.setMinutes(m)
    data.setSeconds(0)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.id) {
      setErro('Usuário não autenticado.')
      return
    }
    const existe = agendamentos.some(
      a => isSameDay(parseISO(a.data_hora), dataSelecionada) &&
        format(parseISO(a.data_hora), 'HH:mm') === horarioSelecionado
    )
    if (existe) {
      setErro('Horário já agendado.')
      return
    }

    const { error } = await supabase
      .from('appointments')
      .insert([{
        user_id: userData.user.id,
        service_id: serviceId,
        operador_id: operadorId,
        data_hora: data.toISOString(),
        status: 'agendado',
      }])

    if (error) {
      setErro('Erro ao agendar: ' + error.message)
    } else {
      setSucesso('Agendamento realizado com sucesso!')
      setTimeout(() => router.push('/cliente/agendamentos'), 1500)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-100 px-2 sm:px-8 md:px-16 py-10 relative overflow-x-hidden">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-pink-200 opacity-30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-fuchsia-200 opacity-25 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full flex flex-col items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pink-700 text-center mb-2">Agendar Serviço</h1>
        <span className="block h-1 w-2/3 mx-auto bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-full mt-2 animate-pulse" />
      </div>

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-7 items-start mb-10">
        <div className="flex flex-col items-center gap-3">
          <label className="text-pink-700 font-medium text-base mb-1">Profissional:</label>
          <select
            value={operadorId}
            onChange={e => setOperadorId(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-pink-300 p-2 bg-white text-base shadow focus:ring-2 focus:ring-pink-200"
          >
            <option value="">Selecione...</option>
            {operadores.map((op) => (
              <option key={op.id} value={op.id}>{op.nome}</option>
            ))}
          </select>
          {operadorSelecionado?.foto_url && (
            <img
              src={operadorSelecionado.foto_url}
              alt={operadorSelecionado.nome}
              className="w-full max-w-xs h-[180px] object-cover rounded-xl shadow-lg bg-zinc-100 mx-auto"
            />
          )}
        </div>
        <div className="flex flex-col items-center gap-3">
          <label className="text-pink-700 font-medium text-base mb-1">Serviço:</label>
          <select
            value={serviceId}
            disabled
            className="w-full max-w-xs rounded-lg border border-pink-300 p-2 bg-white text-base shadow"
          >
            <option value="">Selecione...</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
          {servicoSelecionado && (
            <span className="text-green-700 font-bold mt-1">
              {servicoSelecionado.valor ? `R$ ${Number(servicoSelecionado.valor).toFixed(2)}` : ''}
            </span>
          )}
        </div>
        <div>
          <label className="text-pink-700 font-medium text-base mb-1">Escolha o dia:</label>
          <Calendar
            locale="pt-BR"
            onChange={(date) => {
              setDataSelecionada(date as Date)
              setHorarioSelecionado('')
            }}
            value={dataSelecionada}
            minDate={new Date()}
            tileDisabled={tileDisabled}
            calendarType="iso8601"
            formatShortWeekday={(locale, date) => format(date, 'EEEEE', { locale: ptBR })}
            formatMonthYear={(locale, date) => format(date, 'MMMM yyyy', { locale: ptBR })}
            className="w-full border-0 bg-transparent"
          />
          <div className="mt-4">
            <label className="text-pink-700 font-medium text-base mb-1">Horário disponível:</label>
            {carregando ? (
              <p className="text-zinc-500 mt-2">Carregando horários...</p>
            ) : !isDiaDisponivel(dataSelecionada) ? (
              <p className="text-zinc-500 mt-2">Data indisponível para este profissional.</p>
            ) : horariosDisponiveis.length === 0 ? (
              <p className="text-zinc-500 mt-2">Nenhum horário disponível para o dia selecionado.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {horariosDisponiveis.map((hora) => (
                  <button
                    key={hora}
                    className={`px-4 py-2 rounded-lg font-bold border text-base shadow-sm transition
                      ${horarioSelecionado === hora
                        ? 'bg-fuchsia-600 text-white border-fuchsia-600 scale-105'
                        : 'bg-white text-pink-700 border-pink-300 hover:bg-pink-100'
                      }
                    `}
                    onClick={() => setHorarioSelecionado(hora)}
                  >
                    {hora}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-3 mb-10">
        <button
          disabled={carregando || !operadorId || !serviceId || !dataSelecionada || !horarioSelecionado}
          onClick={agendar}
          className={`px-7 py-3 rounded-xl font-bold text-lg transition 
            shadow-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white
            hover:from-pink-700 hover:to-fuchsia-700
            ${carregando || !operadorId || !serviceId || !dataSelecionada || !horarioSelecionado
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:scale-105'
            }
          `}
        >
          Confirmar Agendamento
        </button>
      </div>
      {erro && (
        <div className="text-red-600 text-center mb-3">{erro}</div>
      )}
      {sucesso && (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-xl mb-3 text-base text-center shadow animate-fade-in-down max-w-md mx-auto flex items-center justify-center gap-2">
          <CheckCircle size={22} /> {sucesso}
        </div>
      )}

      <style jsx global>{`
        .react-calendar__tile--now {
          background: #ffe4e6 !important;
          color: #d946ef !important;
          font-weight: bold;
          border-radius: 999px;
          box-shadow: 0 0 0 2px #f472b644;
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.8s cubic-bezier(.48,1.62,.44,.91) both;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px);}
          to { opacity: 1; transform: translateY(0);}
        }
      `}</style>
    </main>
  )
}
