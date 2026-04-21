import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

const numericFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-numeric",
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
  themeColor: "#faf6f0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`h-full ${numericFont.variable}`}>
      <body className="h-full antialiased">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
