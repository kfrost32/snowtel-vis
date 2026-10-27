import type { Metadata } from "next";

const title = "Water Year 2026 · SNOTEL Explorer";
const description = "How the 2026 water year is shaping up across the West, told through SNOTEL snowpack data.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/story/2026" },
  openGraph: { title, description },
  twitter: { title, description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
