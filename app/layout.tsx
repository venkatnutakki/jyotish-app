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
  title: "Jyotish · Vedic Astrology",
  description:
    "High-precision Vedic (Jyotish) birth charts, divisional charts, and dashas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b0813] bg-[radial-gradient(ellipse_at_top,_#1a1330_0%,_#0b0813_55%)] text-amber-50">
        {children}
      </body>
    </html>
  );
}
