import type { MetadataRoute } from "next";
import { getAllStations, urlTriplet } from "@snotel/core/stations";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/basins`, lastModified, changeFrequency: "daily", priority: 0.7 },
  ];
  const stations = getAllStations()
    .filter((s) => s.network === "SNOTEL")
    .map((s): MetadataRoute.Sitemap[number] => ({
      url: `${SITE_URL}/station/${urlTriplet(s.triplet)}`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.6,
    }));
  return [...pages, ...stations];
}
