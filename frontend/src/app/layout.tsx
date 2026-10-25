import type { Metadata } from "next";
import { Inter } from "next/font/google";
import MainLayout from "@/components/layout/MainLayout";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VaadaKaro | Report civic issues and track them to resolution",
  description: "File complaints with the right department, get AI legal guidance, and track every step to resolution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}
