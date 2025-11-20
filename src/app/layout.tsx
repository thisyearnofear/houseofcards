import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import Script from "next/script";
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
  title: "Inverse Jenga - House of Cards",
  description: "Interactive Web3 Jenga game with blockchain integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <Script src="/js/three.min.js" strategy="beforeInteractive" />
        <Script src="/js/stats.js" strategy="beforeInteractive" />
        <Script src="/physi.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
