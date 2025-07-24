'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { Home, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import ImageCropper from '../../../../utils/ImageCropper'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, EffectCoverflow } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-coverflow'

export default function ServicosAdminPage() {
  // Tipos
  type Servico = {
    id: string
    nome: string
    descricao: string
    valor: number
    duracao?: number
    imagem_url?: string
    created_at?: string
  }

  // Estados
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
  const [filtroBusca, setFiltroBusca] = useState('')

  const router = useRouter()
  const swiperRef = useRef<any>(null) // Referência para Swiper

  useEffect(() => {
    verificarAdmin()
    // eslint-disable-next-line
  }, [router])

  useEffect(() => {
    fetchServicos()
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

    fetchServicos()
  }

  async function fetchServicos() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: true })

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

  const cardHeight = 325

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
        <h1 className="text-2xl sm:text-4xl font-extrabold text-pink-700 text-center mb-3 sm:mb-7 tracking-tight relative inline-block leading-tight">
          Gerenciar Serviços
          <span className="block h-1 w-2/3 mx-auto bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-full mt-2 animate-pulse" />
        </h1>
      </div>

      <div className="servicos-form-card bg-white/90 shadow-2xl rounded-2xl p-4 sm:p-6 mb-6 max-w-xl mx-auto backdrop-blur-lg border-2 border-pink-100">
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

      {/* Filtro de busca */}
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

      {/* Carrossel */}
      <div className="w-full flex flex-col items-center mt-8">
        {/* Setas + Linha decorativa */}
        <div className="w-full flex flex-col items-center mb-0 relative z-10 select-none">
          <div className="flex justify-center items-center gap-4 w-full max-w-[600px] mx-auto pb-2">
            <button
              className="swiper-decor-arrows flex items-center justify-center rounded-full hover:bg-fuchsia-100 transition md:scale-110 scale-90 active:scale-100 shadow-md"
              style={{ width: 48, height: 48 }}
              onClick={() => swiperRef.current?.swiper?.slidePrev?.()}
              aria-label="Anterior"
              type="button"
            >
              <ChevronLeft className="w-9 h-9 text-fuchsia-500" />
            </button>
            <div className="h-2 w-44 sm:w-72 bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-full shadow-pink-200 shadow-md border-2 border-pink-300 opacity-90" />
            <button
              className="swiper-decor-arrows flex items-center justify-center rounded-full hover:bg-fuchsia-100 transition md:scale-110 scale-90 active:scale-100 shadow-md"
              style={{ width: 48, height: 48 }}
              onClick={() => swiperRef.current?.swiper?.slideNext?.()}
              aria-label="Próximo"
              type="button"
            >
              <ChevronRight className="w-9 h-9 text-fuchsia-500" />
            </button>
          </div>
        </div>

        <Swiper
          ref={swiperRef}
          modules={[Pagination, EffectCoverflow]}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView={1.14}
          pagination={{ clickable: true }}
          speed={700}
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: 80,
            modifier: 1.9,
            slideShadows: false,
          }}
          className="w-full max-w-[680px] md:mt-2"
          style={{
            paddingBottom: '58px',
          }}
          breakpoints={{
            0:   { slidesPerView: 1.06 },
            600: { slidesPerView: 1.16 },
            900: { slidesPerView: 1.4 }
          }}
        >
          {servicosFiltrados.map((s) => (
            <SwiperSlide key={s.id}>
              <div
                className="swiper-card bg-white/95 rounded-2xl p-4 sm:p-7 shadow-xl border-2 border-pink-100 mx-auto transition duration-300"
                style={{
                  width: '98vw',
                  maxWidth: '520px',
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

      {/* Botão atualizar canto inferior direito */}
      <button
        onClick={fetchServicos}
        className="fixed bottom-6 right-6 z-30 bg-gradient-to-br from-pink-100 to-fuchsia-200 border border-pink-300 text-pink-700 p-4 rounded-full shadow-2xl hover:from-fuchsia-600 hover:to-pink-600 hover:text-white hover:scale-110 transition-all"
        title="Atualizar lista de serviços"
        aria-label="Atualizar"
      >
        <RotateCcw size={22} />
      </button>

      <style jsx global>{`
        .swiper-slide {
          transition: opacity 0.4s, filter 0.4s, transform 0.45s !important;
          opacity: 1 !important;
          filter: none !important;
          pointer-events: none;
        }
        .swiper-slide.swiper-slide-active {
          opacity: 1 !important;
          filter: none !important;
          pointer-events: auto;
          z-index: 2;
          transform: scale(1.07) !important;
        }
        .swiper-slide-prev,
        .swiper-slide-next {
          opacity: 0.32 !important;
          filter: blur(2.5px) grayscale(100%) !important;
          pointer-events: none !important;
          z-index: 1;
          transform: scale(0.97) !important;
        }
        @media (max-width: 640px) {
          .servicos-form-card {
            padding: 0.8rem 0.7rem !important;
            max-width: 98vw !important;
            font-size: 0.98rem !important;
            margin-bottom: 1.5rem !important;
          }
          .servicos-form-card input,
          .servicos-form-card textarea {
            font-size: 0.98rem !important;
            padding: 0.7rem !important;
          }
          .servicos-form-card label {
            font-size: 0.98rem !important;
          }
        }        
        @media (min-width: 641px) {
          .swiper-slide-prev,
          .swiper-slide-next {
            opacity: 0.32 !important;
            filter: blur(2.5px) grayscale(100%) !important;
            pointer-events: none !important;
            transform: scale(0.97) !important;
          }
        }
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
      `}</style>
    </main>
  )
}
