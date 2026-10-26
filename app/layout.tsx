import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Poppins } from "next/font/google";
import Navbar from "@/components/navbar";
import Grain from "@/components/brand/grain";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Editorial display face for headlines, mono for numerals and labels.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ActionIT — Small work. Real pay. Real proof.",
  description:
    "ActionIT connects college students with businesses for real micro-gigs. Build your Proof Score, earn real money, and prove your skills — zero commission.",
  openGraph: {
    title: "ActionIT — Small work. Real pay. Real proof.",
    description:
      "Real micro-gigs for college students. Build your portfolio, earn money, prove your skills.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${display.variable} ${mono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Grain />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
