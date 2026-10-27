import type { Metadata } from "next";

const title = "Data Status · SNOTEL Explorer";
const description = "Freshness of the NRCS SNOTEL and NWS forecast data behind SNOTEL Explorer.";

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
