import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStation, parseTripletFromUrl, urlTriplet } from "@snotel/core/stations";
import { stationShare, stationShareDescription } from "@/lib/station-share";
import StationRedirect from "./StationRedirect";

type Params = { params: Promise<{ triplet: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const triplet = parseTripletFromUrl((await params).triplet);
  const share = await stationShare(triplet);
  if (!share) return {};
  const title = `${share.station.name}, ${share.station.state} · SNOTEL Explorer`;
  const description = stationShareDescription(share);
  return {
    title,
    description,
    alternates: { canonical: `/station/${urlTriplet(triplet)}` },
    openGraph: { title, description, type: "website", url: `/station/${urlTriplet(triplet)}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StationPage({ params }: Params) {
  const triplet = parseTripletFromUrl((await params).triplet);
  const station = getStation(triplet);
  if (!station) notFound();
  return <StationRedirect href={`/?station=${urlTriplet(triplet)}`} name={station.name} />;
}
