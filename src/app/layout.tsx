import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

<head>
  {/* ...outros links... */}
  <meta property="og:title" content="AgendaOne" />
  <meta property="og:description" content="Agende seu horário online no AgendaOne!" />
  <meta property="og:image" content="https://agendaone.vercel.app/salao.png" />
  <meta property="og:url" content="https://agendaone.vercel.app/" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="AgendaOne" />
  <meta name="twitter:description" content="Agende seu horário online no AgendaOne!" />
  <meta name="twitter:image" content="https://agendaone.vercel.app/salao.png" />
</head>

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgendaOne",
  description: "Agende seu horário online no AgendaOne!",
  icons: {
    icon: "/salao.png",
    apple: "/salao.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "AgendaOne",
    description: "Agende seu horário online com praticidade e rapidez!",
    url: "https://agendaone.vercel.app/",
    siteName: "AgendaOne",
    images: [
      {
        url: "https://agendaone.vercel.app/salao.png", // Caminho ABSOLUTO para a logo
        width: 512,
        height: 512,
        alt: "Logo AgendaOne",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgendaOne",
    description: "Agende seu horário online com praticidade e rapidez!",
    images: ["https://agendaone.vercel.app/salao.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <head>
        <link rel="icon" href="//salao.png" />
        <link rel="apple-touch-icon" href="//salao.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f472b6" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
