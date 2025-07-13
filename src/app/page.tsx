export default function Home() {
  return (
    // Container principal ocupando a altura toda da tela
    <main className="flex min-h-screen flex-col items-center justify-center bg-pink-50 text-center px-4">
      
      {/* Container central com largura máxima em dispositivos maiores */}
      <div className="w-full max-w-md">
        
        {/* Bloco de título e subtítulo */}
        <div className="mb-6">
          {/* Título principal */}
          <h1 className="text-3xl font-bold text-pink-700">Estúdio de Unhas</h1>
          
          {/* Linha decorativa abaixo do título */}
          <div className="w-40 h-1 bg-pink-400 mx-auto my-2 rounded" />
          
          {/* Subtítulo com ícone de calendário */}
          <p className="text-lg text-pink-600 flex items-center justify-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-pink-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10m-7 4h4m-6 4h8"
              />
            </svg>
            Agendamento Online
          </p>
        </div>

        {/* Botões de Login e Cadastro */}
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="bg-pink-500 text-white px-6 py-2 rounded-full hover:bg-pink-600"
          >
            Login
          </a>
          <a
            href="/cadastro"
            className="bg-white border border-pink-500 text-pink-600 px-6 py-2 rounded-full hover:bg-pink-100"
          >
            Cadastro
          </a>
        </div>

      </div>
    </main>
  );
}
