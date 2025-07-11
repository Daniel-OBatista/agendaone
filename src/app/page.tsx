export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-pink-50 p-8 text-center">
      <h1 className="text-3xl font-bold text-pink-700 mb-6">
        Estúdio de Unhas - Agendamento Online
      </h1>
      <div className="flex gap-4">
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
    </main>
  );
}
