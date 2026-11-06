import type { Metadata } from "next";
import { parseTripletFromUrl } from "@snotel/core/stations";
import { basinMetadata } from "@/lib/basin-share";
import { stationMetadata } from "@/lib/station-share";
import MapPage from "./MapPage";

type Props = { searchParams: Promise<{ station?: string | string[]; basin?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { station, basin } = await searchParams;
  if (typeof station === "string") return stationMetadata(parseTripletFromUrl(station));
  return typeof basin === "string" ? basinMetadata(basin) : {};
}

export default function HomePage() {
  return <MapPage />;
}
