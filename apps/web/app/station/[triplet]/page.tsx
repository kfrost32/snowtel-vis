import { redirect } from "next/navigation";
import { parseTripletFromUrl, urlTriplet } from "@snotel/core/stations";

export default async function StationPage({ params }: { params: Promise<{ triplet: string }> }) {
  const { triplet: urlParam } = await params;
  const triplet = parseTripletFromUrl(urlParam);
  redirect(`/?station=${urlTriplet(triplet)}`);
}
