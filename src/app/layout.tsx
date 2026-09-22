import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { HeaderBar } from "@/components/HeaderBar";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Lotomo POS",
  description: "Web-based POS for Takeaway Shop",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lotomo POS",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-background antialiased selection:bg-primary/20`}>
        <AuthProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
            <HeaderBar />
            <main className="flex-1 overflow-y-auto min-w-0 overscroll-contain bg-[#f8fafc]">
              {children}
              <Toaster position="top-right" />
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
