import type { Metadata, Viewport } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { MeshBackground } from "@/components/MeshBackground";
import { AppToast } from "@/components/AppToast";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Lockal Events",
  description: "Track local events near you, ranked by what you like.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f7f9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${outfit.variable} antialiased`}>
        <MeshBackground />
        <div className="app-shell mx-auto min-h-dvh w-full max-w-md px-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] min-[400px]:px-4 sm:max-w-lg sm:px-5 md:max-w-xl">
          {children}
        </div>
        <AppToast />
        <BottomNav />
      </body>
    </html>
  );
}
