'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, Search } from 'lucide-react'

type Operador = {
  id: string
  nome: string
  email: string
  telefone: string
  foto_url?: string
  servico_ids: string[]
}

type Servico = {
  id: string
  nome: string
}

export default function OperadoresAdminPage() {
  const router = useRouter()
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [servicoSelecionado, setServicoSelecionado] = useState<string[]>([])
  const [erro, setErro] = useState('')
  const [modoEdicao, setModoEdicao] = useState(false)
  const [idEditando, setIdEditando] = useState<string | null>(null)
  const [filtroBusca, setFiltroBusca] = useState('')

  useEffect(() => {
    verificarAdmin()
  }, [])

  async function verificarAdmin() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    const { data: perfil } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (perfil?.role !== 'admin') {
      router.push('/')
      return
    }

    await fetchOperadores()
    await fetchServicos()
  }

  async function fetchOperadores() {
    const { data, error } = await supabase.from('operadores').select('*')
    if (!error && data) setOperadores(data)
  }

  async function fetchServicos() {
    const { data } = await supabase.from('services').select('id, nome')
    if (data) setServicos(data)
  }

  async function salvarOperador() {
    if (!nome || !email || !telefone || servicoSelecionado.length === 0) {
      setErro('Preencha todos os campos e selecione pelo menos 1 serviço.')
      return
    }

    let foto_url = ''
    if (foto) {
      const fileName = `${Date.now()}-${foto.name}`
      const { error: uploadError } = await supabase.storage
        .from('operadores')
        .upload(fileName, foto)

      if (uploadError) {
        setErro('Erro ao enviar imagem: ' + uploadError.message)
        return
      }

      const { data: urlData } = supabase.storage
        .from('operadores')
        .getPublicUrl(fileName)

      foto_url = urlData.publicUrl
    }

    const dados = {
      nome,
      email,
      telefone,
      servico_ids: servicoSelecionado,
      foto_url: foto_url || null,
    }

    if (modoEdicao && idEditando) {
      await supabase.from('operadores').update(dados).eq('id', idEditando)
    } else {
      const { error: insertError } = await supabase.from('operadores').insert([dados])
      if (insertError) {
        setErro('Erro ao salvar: ' + insertError.message)
        return
      }
    }

    cancelarEdicao()
    fetchOperadores()
  }

  function editarOperador(op: Operador) {
    setModoEdicao(true)
    setIdEditando(op.id)
    setNome(op.nome)
    setEmail(op.email)
    setTelefone(op.telefone)
    setServicoSelecionado(op.servico_ids || [])
    setFoto(null)
    setFotoPreview(op.foto_url || null)
  }

  function cancelarEdicao() {
    setModoEdicao(false)
    setIdEditando(null)
    setNome('')
    setEmail('')
    setTelefone('')
    setServicoSelecionado([])
    setFoto(null)
    setFotoPreview(null)
    setErro('')
  }

  async function excluirOperador(id: string) {
    if (!confirm('Deseja realmente excluir este operador?')) return
    await supabase.from('operadores').delete().eq('id', id)
    fetchOperadores()
  }

  const operadoresFiltrados = operadores.filter((o) =>
    o.nome.toLowerCase().includes(filtroBusca.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-pink-50 text-zinc-800 px-12 py-4 max-w-6xl mx-auto text-sm">
      <div className="mb-4">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm"
        >
          <Home size={18} />
          Início do Admin
        </button>
      </div>

      <h1 className="text-xl font-bold text-pink-600 mb-4 border-b border-pink-300 pb-1">
        Gerenciar Operadores
      </h1>

      {/* FORMULÁRIO */}
      <div className="bg-white p-3 rounded-md shadow-sm mb-5 max-w-md">
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full p-2 rounded mb-2 border border-pink-200"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 rounded mb-2 border border-pink-200"
        />
        <input
          type="tel"
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="w-full p-2 rounded mb-2 border border-pink-200"
        />

        <label className="block text-sm font-medium text-pink-700 mb-1">Serviços prestados:</label>
        <select
          multiple
          value={servicoSelecionado}
          onChange={(e) =>
            setServicoSelecionado(Array.from(e.target.selectedOptions, (option) => option.value))
          }
          className="w-full p-2 rounded mb-2 border border-pink-200"
        >
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>

        <div className="mb-2">
          <label className="block text-sm font-medium text-pink-700 mb-1">Foto:</label>
          <div className="flex items-center gap-2">
            <label className="bg-pink-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-pink-600 text-sm">
              Escolher imagem
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  setFoto(file || null)
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = () => setFotoPreview(reader.result as string)
                    reader.readAsDataURL(file)
                  }
                }}
                className="hidden"
              />
            </label>
            <span className="text-sm text-zinc-600">
              {foto?.name || 'Nenhuma imagem selecionada'}
            </span>
          </div>
          {fotoPreview && (
            <img
              src={fotoPreview}
              alt="Foto do operador"
              className="mt-2 rounded shadow-md w-full max-h-40 object-contain"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={salvarOperador}
            className="w-full bg-pink-500 text-white py-1.5 rounded hover:bg-pink-600"
          >
            {modoEdicao ? 'Salvar Alterações' : 'Cadastrar Operador'}
          </button>
          {modoEdicao && (
            <button
              onClick={cancelarEdicao}
              className="bg-zinc-300 text-zinc-700 px-3 py-1.5 rounded hover:bg-zinc-400"
            >
              Cancelar
            </button>
          )}
        </div>
        {erro && <p className="text-red-500 text-xs mt-2">{erro}</p>}
      </div>

      {/* FILTRO */}
      <div className="flex items-center gap-2 mb-6">
        <Search size={16} className="text-pink-700" />
        <input
          type="text"
          placeholder="Buscar operador..."
          value={filtroBusca}
          onChange={(e) => setFiltroBusca(e.target.value)}
          className="p-1 border rounded text-sm"
        />
      </div>

      {/* LISTA DE OPERADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
        {operadoresFiltrados.map((o) => (
          <div key={o.id} className="bg-white p-3 rounded-md shadow-sm border border-pink-100">
            {o.foto_url && (
              <img
                src={o.foto_url}
                alt={o.nome}
                className="w-full h-30 object-contain rounded mb-2"
              />
            )}
            <p className="font-semibold text-pink-600">{o.nome}</p>
            <p className="text-xs text-zinc-600">{o.email}</p>
            <p className="text-xs text-zinc-600">{o.telefone}</p>
            <p className="text-xs mt-1">
              🛠 Serviços: {o.servico_ids?.length ? o.servico_ids.length : '—'}
            </p>
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => editarOperador(o)}
                className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-xs"
              >
                Editar
              </button>
              <button
                onClick={() => excluirOperador(o.id)}
                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
