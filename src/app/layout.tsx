import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgendaOne", // NOME QUE APARECE NA ABA
  description: "Agende seu horário online no AgendaOne!",
  icons: {
    icon: "/salao.png",     // esse arquivo PRECISA estar em /public/salao.png
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
        url: "https://agendaone.vercel.app/salao.png",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
