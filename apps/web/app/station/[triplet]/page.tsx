import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStation, parseTripletFromUrl, urlTriplet } from "@snotel/core/stations";
import { stationMetadata } from "@/lib/station-share";
import StationRedirect from "./StationRedirect";

type Params = { params: Promise<{ triplet: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return stationMetadata(parseTripletFromUrl((await params).triplet));
}

export default async function StationPage({ params }: Params) {
  const triplet = parseTripletFromUrl((await params).triplet);
  const station = getStation(triplet);
  if (!station) notFound();
  return <StationRedirect href={`/?station=${urlTriplet(triplet)}`} name={station.name} />;
}
