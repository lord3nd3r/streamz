import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/context/AudioContext";
import GlobalPlayer from "@/components/GlobalPlayer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Streamz — Live DJ Streaming Platform",
  description: "Stream live DJ sets, discover new music, and connect with DJs from around the world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body style={{ margin: 0, padding: 0, background: 'var(--background)', color: 'var(--foreground)' }}>
        <AudioProvider>
          {children}
          <GlobalPlayer />
        </AudioProvider>
      </body>
    </html>
  );
}
