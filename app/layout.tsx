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
  title: {
    template: '%s | Streamz',
    default: 'Streamz — Live Electronic Music DJ Streams',
  },
  description: "Tune into live DJ sets, discover deep house, techno, trance, and breakbeats. Listen ad-free on Streamz.",
  keywords: ["live dj", "electronic music", "streaming", "techno", "trance", "house", "dubstep", "breakbeats", "drum & bass", "mixxx"],
  openGraph: {
    title: 'Streamz — Live Electronic Music',
    description: 'Tune into live DJ sets, discover new music, and connect with DJs from around the world.',
    url: 'https://streamz.lol',
    siteName: 'Streamz',
    images: [
      {
        url: 'https://streamz.lol/art/1.png', // Fallback art for sharing
        width: 800,
        height: 600,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Streamz — Live DJ Streams',
    description: 'Listen to live DJ sets across all electronic genres.',
    images: ['https://streamz.lol/art/1.png'],
  },
  robots: {
    index: true,
    follow: true,
  }
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
