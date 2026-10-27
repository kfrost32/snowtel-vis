import type { Metadata } from "next";
import { parseTripletFromUrl } from "@snotel/core/stations";
import { stationMetadata } from "@/lib/station-share";
import MapPage from "./MapPage";

type Props = { searchParams: Promise<{ station?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { station } = await searchParams;
  return typeof station === "string" ? stationMetadata(parseTripletFromUrl(station), true) : {};
}

export default function HomePage() {
  return <MapPage />;
}
