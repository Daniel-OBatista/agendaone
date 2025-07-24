'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, RotateCcw, XCircle, CheckCircle } from 'lucide-react'

type AgendamentoUsuario = {
  id: string
  codigo_atendimento?: string
  data_hora: string
  status: string
  service_id: string
  operador_id: string
}

type Servico = { id: string; nome: string; valor?: number }
type Colaborador = { id: string; nome: string }
type Cliente = { id: string; nome: string }

type FiltroStatus = 'all' | 'concluído' | 'cancelado' | 'proximos'

const statusLabels: Record<FiltroStatus, string> = {
  all: 'Todos',
  concluído: 'Concluídos',
  cancelado: 'Cancelados',
  proximos: 'Próximos',
}

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoUsuario[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('proximos')
  const router = useRouter()

  async function fetchTudo() {
    setCarregando(true)
    setErro('')
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user?.id) {
      setErro('Você precisa estar logado.')
      setCarregando(false)
      return
    }
    const { data: cli } = await supabase
      .from('users')
      .select('id, nome')
      .eq('id', userData.user.id)
      .single()
    setCliente(cli)

    const { data: ags, error: errA } = await supabase
      .from('appointments')
      .select('id, codigo_atendimento, data_hora, status, service_id, operador_id')
      .eq('user_id', userData.user.id)
      .order('data_hora', { ascending: true })

    const { data: svcs, error: errS } = await supabase
      .from('services')
      .select('id, nome, valor')

    const { data: cols, error: errC } = await supabase
      .from('operadores')
      .select('id, nome')

    if (errA || errS || errC) {
      setErro('Erro ao carregar dados.')
    } else {
      setAgendamentos(ags || [])
      setServicos(svcs || [])
      setColaboradores(cols || [])
    }
    setCarregando(false)
  }

  useEffect(() => {
    fetchTudo()
    // eslint-disable-next-line
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
      await fetchTudo()
      setSucesso('Agendamento cancelado com sucesso!')
      setTimeout(() => setSucesso(''), 4000)
    }
  }

  async function reagendar(serviceId: string, agendamentoId: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelado' })
      .eq('id', agendamentoId)

    if (error) {
      setErro('Erro ao cancelar agendamento antes de reagendar: ' + error.message)
      setTimeout(() => setErro(''), 4000)
      return
    }

    await fetchTudo()
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
        <span className="inline-flex items-center gap-1 bg-red-100 border border-red-300 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
          <XCircle size={15} /> Cancelado
        </span>
      )
    if (status === 'concluído')
      return (
        <span className="inline-flex items-center gap-1 bg-green-100 border border-green-300 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
          <CheckCircle size={15} /> Concluído
        </span>
      )
    return null // Não mostra badge "Agendado"
  }

  // Ordena agendamentos: agendado > concluído > cancelado > data/hora
  const statusOrder = { agendado: 0, concluído: 1, cancelado: 2 } as const
  const getOrder = (status: string) => statusOrder[status as keyof typeof statusOrder] ?? 99

  // Filtro de status
  const agendamentosFiltrados = agendamentos
    .filter(a => {
      if (filtroStatus === 'all') return true
      if (filtroStatus === 'proximos') {
        return a.status === 'agendado' && new Date(a.data_hora) >= new Date()
      }
      return a.status === filtroStatus
    })
    .sort((a, b) => {
      const statusDiff = getOrder(a.status) - getOrder(b.status)
      if (statusDiff !== 0) return statusDiff
      return new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
    })

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-100 flex flex-col items-center py-6 px-2">
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Header centralizado */}
        <div className="relative flex items-center mb-6 mt-2 w-full min-h-[40px]">
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <button
              onClick={() => router.push('/cliente')}
              className="flex items-center gap-2 bg-pink-500 text-white px-5 py-2 rounded-full hover:bg-pink-600 text-lg shadow font-semibold"
            >
              <Home size={20} /> Início
            </button>
          </div>
          <h1 className="w-full text-4xl font-extrabold text-pink-700 text-center tracking-tight" style={{ letterSpacing: '.01em' }}>
            Meus Agendamentos
          </h1>
        </div>

        {/* Filtros de status, "Agendados" removido */}
        <div className="w-full mb-5 flex flex-wrap items-center justify-center gap-3">
          {(['proximos', 'all', 'concluído', 'cancelado'] as FiltroStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={`px-4 py-1.5 rounded-full font-bold border text-sm shadow-sm transition
                ${
                  filtroStatus === status
                    ? status === 'concluído'
                      ? 'bg-green-500 text-white border-green-400'
                      : status === 'cancelado'
                      ? 'bg-red-500 text-white border-red-400'
                      : status === 'proximos'
                      ? 'bg-fuchsia-600 text-white border-fuchsia-400'
                      : 'bg-zinc-300 text-zinc-800 border-zinc-300'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-pink-50'
                }
              `}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>

        {sucesso && (
          <div className="bg-green-100 text-green-800 border border-green-200 px-4 py-2 rounded-xl mb-2 text-base text-center shadow animate-fade-in-down w-full max-w-md">
            {sucesso}
          </div>
        )}

        {carregando ? (
          <div className="w-full text-center text-zinc-500 py-8">Carregando...</div>
        ) : erro ? (
          <div className="text-red-500 text-center">{erro}</div>
        ) : agendamentosFiltrados.length === 0 ? (
          <div className="text-zinc-600 text-center text-lg py-8">
            Nenhum agendamento encontrado.
          </div>
        ) : (
          <div className="flex flex-col gap-7 w-full">
            {agendamentosFiltrados.map((a) => {
              const servico = servicos.find(s => s.id === a.service_id)
              const colaborador = colaboradores.find(c => c.id === a.operador_id)
              const podeAlterar = a.status === 'agendado' && new Date(a.data_hora) > new Date()
              return (
                <div
                  key={a.id}
                  className="relative bg-white/80 border-2 border-pink-200 rounded-3xl shadow-xl p-7 flex flex-col gap-2 backdrop-blur-xl transition-all duration-200"
                  style={{
                    boxShadow: '0 8px 40px 0 rgba(232, 121, 249, 0.12), 0 2px 8px 0 rgba(238, 51, 130, 0.03)',
                    background: 'linear-gradient(135deg, #fffafd 80%, #ffe6f6 100%)',
                  }}
                >
                  <div className="flex flex-col space-y-4">
                    <span className="text-zinc-700 text-base"><b>Cliente:</b> {cliente?.nome || '---'}</span>
                    <span className="text-zinc-700 text-base"><b>Profissional:</b> {colaborador?.nome || '---'}</span>
                    <span className="text-zinc-700 text-base"><b>Serviço:</b> {servico?.nome || '---'}</span>
                  </div>
                  <div className="flex gap-2 items-center mb-1">
                    <span className="text-zinc-700 font-semibold">Valor:</span>
                    <span className="text-green-700 text-lg font-bold">
                      {servico?.valor != null ? `R$ ${Number(servico.valor).toFixed(2)}` : '--'}
                    </span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-zinc-700 font-medium">Data/Hora:</span>
                    <span className="font-bold text-base text-zinc-900">{formatarData(a.data_hora)}</span>
                  </div>
                  {statusBadge(a.status)}
                  {podeAlterar && (
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => cancelarAgendamento(a.id)}
                        className="flex items-center gap-1 bg-white border border-red-300 text-red-600 hover:bg-red-50 px-4 py-1.5 rounded-md font-medium text-base shadow-sm transition"
                      >
                        <XCircle size={16} /> Cancelar
                      </button>
                      <button
                        onClick={() => reagendar(a.service_id, a.id)}
                        className="flex items-center gap-1 bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 px-4 py-1.5 rounded-md font-medium text-base shadow-sm transition"
                      >
                        <RotateCcw size={16} /> Reagendar
                      </button>
                    </div>
                  )}
                  {/* Badge de ID no rodapé do card */}
                  <div className="mt-5 text-xs text-pink-700 font-mono select-all w-full">
                    <span className="inline-block bg-pink-50 border border-pink-300 px-3 py-1 rounded-full">
                      ID: {a.codigo_atendimento || a.id}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
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
