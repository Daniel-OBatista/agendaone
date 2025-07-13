'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, Search } from 'lucide-react'
import ImageCropper from '../../../../utils/ImageCropper'

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
  const [imagemParaRecorte, setImagemParaRecorte] = useState<string | null>(null)

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

  function handleImagemSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagemParaRecorte(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleRecorteFinalizado(croppedFile: File, previewUrl: string) {
    setFoto(croppedFile)
    setFotoPreview(previewUrl)
    setImagemParaRecorte(null)
  }

  return (
    <main className="min-h-screen bg-pink-50 text-zinc-800 px-4 sm:px-8 md:px-12 lg:px-20 py-10 text-sm">
      {imagemParaRecorte && (
        <ImageCropper
          imageSrc={imagemParaRecorte}
          onCropComplete={handleRecorteFinalizado}
          onCancel={() => setImagemParaRecorte(null)}
        />
      )}

      <div className="mb-4 flex items-center justify-start gap-4">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm"
        >
          <Home size={18} />
          Início
        </button>

        <h1 className="text-2xl font-bold text-pink-700">Gerenciar Operadores</h1>
      </div>

      <hr className="border-t border-pink-300 mb-6" />

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
                accept="image/*"
                onChange={handleImagemSelecionada}
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
        {operadoresFiltrados.map((o) => (
          <div key={o.id} className="bg-white p-3 rounded-md shadow-sm border border-pink-100">
            {o.foto_url && (
              <img
                src={o.foto_url}
                alt={o.nome}
                className="w-[320px] h-[130px] object-contain rounded mb-2 mx-auto bg-zinc-100"
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
