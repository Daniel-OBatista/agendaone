'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, RotateCcw, XCircle, CheckCircle } from 'lucide-react'

type AgendamentoUsuario = {
  id: string
  codigo_atendimento?: string // NOVO CAMPO
  data_hora: string
  status: string
  service_id: string
  operador_id: string
}

type Servico = { id: string; nome: string; valor?: number }
type Colaborador = { id: string; nome: string }
type Cliente = { id: string; nome: string }

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoUsuario[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const router = useRouter()

  async function fetchTudo() {
    setCarregando(true)
    setErro('')
    // Busca usuário logado
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user?.id) {
      setErro('Você precisa estar logado.')
      setCarregando(false)
      return
    }
    // Busca nome do cliente (opcional, pois é sempre o usuário logado)
    const { data: cli } = await supabase
      .from('users')
      .select('id, nome')
      .eq('id', userData.user.id)
      .single()
    setCliente(cli)

    // Agendamentos (BUSCA O NOVO CAMPO!)
    const { data: ags, error: errA } = await supabase
      .from('appointments')
      .select('id, codigo_atendimento, data_hora, status, service_id, operador_id')
      .eq('user_id', userData.user.id)
      .order('data_hora', { ascending: true })

    // Serviços
    const { data: svcs, error: errS } = await supabase
      .from('services')
      .select('id, nome, valor')

    // Colaboradores
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
        <span className="inline-flex items-center gap-1 bg-white/60 border border-red-200 text-red-500 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm">
          <XCircle size={13} /> Cancelado
        </span>
      )
    if (status === 'concluído')
      return (
        <span className="inline-flex items-center gap-1 bg-white/60 border border-green-200 text-green-600 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm">
          <CheckCircle size={13} /> Concluído
        </span>
      )
    return (
      <span className="inline-flex items-center gap-1 bg-white/60 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm">
        <CalendarIcon /> Agendado
      </span>
    )
  }

  function CalendarIcon() {
    return (
      <svg width="13" height="13" fill="currentColor" className="inline-block mr-0.5" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H5A3 3 0 002 7v8a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM5 7h10a1 1 0 011 1v1H4V8a1 1 0 011-1zm-1 4h12v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z"></path></svg>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-white flex justify-center items-center px-2">
      <div className="w-full max-w-6xl flex flex-col gap-6">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => router.push('/cliente')}
            className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-lg hover:bg-pink-600 text-sm shadow"
          >
            <Home size={18} />
            Início
          </button>
          <h1 className="text-2xl font-bold text-pink-700 text-center w-full">
            Meus Agendamentos
          </h1>
        </div>

        {sucesso && (
          <div className="bg-green-100 text-green-800 border border-green-200 px-4 py-2 rounded-xl mb-2 text-sm text-center shadow animate-fade-in-down">
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
          // TABLE DESKTOP
          <div className="overflow-x-auto hidden md:block rounded-2xl">
            <table className="w-full rounded-2xl overflow-hidden bg-white/60 backdrop-blur-lg shadow-xl border border-gray-100">
              <thead>
                <tr className="text-left text-zinc-700 text-sm uppercase bg-white/80">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Operador</th>
                  <th className="px-5 py-3">Serviço</th>
                  <th className="px-5 py-3">Valor</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Data/Hora</th>
                  <th className="px-5 py-3">ID Atendimento</th> {/* ALTERADO */}
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {agendamentos.map((a, idx) => {
                  const servico = servicos.find(s => s.id === a.service_id)
                  const colaborador = colaboradores.find(c => c.id === a.operador_id)
                  const podeAlterar = a.status === 'agendado' && new Date(a.data_hora) > new Date()

                  return (
                    <tr
                      key={a.id}
                      className={`text-base text-zinc-800 ${
                        idx % 2 === 0 ? 'bg-white/60' : 'bg-pink-50/50'
                      } border-b last:border-none`}
                    >
                      <td className="px-5 py-3">{cliente?.nome || '---'}</td>
                      <td className="px-5 py-3">{colaborador?.nome || '---'}</td>
                      <td className="px-5 py-3">{servico?.nome || '---'}</td>
                      <td className="px-5 py-3">
                        {servico?.valor != null ? `R$ ${Number(servico.valor).toFixed(2)}` : '--'}
                      </td>
                      <td className="px-5 py-3">{statusBadge(a.status)}</td>
                      <td className="px-5 py-3">{formatarData(a.data_hora)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-500">
                        {a.codigo_atendimento || a.id}
                      </td>
                      <td className="px-5 py-3">
                        {podeAlterar && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => cancelarAgendamento(a.id)}
                              className="flex items-center gap-1 bg-white/80 border border-gray-200 text-red-500 hover:bg-red-50 px-3 py-1 rounded-md font-medium text-xs shadow-sm transition"
                            >
                              <XCircle size={15} /> Cancelar
                            </button>
                            <button
                              onClick={() => reagendar(a.service_id, a.id)}
                              className="flex items-center gap-1 bg-white/80 border border-gray-200 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md font-medium text-xs shadow-sm transition"
                            >
                              <RotateCcw size={15} /> Reagendar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* MOBILE CARDS */}
        {!carregando && !erro && agendamentos.length > 0 && (
          <ul className="md:hidden flex flex-col gap-5">
            {agendamentos.map((a) => {
              const servico = servicos.find(s => s.id === a.service_id)
              const colaborador = colaboradores.find(c => c.id === a.operador_id)
              const podeAlterar = a.status === 'agendado' && new Date(a.data_hora) > new Date()
              return (
                <li
                  key={a.id}
                  className="backdrop-blur-lg bg-white/70 border border-gray-100 rounded-xl shadow p-4 flex flex-col gap-2"
                  style={{ boxShadow: "0 1px 12px 0 rgba(232, 121, 249, 0.09)" }}>
                  <div className="flex flex-wrap gap-1 items-center text-sm font-medium">
                    <span className="text-zinc-700"><b>Cliente:</b> {cliente?.nome || '---'}</span>
                    <span className="text-zinc-700"><b>Operador:</b> {colaborador?.nome || '---'}</span>
                    <span className="text-zinc-700"><b>Serviço:</b> {servico?.nome || '---'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 items-center text-sm">
                    <span className="text-zinc-600"><b>Valor:</b> {servico?.valor != null ? `R$ ${Number(servico.valor).toFixed(2)}` : '--'}</span>
                    <span className="text-zinc-600"><b>Status:</b> {statusBadge(a.status)}</span>
                  </div>
                  <div className="text-zinc-600 text-sm">
                    <b>Data/Hora:</b> {formatarData(a.data_hora)}
                  </div>
                  <div className="text-xs text-gray-400 select-all">
                    <b>ID Atendimento:</b> <span className="font-mono">{a.codigo_atendimento || a.id}</span>
                  </div>
                  {podeAlterar && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => cancelarAgendamento(a.id)}
                        className="flex items-center gap-1 bg-white/70 border border-gray-200 text-red-500 hover:bg-red-50 px-3 py-1 rounded-md font-medium text-xs shadow-sm transition"
                      >
                        <XCircle size={15} /> Cancelar
                      </button>
                      <button
                        onClick={() => reagendar(a.service_id, a.id)}
                        className="flex items-center gap-1 bg-white/70 border border-gray-200 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md font-medium text-xs shadow-sm transition"
                      >
                        <RotateCcw size={15} /> Reagendar
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
