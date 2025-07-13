'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'
import ImageCropper from '../../../../utils/ImageCropper'

export default function ServicosAdminPage() {
  type Servico = {
    id: string
    nome: string
    descricao: string
    valor: number
    duracao?: number
    imagem_url?: string
    created_at?: string
    total_agendamentos?: number
  }

  const [servicos, setServicos] = useState<Servico[]>([])
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [duracao, setDuracao] = useState('')
  const [imagem, setImagem] = useState<File | null>(null)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [imagemParaRecorte, setImagemParaRecorte] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [modoEdicao, setModoEdicao] = useState(false)
  const [idEditando, setIdEditando] = useState<string | null>(null)
  const [ordenarPor, setOrdenarPor] = useState<'nome' | 'valor' | 'created_at'>('created_at')
  const [filtroBusca, setFiltroBusca] = useState('')

  const router = useRouter()

  useEffect(() => {
    verificarAdmin()
  }, [router])

  useEffect(() => {
    fetchServicos()
  }, [ordenarPor])

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

    fetchServicos()
  }

  async function fetchServicos() {
    const { data, error } = await supabase
      .from('services')
      .select('*, appointments(count)')
      .order(ordenarPor, { ascending: true })

    if (!error && data) {
        const formatado = data.map((s: Servico & { appointments?: { id: string }[] }) => ({
            ...s,
            total_agendamentos: s.appointments?.length || 0,
          }))          
      setServicos(formatado)
    }
  }

  async function adicionarOuAtualizarServico() {
    if (!nome || !valor || !duracao) {
      setErro('Preencha nome, valor e duração.')
      return
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (userError || !userId) {
      setErro('Usuário não autenticado.')
      return
    }

    let imagem_url = ''

    if (imagem) {
      const fileName = `${Date.now()}-${imagem.name}`
      const { error: uploadError } = await supabase.storage
        .from('servicos')
        .upload(fileName, imagem)

      if (uploadError) {
        setErro('Erro ao enviar imagem: ' + uploadError.message)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('servicos')
        .getPublicUrl(fileName)

      imagem_url = publicUrlData.publicUrl
    }

    const dados = {
      nome,
      descricao,
      valor: parseFloat(valor),
      duracao: parseInt(duracao),
      imagem_url: imagem_url || null,
      user_id: userId,
    }

    if (modoEdicao && idEditando) {
      await supabase.from('services').update(dados).eq('id', idEditando)
    } else {
      const { error: insertError } = await supabase.from('services').insert([dados])
      if (insertError) {
        setErro('Erro ao cadastrar: ' + insertError.message)
        return
      }
    }

    cancelarEdicao()
    fetchServicos()
  }

  async function excluirServico(id: string) {
    const confirmar = confirm('Deseja realmente excluir este serviço?')
    if (!confirmar) return

    await supabase.from('services').delete().eq('id', id)
    setServicos((prev) => prev.filter((s) => s.id !== id))
  }

  function editarServico(servico: Servico) {
    setModoEdicao(true)
    setIdEditando(servico.id)
    setNome(servico.nome)
    setDescricao(servico.descricao)
    setValor(String(servico.valor))
    setDuracao(String(servico.duracao || ''))
    setImagem(null)
    setImagemPreview(null)
  }

  function cancelarEdicao() {
    setModoEdicao(false)
    setIdEditando(null)
    setNome('')
    setDescricao('')
    setValor('')
    setDuracao('')
    setImagem(null)
    setImagemPreview(null)
    setErro('')
  }

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
    setImagem(croppedFile)
    setImagemPreview(previewUrl)
    setImagemParaRecorte(null)
  }

  const servicosFiltrados = servicos.filter((s) =>
    s.nome.toLowerCase().includes(filtroBusca.toLowerCase())
  )

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

        <h1 className="text-2xl font-bold text-pink-700">Gerenciar Serviços</h1>
      </div>

      <hr className="border-t border-pink-300 mb-6" />

      {/* FORMULÁRIO */}
      <div className="bg-white p-3 rounded-md shadow-sm mb-5 max-w-md">
        <input
          type="text"
          placeholder="Nome do serviço"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full p-2 rounded mb-2 border border-pink-200"
        />
        <textarea
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full p-2 rounded mb-2 border border-pink-200"
        />
        <input
          type="number"
          placeholder="Valor (R$)"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full p-2 rounded mb-2 border border-pink-200"
        />
        <input
          type="number"
          placeholder="Duração (min)"
          value={duracao}
          onChange={(e) => setDuracao(e.target.value)}
          className="w-full p-2 rounded mb-2 border border-pink-200"
        />

        <div className="mb-2">
          <label className="block text-sm font-medium text-pink-700 mb-1">Imagem:</label>
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
              {imagem?.name || 'Nenhuma imagem selecionada'}
            </span>
          </div>
          {imagemPreview && (
            <img
              src={imagemPreview}
              alt="Pré-visualização"
              className="mt-2 rounded shadow-md w-full max-h-40 object-contain"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={adicionarOuAtualizarServico}
            className="w-full bg-pink-500 text-white py-1.5 rounded hover:bg-pink-600"
          >
            {modoEdicao ? 'Salvar Alterações' : 'Adicionar Serviço'}
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

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row justify-start items-start gap-18 mb-6">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar serviço..."
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            className="p-1 border rounded text-sm"
          />
        </div>
        <select
          value={ordenarPor}
          onChange={(e) => setOrdenarPor(e.target.value as 'nome' | 'valor' | 'created_at')}
          className="border rounded p-1 text-sm"
        >
          <option value="created_at">Mais recentes</option>
          <option value="nome">Nome (A-Z)</option>
          <option value="valor">Valor (menor → maior)</option>
        </select>
      </div>

      {/* LISTA DE SERVIÇOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
        {servicosFiltrados.map((s) => (
          <div key={s.id} className="bg-white p-3 rounded-md shadow-sm border border-pink-100">
            {s.imagem_url && (
              <img
                src={s.imagem_url}
                alt={s.nome}
                className="w-[320px] h-[130px] object-contain rounded mb-2 mx-auto bg-zinc-100"
              />
            )}
            <p className="font-semibold text-pink-600">{s.nome}</p>
            <p className="text-xs text-zinc-600">{s.descricao}</p>
            <p className="text-xs text-green-600 mt-1">R$ {Number(s.valor).toFixed(2)}</p>
            <p className="text-xs text-blue-600">⏱ {s.duracao} min</p>
            <p className="text-xs mt-1">📆 {s.total_agendamentos ?? 0} agendamentos</p>

            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => editarServico(s)}
                className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-xs"
              >
                Editar
              </button>
              <button
                onClick={() => excluirServico(s.id)}
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
