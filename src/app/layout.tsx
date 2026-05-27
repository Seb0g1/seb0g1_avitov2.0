import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avito Uploader",
  description: "Админка для автозагрузки Avito и экспорта каталога"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
