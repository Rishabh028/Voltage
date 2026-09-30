import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import AtmosphericDefs from "@/components/ui/AtmosphericDefs";

// Note: In Next.js 14, geist fonts can be used from next/font/google if preferred,
// or from the 'geist' package. The prompt requested next/font/google for Geist Sans and JetBrains Mono.
import { JetBrains_Mono } from "next/font/google";
import { Inter } from "next/font/google"; // Using Inter as fallback for Geist Sans if next/font/google was strict

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans", // Alias to match tokens
});

export const metadata: Metadata = {
  title: "Voltage | The Cloud for Builders & Agents",
  description: "Deploy and scale any app or agent from your first user to your billionth. Autonomous cloud infrastructure for the modern web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-[#000000] text-text-primary min-h-screen w-full antialiased selection:bg-accent-signal/30 relative`}
      >
        <AtmosphericDefs />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
