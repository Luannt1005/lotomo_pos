import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "POS App",
  description: "Web-based POS for Takeaway Shop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-background antialiased`}>
        <div className="hidden md:block">
           <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border">
           <Sidebar />
        </div>
      </body>
    </html>
  );
}
