"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CRAWLER = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview/i;

export default function StationRedirect({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!CRAWLER.test(navigator.userAgent)) router.replace(href);
  }, [router, href]);
  return null;
}
