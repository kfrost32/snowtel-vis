import type { Metadata } from "next";

const title = "Basin Snowpack · snotel.fyi";
const description = "Snowpack by river basin across the western US: current snow water equivalent as a percent of median for every region, from NRCS SNOTEL stations.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/basins" },
  openGraph: { title, description },
  twitter: { title, description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
