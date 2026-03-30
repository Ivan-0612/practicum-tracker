import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portal UFV - Prácticas",
  description: "Plataforma de gestión de la Universidad Francisco de Vitoria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col`}>
        {/* Solo dejamos el main para que renderice tus páginas sin estorbar */}
        <main className="flex-grow flex flex-col w-full">
          {children}
        </main>
      </body>
    </html>
  );
}