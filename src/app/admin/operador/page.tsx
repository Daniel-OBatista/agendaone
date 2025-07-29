'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
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
  horarios?: HorarioDia[]
  bloqueio_inicio?: string | null
  bloqueio_fim?: string | null
}

type Servico = {
  id: string
  nome: string
}

const DIAS_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sabádo']

type HorarioDia = null | {
  dia_semana: number
  inicio: string
  fim: string
  almoco_inicio: string
  almoco_fim: string
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
  const [activeIndex, setActiveIndex] = useState(0)
  const swiperRef = useRef<any>(null)

  // Horários por dia da semana (segunda a sábado)
  const [horarios, setHorarios] = useState<HorarioDia[]>([null, null, null, null, null, null])

  // NOVO - Bloqueio de agenda (férias/licença)
  const [bloqueio_inicio, setBloqueioInicio] = useState('')
  const [bloqueio_fim, setBloqueioFim] = useState('')

  // Accordion
  const [mostrarHorarios, setMostrarHorarios] = useState(false)

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

  async function fetchHorarios(operador_id: string) {
    const { data } = await supabase
      .from('horarios_operador')
      .select('*')
      .eq('operador_id', operador_id)
    const dias: HorarioDia[] = [null, null, null, null, null, null]
    if (data) {
      data.forEach((h: any) => {
        const idx = (h.dia_semana ?? 1) - 1
        if (idx >= 0 && idx < 6) {
          dias[idx] = {
            dia_semana: h.dia_semana,
            inicio: h.hora_inicio,
            fim: h.hora_fim,
            almoco_inicio: h.almoco_inicio,
            almoco_fim: h.almoco_fim,
          }
        }
      })
    }
    return dias
  }

  async function fetchOperadores() {
    const { data, error } = await supabase.from('operadores').select('*')
    if (!error && data) {
      const operadoresComExtras = await Promise.all(data.map(async (op: Operador) => {
        const horarios = await fetchHorarios(op.id)
        return { ...op, horarios }
      }))
      setOperadores(operadoresComExtras)
    }
  }

  async function fetchServicos() {
    const { data } = await supabase.from('services').select('id, nome')
    if (data) setServicos(data)
  }

  async function carregarHorariosOperador(operadorId: string) {
    const dias = await fetchHorarios(operadorId)
    setHorarios(dias)
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
      bloqueio_inicio: bloqueio_inicio || null,
      bloqueio_fim: bloqueio_fim || null,
    }

    let operador_id: string | null = null

    if (modoEdicao && idEditando) {
      await supabase.from('operadores').update(dados).eq('id', idEditando)
      operador_id = idEditando
      await supabase.from('horarios_operador').delete().eq('operador_id', idEditando)
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from('operadores')
        .insert([dados])
        .select()
        .single()

      if (insertError || !insertData) {
        setErro('Erro ao salvar operador: ' + insertError?.message)
        return
      }

      operador_id = insertData.id
    }

    // Salvar horários
    if (operador_id) {
      const horariosSalvos = horarios
        .filter((h) => !!h)
        .map((h) => ({
          operador_id,
          dia_semana: h!.dia_semana,
          hora_inicio: h!.inicio,
          hora_fim: h!.fim,
          almoco_inicio: h!.almoco_inicio,
          almoco_fim: h!.almoco_fim,
        }))
      if (horariosSalvos.length > 0) {
        const { error: horarioError } = await supabase
          .from('horarios_operador')
          .insert(horariosSalvos)
        if (horarioError) {
          setErro('Erro ao salvar horários: ' + horarioError.message)
          return
        }
      }
    }

    cancelarEdicao()
    setTimeout(fetchOperadores, 350) // Aguarda 350ms para garantir atualização do banco
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
    setHorarios(op.horarios || [null, null, null, null, null, null])
    setBloqueioInicio(op.bloqueio_inicio || '')
    setBloqueioFim(op.bloqueio_fim || '')
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
    setHorarios([null, null, null, null, null, null])
    setBloqueioInicio('')
    setBloqueioFim('')
  }

  async function excluirOperador(id: string) {
    if (!confirm('Deseja realmente excluir este operador?')) return
    await supabase.from('operadores').delete().eq('id', id)
    await supabase.from('horarios_operador').delete().eq('operador_id', id)
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

  const cardHeight = 360

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

      <button
        onClick={fetchOperadores}
        className="fixed bottom-6 right-6 z-30 bg-gradient-to-br from-pink-100 to-fuchsia-200 border border-pink-300 text-pink-700 p-4 rounded-full shadow-2xl hover:from-fuchsia-600 hover:to-pink-600 hover:text-white hover:scale-110 transition-all"
        title="Atualizar lista de operadores"
        aria-label="Atualizar"
      >
        <RotateCcw size={22} />
      </button>

      <div className="w-full flex justify-center">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-pink-700 text-center mb-3 sm:mb-7 tracking-tight relative inline-block leading-tight">
          Gerenciar Profissional
          <span className="block h-1 w-2/3 mx-auto bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-full mt-2 animate-pulse" />
        </h1>
      </div>

      <div className="servicos-form-card bg-white/90 shadow-2xl rounded-2xl p-4 sm:p-6 mb-6 max-w-3xl mx-auto backdrop-blur-lg border-2 border-pink-100">
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

            {/* BLOQUEIO DE AGENDA (FÉRIAS/LICENÇA) */}
            <div className="flex flex-row gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-pink-700 mb-1">Início do bloqueio (férias/licença):</label>
                <input
  type="datetime-local"
  value={bloqueio_inicio}
  onChange={e => setBloqueioInicio(e.target.value)}
  className="w-full p-2 rounded-xl border border-pink-200 focus:ring-2 focus:ring-pink-400 text-base"
/>

              </div>
              <div>
                <label className="block text-sm font-medium text-pink-700 mb-1">Fim do bloqueio:</label>
                <input
  type="datetime-local"
  value={bloqueio_fim}
  onChange={e => setBloqueioFim(e.target.value)}
  className="w-full p-2 rounded-xl border border-pink-200 focus:ring-2 focus:ring-pink-400 text-base"
/>

              </div>
            </div>

            {/* Accordion Horários */}
            <div className="mt-6 mb-2">
              <button
                type="button"
                className="w-full flex justify-between items-center px-4 py-3 bg-pink-100 hover:bg-pink-200 rounded-xl border-2 border-pink-200 font-semibold text-pink-700 text-base transition"
                onClick={() => setMostrarHorarios(v => !v)}
              >
                Horários de Expediente
                <span className="ml-2">{mostrarHorarios ? "▲" : "▼"}</span>
              </button>
              {mostrarHorarios && (
                <div className="flex flex-col gap-4 mt-4 mb-2">
                  {DIAS_LABELS.map((dia, idx) => (
                    <div key={idx} className="bg-pink-50 border rounded-2xl p-4 w-full max-w-2xl mx-auto">
                      <div className="flex flex-row items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!horarios[idx]}
                          onChange={() => {
                            const copia = [...horarios]
                            if (copia[idx]) {
                              copia[idx] = null
                            } else {
                              copia[idx] = {
                                dia_semana: idx + 1,
                                inicio: '',
                                fim: '',
                                almoco_inicio: '',
                                almoco_fim: ''
                              }
                            }
                            setHorarios([...copia])
                          }}
                        />
                        <span className="font-medium">{dia}</span>
                      </div>
                      {!!horarios[idx] && (
                        <>
                          <div className="flex flex-row items-center gap-2 mt-3 ml-6">
                            <label className="font-semibold min-w-[80px]">Expediente:</label>
                            <input
                              type="time"
                              value={horarios[idx]?.inicio || ''}
                              onChange={e => {
                                const copia = [...horarios]
                                copia[idx]!.inicio = e.target.value
                                setHorarios([...copia])
                              }}
                              className="border rounded p-1 w-[95px] max-w-full"
                            />
                            <span>às</span>
                            <input
                              type="time"
                              value={horarios[idx]?.fim || ''}
                              onChange={e => {
                                const copia = [...horarios]
                                copia[idx]!.fim = e.target.value
                                setHorarios([...copia])
                              }}
                              className="border rounded p-1 w-[95px] max-w-full"
                            />
                          </div>
                          <div className="flex flex-row items-center gap-2 mt-2 ml-6">
                            <label className="font-semibold min-w-[80px]">Almoço:</label>
                            <input
                              type="time"
                              value={horarios[idx]?.almoco_inicio || ''}
                              onChange={e => {
                                const copia = [...horarios]
                                copia[idx]!.almoco_inicio = e.target.value
                                setHorarios([...copia])
                              }}
                              className="border rounded p-1 w-[95px] max-w-full"
                            />
                            <span>às</span>
                            <input
                              type="time"
                              value={horarios[idx]?.almoco_fim || ''}
                              onChange={e => {
                                const copia = [...horarios]
                                copia[idx]!.almoco_fim = e.target.value
                                setHorarios([...copia])
                              }}
                              className="border rounded p-1 w-[95px] max-w-full"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

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

      {/* Filtro de busca */}
      <div className="flex flex-col gap-3 justify-between items-center mb-7 max-w-xl mx-auto w-full">
        <input
          type="text"
          placeholder="Buscar operador..."
          value={filtroBusca}
          onChange={(e) => setFiltroBusca(e.target.value)}
          className="p-2 border border-pink-200 rounded-xl text-base w-full bg-white"
          style={{ maxWidth: '99vw' }}
        />
      </div>

      {/* Carrossel: Setas + linha + swiper */}
      <div className="w-full flex flex-col items-center mt-8">
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
          onSlideChange={swiper => setActiveIndex(swiper.activeIndex)}
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
          {operadoresFiltrados.map((o, idx) => (
            <SwiperSlide key={o.id}>
              <div
  className="swiper-card bg-white rounded-2xl p-4 sm:p-7 shadow-3xl border-0 mx-auto transition duration-300"
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
                  {/* HORÁRIOS CARD */}
                  {Array.isArray(o.horarios) && o.horarios.filter(Boolean).length > 0 && (
                    <div className="mt-2 w-full">
                      <p className="text-xs font-bold text-pink-700 mb-1">Expediente:</p>
                      <ul className="text-xs text-zinc-700 leading-5">
                        {o.horarios.map((h, i) => h && (
                          <li key={i}>
                            <span className="font-semibold">{DIAS_LABELS[i]}: </span>
                            {h.inicio} às {h.fim}
                            {h.almoco_inicio && h.almoco_fim &&
                              <> | Almoço: {h.almoco_inicio} às {h.almoco_fim}</>
                            }
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* BLOQUEIO DE AGENDA */}
                  {(o.bloqueio_inicio && o.bloqueio_fim) && (
  <div className="mt-2 w-full rounded-lg bg-pink-50 px-3 py-2 border border-pink-200 text-pink-700 font-semibold text-xs shadow">
    Agenda bloqueada de{' '}
    <span className="font-bold">
      {new Date(o.bloqueio_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
    </span>
    {' '}até{' '}
    <span className="font-bold">
      {new Date(o.bloqueio_fim).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
    </span>
  </div>
)}

                </div>
                {/* Botões de ação */}
                {activeIndex === idx && (
                  <div className="botoes-servico-admin w-full flex justify-center gap-2 mt-3 mb-2 relative z-20">
                    <button
                      onClick={() => editarOperador(o)}
                      className="bg-blue-500 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition text-xs shadow"
                    >
                      EDITAR
                    </button>
                    <button
                      onClick={() => excluirOperador(o.id)}
                      className="bg-red-500 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-red-700 transition text-xs shadow"
                    >
                      EXCLUIR
                    </button>
                  </div>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <style jsx global>{`
        .swiper-slide {
          opacity: 1 !important;
          filter: none !important;
          pointer-events: none;
          transition: opacity 0.4s, filter 0.4s, transform 0.45s !important;
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
  opacity: 1 !important;
  filter: none !important;
  pointer-events: auto !important;
  z-index: 1;
  transform: none !important;
}

        @media (max-width: 640px) {
          .servicos-form-card {
            padding: 0.7rem 0.45rem !important;
            max-width: 94vw !important;
            margin-bottom: 1rem !important;
            border-radius: 1.15rem !important;
            box-shadow: 0 2px 8px #d946ef1a !important;
            font-size: 0.93rem !important;
          }
          .servicos-form-card input,
          .servicos-form-card textarea,
          .servicos-form-card select {
            font-size: 0.95rem !important;
            padding: 0.55rem 0.6rem !important;
            border-radius: 0.9rem !important;
          }
          .servicos-form-card label {
            font-size: 0.93rem !important;
            margin-bottom: 0.1rem !important;
          }
          .servicos-form-card img {
            max-height: 60px !important;
            border-radius: 0.7rem !important;
          }
          .servicos-form-card .flex {
            gap: 0.45rem !important;
          }
          .servicos-form-card button {
            font-size: 0.97rem !important;
            padding: 0.68rem 0 !important;
            border-radius: 0.9rem !important;
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
