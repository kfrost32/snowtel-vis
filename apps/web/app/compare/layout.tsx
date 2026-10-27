import type { Metadata } from "next";

const title = "Compare SNOTEL Stations · SNOTEL Explorer";
const description = "Compare snow depth and snow water equivalent across SNOTEL stations side by side for the current water year.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/compare" },
  openGraph: { title, description },
  twitter: { title, description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
