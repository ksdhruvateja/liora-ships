import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Liora Labs Shipping";

export const metadata: Metadata = {
  title: {
    default: `${appName} — Shipping rates & labels`,
    template: `%s · ${appName}`,
  },
  description: "Get live US shipping rates, pay once, and download your label in minutes. Unused labels can be cancelled for a refund.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-paper font-sans text-ink antialiased`}>
        <MotionRoot>
          <ScrollProgress />
          <Header />
          <main className="wrap py-10 sm:py-14">{children}</main>
          <Footer />
        </MotionRoot>
      </body>
    </html>
  );
}
