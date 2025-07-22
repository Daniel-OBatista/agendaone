'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'

type Operador = {
  id: string
  nome: string
  foto_url?: string
}

type Servico = {
  id: string
  nome: string
  valor: number
  duracao?: number
}

export default function AgendarClientePage() {
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [operadorId, setOperadorId] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [horaSelecionada, setHoraSelecionada] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      const { data: ops } = await supabase.from('operadores').select('id, nome, foto_url').order('nome')
      setOperadores(ops || [])
      const { data: svs } = await supabase.from('services').select('id, nome, valor, duracao').order('nome')
      setServicos(svs || [])
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (operadorId && servicoId && dataSelecionada) {
      buscarHorariosDisponiveis()
    } else {
      setHorariosDisponiveis([])
      setHoraSelecionada('')
    }
    // eslint-disable-next-line
  }, [operadorId, servicoId, dataSelecionada])

  async function buscarHorariosDisponiveis() {
    setHorariosDisponiveis([])
    setHoraSelecionada('')

    const servico = servicos.find((s) => s.id === servicoId)
    const duracao = servico?.duracao || 60 // minutos (padrão 60)

    // Horários das 08h às 18h, exceto 12h (almoço)
    const horarios: string[] = []
    for (let h = 8; h < 18; h++) {
      if (h === 12) continue
      horarios.push(`${String(h).padStart(2, '0')}:00`)
    }

    // Busca agendamentos já ocupados (CONSIDERANDO STATUS!)
    const inicio = new Date(format(dataSelecionada!, 'yyyy-MM-dd') + 'T00:00:00').toISOString()
    const fim = new Date(format(dataSelecionada!, 'yyyy-MM-dd') + 'T23:59:59').toISOString()
    const { data: ags } = await supabase
      .from('appointments')
      .select('data_hora, status')
      .eq('operador_id', operadorId)
      .gte('data_hora', inicio)
      .lte('data_hora', fim)

    // Só bloqueia horários de agendamentos AGENDADOS ou CONCLUÍDOS
    const ocupados = (ags || [])
      .filter(a => a.status === 'agendado' || a.status === 'concluído')
      .map(a => format(parseISO(a.data_hora), 'HH:mm'))

    let horariosFiltrados = horarios.filter(h => !ocupados.includes(h))

    // AJUSTE: no dia atual, só mostra horários futuros
    if (
      dataSelecionada &&
      format(dataSelecionada, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ) {
      const horaAtual = new Date().getHours()
      horariosFiltrados = horariosFiltrados.filter(horaStr => {
        const [h] = horaStr.split(':').map(Number)
        return h > horaAtual
      })
    }

    setHorariosDisponiveis(horariosFiltrados)
  }

  async function agendar() {
    setErro('')
    setSuccess('')
    setCarregando(true)

    if (!operadorId || !servicoId || !dataSelecionada || !horaSelecionada) {
      setErro('Selecione colaborador, serviço, data e horário.')
      setCarregando(false)
      return
    }

    // Busca usuário logado
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user?.id) {
      setErro('Você precisa estar logado.')
      setCarregando(false)
      return
    }

    // Busca e-mail do usuário
    const { data: userInfo } = await supabase
      .from('users')
      .select('email, nome')
      .eq('id', userData.user.id)
      .single()

    const dataHoraISO = new Date(
      format(dataSelecionada!, 'yyyy-MM-dd') + `T${horaSelecionada}:00`
    ).toISOString()

    // Verifica conflito
    const { data: conflitos } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('operador_id', operadorId)
      .eq('data_hora', dataHoraISO)

    // Só bloqueia se status for agendado/concluído
    const conflitoValido = (conflitos || []).find(c => c.status === 'agendado' || c.status === 'concluído')
    if (conflitoValido) {
      setErro('Horário já ocupado. Escolha outro.')
      setCarregando(false)
      return
    }

    // Salva no banco
    const { error: insertError } = await supabase.from('appointments').insert([{
      user_id: userData.user.id,
      operador_id: operadorId,
      service_id: servicoId,
      data_hora: dataHoraISO,
      status: 'agendado'
    }])

    if (insertError) {
      setErro(insertError.message)
      setCarregando(false)
      return
    }

    // Envia e-mail (ajuste sua rota de envio real)
    await fetch('/api/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userInfo?.email,
        subject: 'Confirmação de agendamento',
        html: `
          <h2>Agendamento confirmado!</h2>
          <p>Olá ${userInfo?.nome}, seu agendamento foi realizado com sucesso.</p>
          <ul>
            <li><b>Serviço:</b> ${servicos.find(s => s.id === servicoId)?.nome}</li>
            <li><b>Colaborador:</b> ${operadores.find(o => o.id === operadorId)?.nome}</li>
            <li><b>Data:</b> ${format(dataSelecionada!, 'dd/MM/yyyy')}</li>
            <li><b>Horário:</b> ${horaSelecionada}</li>
          </ul>
        `
      })
    })

    setSuccess('Agendamento realizado com sucesso! Confira seu e-mail.')
    setCarregando(false)
    setHoraSelecionada('')
    setDataSelecionada(null)
    setOperadorId('')
    setServicoId('')
    setHorariosDisponiveis([])
    setTimeout(() => router.push('/cliente/agendamentos'), 1600)
  }

  // Marca dias disponíveis (pode customizar para só marcar dias realmente disponíveis, se quiser)
  const marcarDias = ({ date }: { date: Date }) => {
    const hoje = new Date()
    if (date >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
      return 'highlight'
    }
    return undefined
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-white text-zinc-800 px-4 py-10 flex justify-center">
      <div className="bg-white/80 rounded-2xl shadow-xl ring-2 ring-pink-200 max-w-2xl w-full p-8 space-y-6">
        {/* BOTÃO DE INÍCIO */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/cliente')}
            className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm shadow"
          >
            <Home size={18} />
            Início
          </button>
          <h1 className="text-2xl font-bold text-pink-700 text-center w-full">Agendar Serviço</h1>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-pink-700">Colaborador:</label>
            <select
              className="w-full border border-pink-300 p-2 rounded text-zinc-700"
              value={operadorId}
              onChange={e => {
                setOperadorId(e.target.value)
                setDataSelecionada(null)
                setHoraSelecionada('')
                setHorariosDisponiveis([])
              }}
            >
              <option value="">Selecione um colaborador</option>
              {operadores.map((o) => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-pink-700">Serviço:</label>
            <select
              className="w-full border border-pink-300 p-2 rounded text-zinc-700"
              value={servicoId}
              onChange={e => {
                setServicoId(e.target.value)
                setHoraSelecionada('')
                setHorariosDisponiveis([])
              }}
            >
              <option value="">Selecione um serviço</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>{s.nome} - R${Number(s.valor).toFixed(2)}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <label className="block mb-2 text-sm font-medium text-pink-700">Data:</label>
          <Calendar
            locale="pt-BR"
            minDate={new Date()}
            onChange={date => setDataSelecionada(date as Date)}
            value={dataSelecionada}
            tileClassName={marcarDias}
            calendarType="iso8601"
            formatShortWeekday={(locale, date) => format(date, 'EEEEE', { locale: ptBR })}
            formatMonthYear={(locale, date) => format(date, 'MMMM yyyy', { locale: ptBR })}
            className="rounded-xl shadow p-3 border border-pink-200 bg-white/90 calendar-modern mx-auto"
            tileDisabled={({ date }) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>
        
        {dataSelecionada && operadorId && servicoId && (
          <div>
            <h3 className="text-lg font-semibold text-pink-700 mb-2 mt-6">⏳ Horários Disponíveis</h3>
            {horariosDisponiveis.length === 0 ? (
              <p className="text-gray-600">Nenhum horário disponível para este dia.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {horariosDisponiveis.map((hora) => (
                  <button
                    key={hora}
                    type="button"
                    onClick={() => setHoraSelecionada(hora)}
                    className={`border px-4 py-2 rounded-full shadow transition-all
                      ${horaSelecionada === hora
                        ? 'bg-pink-500 text-white border-pink-600 scale-105'
                        : 'bg-white text-pink-700 border-pink-300 hover:bg-pink-50 hover:scale-105'}`}
                  >
                    {hora}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={agendar}
          disabled={carregando || !operadorId || !servicoId || !dataSelecionada || !horaSelecionada}
          className="w-full mt-8 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white py-3 rounded-full font-bold hover:scale-105 transition-all shadow-lg ring-2 ring-pink-300"
        >
          {carregando ? 'Agendando...' : 'Confirmar Agendamento'}
        </button>

        {erro && <p className="text-red-500 text-sm mt-2 text-center">{erro}</p>}
        {success && <p className="text-green-600 text-sm mt-2 text-center">{success}</p>}
      </div>
    </main>
  )
}
