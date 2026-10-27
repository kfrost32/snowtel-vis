import type { Metadata } from "next";

const title = "Data Status · snotel.fyi";
const description = "Freshness of the NRCS SNOTEL and NWS forecast data behind snotel.fyi.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false },
  openGraph: { title, description },
  twitter: { title, description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
