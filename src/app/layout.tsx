import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avito Catalog Uploader",
  description: "SaaS admin for Avito catalog autoload and Excel export"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
