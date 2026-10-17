import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Navbar from "@/components/navbar";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="en" className={`${poppins.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
