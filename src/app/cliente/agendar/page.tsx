'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AgendarPage() {
  const [servicos, setServicos] = useState<any[]>([])
  const [servicoId, setServicoId] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  // Buscar serviços ao carregar a página
  useEffect(() => {
    async function fetchServicos() {
      const { data, error } = await supabase.from('services').select('*')
      if (!error) setServicos(data)
    }
    fetchServicos()
  }, [])

  const agendar = async () => {
    setErro('')
    setCarregando(true)

    if (!servicoId || !dataHora) {
      setErro('Selecione um serviço e uma data/hora.')
      setCarregando(false)
      return
    }

    // Verifica o usuário logado
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user?.id) {
      setErro('Você precisa estar logado para agendar.')
      setCarregando(false)
      return
    }

    const { error: insertError } = await supabase.from('appointments').insert([
      {
        user_id: userData.user.id,
        service_id: servicoId,
        data_hora: new Date(dataHora).toISOString(),
        status: 'agendado',
      },
    ])

    if (insertError) {
      setErro(insertError.message)
    } else {
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
        onChange={(e) => setServicoId(e.target.value)}
      >
        <option value="">Selecione um serviço</option>
        {servicos.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nome} - R${Number(s.valor).toFixed(2)}
          </option>
        ))}
      </select>

      <label className="block mb-2 text-sm">Data e Hora:</label>
      <input
        type="datetime-local"
        value={dataHora}
        onChange={(e) => setDataHora(e.target.value)}
        className="w-full border p-2 rounded mb-4"
      />

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
