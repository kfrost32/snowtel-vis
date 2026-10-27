import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { IBM_Plex_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import GlobalHeader from "@/components/GlobalHeader";
import CommandSearch from "@/components/CommandSearch";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { SWRProvider } from "@/lib/swr-config";
import { SettingsProvider, appearanceScript } from "@/lib/settings";

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
  metadataBase: new URL(SITE_URL),
  title: "SNOTEL snowpack map · snotel.fyi",
  description: "Live snowpack, storm totals and NWS snow forecasts for 900+ SNOTEL stations across the western US.",
  openGraph: {
    title: "SNOTEL snowpack map · snotel.fyi",
    description: "Live snowpack, storm totals and snow forecasts for 900+ SNOTEL stations across the West.",
    type: "website",
    images: [{ url: "/og.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SNOTEL snowpack map · snotel.fyi",
    description: "Live snowpack, storm totals and snow forecasts for 900+ SNOTEL stations across the West.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body className={`${ibmPlexMono.variable} ${dmSans.variable} antialiased`}>
        <GoogleAnalytics />
        <SWRProvider>
          <SettingsProvider>
            <GlobalHeader />
            <CommandSearch />
            {children}
          </SettingsProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
