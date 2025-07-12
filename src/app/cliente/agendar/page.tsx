'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

type Servico = {
  id: string
  nome: string
  descricao: string
  valor: number
}

export default function AgendarPage() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [servicoId, setServicoId] = useState('')
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horaSelecionada, setHoraSelecionada] = useState('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [agendamentoAntigoId, setAgendamentoAntigoId] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  const horariosFixos = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']

  // Pré-seleciona serviço e reagendamento (via URL)
  useEffect(() => {
    const service = searchParams.get('service')
    const reagendarId = searchParams.get('reagendar')

    if (service) setServicoId(service)
    if (reagendarId) setAgendamentoAntigoId(reagendarId)
  }, [searchParams])

  // Carrega serviços
  useEffect(() => {
    async function fetchServicos() {
      const { data, error } = await supabase.from('services').select('*')
      if (error) {
        console.error('Erro ao buscar serviços:', error.message)
        return
      }
      if (data) setServicos(data)
    }
    fetchServicos()
  }, [])

  // Atualiza horários disponíveis quando muda data ou serviço
  useEffect(() => {
    if (servicoId && dataSelecionada) {
      buscarHorariosDisponiveis(dataSelecionada, servicoId)
    } else {
      setHorariosDisponiveis([])
    }
  }, [servicoId, dataSelecionada])

  async function buscarHorariosDisponiveis(data: string, servicoId: string) {
    const inicio = new Date(`${data}T00:00:00`).toISOString()
    const fim = new Date(`${data}T23:59:59`).toISOString()

    const { data: agendamentos, error } = await supabase
      .from('appointments')
      .select('data_hora')
      .eq('service_id', servicoId)
      .gte('data_hora', inicio)
      .lte('data_hora', fim)

    const horariosOcupados = agendamentos?.map(a =>
      new Date(a.data_hora).toISOString().slice(11, 16)
    ) || []

    const disponiveis = horariosFixos.filter(h => !horariosOcupados.includes(h))
    setHorariosDisponiveis(disponiveis)
  }

  const agendar = async () => {
    setErro('')
    setCarregando(true)

    if (!servicoId || !dataSelecionada || !horaSelecionada) {
      setErro('Selecione um serviço, data e horário.')
      setCarregando(false)
      return
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user?.id) {
      setErro('Você precisa estar logado para agendar.')
      setCarregando(false)
      return
    }

    const dataHoraISO = new Date(`${dataSelecionada}T${horaSelecionada}`).toISOString()

    // Verifica conflito
    const { data: conflito, error: conflitoError } = await supabase
      .from('appointments')
      .select('id')
      .eq('service_id', servicoId)
      .eq('data_hora', dataHoraISO)

    if (conflitoError) {
      setErro('Erro ao verificar disponibilidade.')
      setCarregando(false)
      return
    }

    if (conflito.length > 0) {
      setErro('Horário já agendado. Escolha outro horário.')
      setCarregando(false)
      return
    }

    // Insere novo agendamento
    const { error: insertError } = await supabase.from('appointments').insert([
      {
        user_id: userData.user.id,
        service_id: servicoId,
        data_hora: dataHoraISO,
        status: 'agendado',
      },
    ])

    if (insertError) {
      setErro(insertError.message)
    } else {
      // Se estiver reagendando, cancela o anterior
      if (agendamentoAntigoId) {
        await supabase
          .from('appointments')
          .update({ status: 'cancelado' })
          .eq('id', agendamentoAntigoId)
      }

      router.push('/cliente/agendamentos')
    }

    setCarregando(false)
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-pink-700 mb-4">Agendar Serviço</h1>

      <label className="block mb-2 text-sm">Serviço:</label>
      <select
        className="w-full border p-2 mb-4 rounded"
        value={servicoId}
        onChange={(e) => {
          setServicoId(e.target.value)
          setHoraSelecionada('')
        }}
      >
        <option value="">Selecione um serviço</option>
        {servicos.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nome} - R${Number(s.valor).toFixed(2)}
          </option>
        ))}
      </select>

      <label className="block mb-2 text-sm">Data:</label>
      <input
        type="date"
        value={dataSelecionada}
        onChange={(e) => {
          setDataSelecionada(e.target.value)
          setHoraSelecionada('')
        }}
        className="w-full border p-2 rounded mb-4"
      />

      <label className="block mb-2 text-sm">Horário Disponível:</label>
      <select
        value={horaSelecionada}
        onChange={(e) => setHoraSelecionada(e.target.value)}
        className="w-full border p-2 rounded mb-4"
        disabled={!dataSelecionada || horariosDisponiveis.length === 0}
      >
        <option value="">Selecione um horário</option>
        {horariosDisponiveis.map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <button
        onClick={agendar}
        disabled={carregando}
        className="w-full bg-pink-500 text-white py-2 rounded hover:bg-pink-600"
      >
        {carregando ? 'Agendando...' : 'Confirmar Agendamento'}
      </button>

      {erro && <p className="text-red-500 text-sm mt-2">{erro}</p>}
    </main>
  )
}
