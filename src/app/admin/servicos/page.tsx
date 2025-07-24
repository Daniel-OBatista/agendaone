'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { Home, RotateCcw } from 'lucide-react'
import ImageCropper from '../../../../utils/ImageCropper'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, EffectCoverflow } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-coverflow'

export default function ServicosAdminPage() {
  type Servico = {
    id: string
    nome: string
    descricao: string
    valor: number
    duracao?: number
    imagem_url?: string
    created_at?: string
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
  // Removido o filtro de ordenação
  const [filtroBusca, setFiltroBusca] = useState('')

  const router = useRouter()

  useEffect(() => {
    verificarAdmin()
  }, [router])

  useEffect(() => {
    fetchServicos()
  }, []) // Removido [ordenarPor] para buscar só uma vez

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
      .select('*')
      .order('created_at', { ascending: true }) // Sempre por data de criação

    if (!error && data) {
      setServicos(data)
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

  // Card sizes
  const cardWidth = 420
  const cardHeight = 285

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-fuchsia-100 text-zinc-800 px-3 sm:px-8 md:px-16 py-8 relative overflow-hidden">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-pink-200 opacity-30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-fuchsia-200 opacity-25 rounded-full blur-2xl pointer-events-none" />

      {imagemParaRecorte && (
        <ImageCropper
          imageSrc={imagemParaRecorte}
          onCropComplete={handleRecorteFinalizado}
          onCancel={() => setImagemParaRecorte(null)}
        />
      )}

      <button
        onClick={() => router.push('/admin')}
        className="fixed top-5 left-5 z-30 bg-gradient-to-br from-pink-100 to-fuchsia-100 border border-pink-300 text-pink-600 p-3 rounded-full shadow-lg hover:from-pink-500 hover:to-fuchsia-500 hover:text-white hover:scale-110 transition-all"
        title="Voltar para o início"
        aria-label="Início"
      >
        <Home size={28} />
      </button>

      <div className="w-full flex justify-center">
        <h1 className="text-4xl font-extrabold text-pink-700 text-center mb-3 sm:mb-7 tracking-tight relative inline-block leading-tight">
          Gerenciar Serviços
          <span className="block h-1 w-2/3 mx-auto bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-full mt-2 animate-pulse" />
        </h1>
      </div>

      <div className="bg-white/90 shadow-2xl rounded-2xl p-4 sm:p-6 mb-6 max-w-xl mx-auto backdrop-blur-lg border-2 border-pink-100">
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Nome do serviço"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-2 rounded-xl mb-2 border border-pink-200 focus:ring-2 focus:ring-pink-400 text-base"
            />
            <textarea
              placeholder="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full p-2 rounded-xl mb-2 border border-pink-200 focus:ring-2 focus:ring-pink-400 text-base"
            />
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                placeholder="Valor (R$)"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-1/2 p-2 rounded-xl border border-pink-200 focus:ring-2 focus:ring-pink-400 text-base"
              />
              <input
                type="number"
                placeholder="Duração (min)"
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                className="w-1/2 p-2 rounded-xl border border-pink-200 focus:ring-2 focus:ring-pink-400 text-base"
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-pink-700 mb-1">Imagem:</label>
              <div className="flex items-center gap-2">
                <label className="bg-pink-500 text-white px-3 py-1.5 rounded-lg cursor-pointer hover:bg-pink-700 text-sm shadow">
                  Escolher imagem
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImagemSelecionada}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-zinc-500">
                  {imagem?.name || 'Nenhuma imagem selecionada'}
                </span>
              </div>
              {imagemPreview && (
                <img
                  src={imagemPreview}
                  alt="Pré-visualização"
                  className="mt-2 rounded-xl shadow-md w-full max-h-32 object-contain border"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={adicionarOuAtualizarServico}
            className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white py-2 rounded-xl font-bold hover:from-pink-700 hover:to-fuchsia-700 shadow hover:scale-105 transition-all"
          >
            {modoEdicao ? 'Salvar Alterações' : 'Adicionar Serviço'}
          </button>
          {modoEdicao && (
            <button
              onClick={cancelarEdicao}
              className="bg-zinc-200 text-zinc-700 px-5 py-2 rounded-xl font-semibold hover:bg-zinc-300 shadow transition"
            >
              Cancelar
            </button>
          )}
        </div>
        {erro && <p className="text-red-500 text-xs mt-2">{erro}</p>}
      </div>

      {/* Filtro de busca, sem select */}
      <div className="flex flex-col gap-3 justify-between items-center mb-7 max-w-xl mx-auto w-full">
        <input
          type="text"
          placeholder="Buscar serviço..."
          value={filtroBusca}
          onChange={(e) => setFiltroBusca(e.target.value)}
          className="p-2 border border-pink-200 rounded-xl text-base w-full bg-white"
          style={{ maxWidth: '99vw' }}
        />
      </div>

      {/* CARROSSEL SWIPER */}
      <div className="w-full flex flex-col items-center">
        <div className="w-full flex justify-center px-0">
          <Swiper
            modules={[Pagination, EffectCoverflow]}
            effect="coverflow"
            grabCursor
            centeredSlides
            slidesPerView={1.08}
            pagination={{ clickable: true }}
            speed={700}
            coverflowEffect={{
              rotate: 0,
              stretch: 0,
              depth: 100,
              modifier: 3.5,
              slideShadows: false,
            }}
            className="w-full"
            style={{
              paddingBottom: '58px',
              margin: 0,
            }}
          >
            {servicosFiltrados.map((s) => (
              <SwiperSlide key={s.id}>
                <div
                  className="bg-white/95 rounded-2xl p-4 sm:p-7 shadow-xl border-2 border-pink-100 mx-auto transition duration-300 swiper-card"
                  style={{
                    width: '96vw', // Ocupa quase toda a tela no mobile
                    maxWidth: '420px',
                    minHeight: `${cardHeight + 70}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    margin: '0 auto'
                  }}
                >
                  {s.imagem_url && (
                    <img
                      src={s.imagem_url}
                      alt={s.nome}
                      className="w-full h-[252px] object-cover rounded-xl mb-2 bg-zinc-100"
                    />
                  )}
                  <div className="w-full flex flex-col items-start px-1">
                    <p className="font-bold text-pink-700 text-lg">{s.nome}</p>
                    <p className="text-sm text-zinc-800 min-h-[32px]">{s.descricao}</p>
                    <div className="flex gap-2 flex-wrap mt-2">
                      <span className="text-xs text-green-700 font-bold">R$ {Number(s.valor).toFixed(2)}</span>
                      <span className="text-xs text-blue-700 font-semibold">⏱ {s.duracao} min</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => editarServico(s)}
                        className="bg-blue-500 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition text-xs shadow"
                      >
                        EDITAR
                      </button>
                      <button
                        onClick={() => excluirServico(s.id)}
                        className="bg-red-500 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-red-700 transition text-xs shadow"
                      >
                        EXCLUIR
                      </button>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {/* Botão atualizar canto inferior direito */}
      <button
        onClick={fetchServicos}
        className="fixed bottom-6 right-6 z-30 bg-gradient-to-br from-pink-100 to-fuchsia-200 border border-pink-300 text-pink-700 p-4 rounded-full shadow-2xl hover:from-fuchsia-600 hover:to-pink-600 hover:text-white hover:scale-110 transition-all"
        title="Atualizar lista de serviços"
        aria-label="Atualizar"
      >
        <RotateCcw size={28} />
      </button>

      <style jsx global>{`
        .swiper-pagination {
          position: absolute !important;
          bottom: 38px !important;
          left: 0;
          right: 0;
          margin: auto;
          text-align: center;
        }
        .swiper-pagination-bullet {
          background: #a21caf;
          opacity: 0.28;
        }
        .swiper-pagination-bullet-active {
          background: #7c3aed;
          opacity: 1;
          box-shadow: 0 2px 8px #7c3aed50;
        }
        .swiper-slide {
          opacity: 1 !important;
          filter: none !important;
          pointer-events: none;
          transition: opacity .35s, transform .45s, filter .35s;
        }
        .swiper-slide.swiper-slide-active {
          opacity: 1 !important;
          filter: none !important;
          pointer-events: auto;
          z-index: 2;
          transform: scale(1.1) !important;
        }
        .swiper-slide-prev,
        .swiper-slide-next {
          opacity: 0.48 !important;
          filter: blur(1.5px) !important;
          pointer-events: none;
          z-index: 1;
          transform: scale(1) !important;
        }
        @media (max-width: 640px) {
          h1 {
            font-size: 1.05rem !important;
            margin-bottom: 1rem !important;
          }
          .bg-white\\/90 {
            margin-left: 0 !important;
            margin-right: 0 !important;
            width: 99vw !important;
            max-width: 99vw !important;
          }
          .swiper-slide > div {
            width: 96vw !important;
            min-width: 0 !important;
            max-width: 99vw !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .swiper {
            padding-left: 0 !important;
            padding-right: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          main {
            padding-left: 0.75rem !important; /* px-3 */
            padding-right: 0.75rem !important;
          }
        }
      `}</style>
    </main>
  )
}
