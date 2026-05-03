import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Fraunces, Caveat, Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

const numericFont = localFont({
  src: [
    {
      path: "../fonts/SpaceGrotesk-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/SpaceGrotesk-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-numeric",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-caveat",
  display: "swap",
});

// Aura design system fonts
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "专注圈 - 学习打卡",
  description: "和志同道合的人一起学习打卡",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f1ebe0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`h-full ${numericFont.variable} ${fraunces.variable} ${caveat.variable} ${cormorant.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="h-full antialiased">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
