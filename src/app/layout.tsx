import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Liora Labs Shipping";

export const metadata: Metadata = {
  title: {
    default: `${appName} — Shipping rates & labels`,
    template: `%s · ${appName}`,
  },
  description: "Get a rate, pay once, and download your shipping label. Labels once fetched cannot be returned.",
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
      <body className={`${plusJakarta.variable} bg-paper font-sans text-ink antialiased`}>
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
