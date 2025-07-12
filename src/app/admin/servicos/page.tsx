'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ServicosAdminPage() {
  const [servicos, setServicos] = useState<any[]>([])
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState('')
  const router = useRouter()

  // ✅ Corrigido: dependência [router] incluída
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

      fetchServicos()
    }

    async function fetchServicos() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false })

      setServicos(data || [])
    }

    verificarAdmin()
  }, [router]) // <- dependência adicionada aqui

  async function adicionarServico() {
    if (!nome || !valor) {
      setErro('Preencha o nome e o valor.')
      return
    }

    const { error } = await supabase.from('services').insert([
      {
        nome,
        descricao,
        valor: parseFloat(valor),
      },
    ])

    if (error) {
      setErro(error.message)
    } else {
      setErro('')
      setNome('')
      setDescricao('')
      setValor('')
      const { data } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false })
      setServicos(data || [])
    }
  }

  async function excluirServico(id: string) {
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (!error) {
      setServicos((prev) => prev.filter((s) => s.id !== id))
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-pink-700 mb-4">Gerenciar Serviços</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Nome do serviço"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <textarea
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <input
          type="number"
          placeholder="Valor (R$)"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <button
          onClick={adicionarServico}
          className="w-full bg-pink-500 text-white py-2 rounded hover:bg-pink-600"
        >
          Adicionar Serviço
        </button>
        {erro && <p className="text-red-500 text-sm mt-2">{erro}</p>}
      </div>

      <h2 className="text-lg font-semibold mb-2">Serviços Cadastrados:</h2>
      <ul className="flex flex-col gap-3">
        {servicos.map((s) => (
          <li key={s.id} className="border p-3 rounded bg-white shadow-sm">
            <p><strong>{s.nome}</strong></p>
            <p className="text-sm">{s.descricao}</p>
            <p className="text-sm">R$ {Number(s.valor).toFixed(2)}</p>
            <button
              onClick={() => excluirServico(s.id)}
              className="mt-2 bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
