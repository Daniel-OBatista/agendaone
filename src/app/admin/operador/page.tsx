'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, Search, RotateCcw } from 'lucide-react'
import ImageCropper from '../../../../utils/ImageCropper'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, EffectCoverflow } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-coverflow'

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
    // eslint-disable-next-line
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
      foto_url: foto_url || fotoPreview || null,
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

  // Card sizes
  const cardWidth = 420
  const cardHeight = 285

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-fuchsia-100 text-zinc-800 px-4 sm:px-8 md:px-16 py-10 relative overflow-hidden">
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

      {/* Botão atualizar canto inferior direito */}
      <button
        onClick={fetchOperadores}
        className="fixed bottom-6 right-6 z-30 bg-gradient-to-br from-pink-100 to-fuchsia-200 border border-pink-300 text-pink-700 p-4 rounded-full shadow-2xl hover:from-fuchsia-600 hover:to-pink-600 hover:text-white hover:scale-110 transition-all"
        title="Atualizar lista de operadores"
        aria-label="Atualizar"
      >
        <RotateCcw size={28} />
      </button>

      <div className="w-full flex justify-center">
        <h1 className="text-3xl font-extrabold text-pink-700 text-center mb-7 tracking-tight relative inline-block">
          Gerenciar Profissional
          <span className="block h-1 w-2/3 mx-auto bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-full mt-2 animate-pulse" />
        </h1>
      </div>

      <div className="bg-white/90 shadow-2xl rounded-2xl p-6 mb-7 max-w-xl mx-auto backdrop-blur-lg border-2 border-pink-100">
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-2 rounded-xl mb-2 border border-pink-200 focus:ring-2 focus:ring-pink-400 text-base"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded-xl mb-2 border border-pink-200 focus:ring-2 focus:ring-pink-400 text-base"
            />
            <input
              type="tel"
              placeholder="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full p-2 rounded-xl mb-2 border border-pink-200 focus:ring-2 focus:ring-pink-400 text-base"
            />

            <label className="block text-sm font-medium text-pink-700 mb-1">Serviços prestados:</label>
            <select
              multiple
              value={servicoSelecionado}
              onChange={(e) =>
                setServicoSelecionado(Array.from(e.target.selectedOptions, (option) => option.value))
              }
              className="w-full p-2 rounded-xl mb-2 border border-pink-200 focus:ring-2 focus:ring-pink-400 text-base"
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
                  {foto?.name || 'Nenhuma imagem selecionada'}
                </span>
              </div>
              {fotoPreview && (
                <img
                  src={fotoPreview}
                  alt="Foto do operador"
                  className="mt-2 rounded-xl shadow-md w-full max-h-32 object-contain border"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={salvarOperador}
            className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white py-2 rounded-xl font-bold hover:from-pink-700 hover:to-fuchsia-700 shadow hover:scale-105 transition-all"
          >
            {modoEdicao ? 'Salvar Alterações' : 'Cadastrar Profissional'}
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

      <div className="flex items-center gap-2 mb-6 max-w-xl mx-auto">
        <Search size={16} className="text-pink-700" />
        <input
          type="text"
          placeholder="Buscar operador..."
          value={filtroBusca}
          onChange={(e) => setFiltroBusca(e.target.value)}
          className="p-2 border border-pink-200 rounded-xl text-base w-full sm:w-auto"
        />
      </div>

      {/* CARROSSEL SWIPER */}
      <div className="flex flex-col items-center max-w-3xl mx-auto mb-10">
        <Swiper
          modules={[Pagination, EffectCoverflow]}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView={1.45}
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
          }}
        >
          {operadoresFiltrados.map((o) => (
            <SwiperSlide key={o.id}>
              <div
                className="bg-white/95 rounded-2xl p-4 sm:p-7 shadow-xl border-2 border-pink-100 mx-auto transition duration-300 swiper-card"
                style={{
                  width: `${cardWidth}px`,
                  minHeight: `${cardHeight + 70}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                {o.foto_url && (
                  <img
                    src={o.foto_url}
                    alt={o.nome}
                    className="w-full h-[252px] object-cover rounded-xl mb-2 bg-zinc-100"
                  />
                )}
                <div className="w-full flex flex-col items-start px-1">
                  <p className="font-bold text-pink-700 text-lg">{o.nome}</p>
                  <p className="text-base text-zinc-800 min-h-[32px] font-semibold">{o.email}</p>
                  <p className="text-base text-zinc-700">{o.telefone}</p>
                  <p className="text-sm mt-1 text-fuchsia-700">
                    🛠 Serviços: {o.servico_ids?.length ? o.servico_ids.length : '—'}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => editarOperador(o)}
                      className="bg-blue-500 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-blue-700 transition text-base shadow"
                    >
                      EDITAR
                    </button>
                    <button
                      onClick={() => excluirOperador(o.id)}
                      className="bg-red-500 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-red-700 transition text-base shadow"
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

      {/* CSS para Swiper: card central 10% maior, laterais opacos/desfocados */}
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
      `}</style>
    </main>
  )
}
