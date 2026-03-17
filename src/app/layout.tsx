/**
 * Don Chat - Layout
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Don Chat - Real-time Messaging with AI",
  description: "Connect with friends instantly. Don Chat features real-time messaging, phone authentication, and an AI assistant.",
  keywords: ["Don Chat", "Messaging", "Chat", "AI", "Real-time", "WebSocket"],
  authors: [{ name: "Don Chat Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Don Chat",
    description: "Real-time messaging with AI assistant",
    url: "https://github.com/mnuhman/Donchat",
    siteName: "Don Chat",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
