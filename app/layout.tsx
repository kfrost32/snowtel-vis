import type { Metadata } from "next";
import { IBM_Plex_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import GlobalHeader from "@/components/GlobalHeader";
import CommandSearch from "@/components/CommandSearch";
import { SWRProvider } from "@/lib/swr-config";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SNOTEL Explorer",
  description: "Interactive visualization of SNOTEL snowpack data across the western United States.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexMono.variable} ${dmSans.variable} antialiased`}>
        <SWRProvider>
          <GlobalHeader />
          <CommandSearch />
          <div className="pt-14 md:pt-12">
            {children}
          </div>
        </SWRProvider>
      </body>
    </html>
  );
}
