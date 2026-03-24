import { redirect } from "next/navigation";
import { parseTripletFromUrl, urlTriplet } from "@/lib/stations";

export default async function StationPage({ params }: { params: Promise<{ triplet: string }> }) {
  const { triplet: urlParam } = await params;
  const triplet = parseTripletFromUrl(urlParam);
  redirect(`/?station=${urlTriplet(triplet)}`);
}
