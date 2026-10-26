"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StationRedirect({ href, name }: { href: string; name: string }) {
  const router = useRouter();
  useEffect(() => router.replace(href), [router, href]);
  return (
    <main className="min-h-screen flex items-center justify-center font-mono text-sm">
      <Link href={href}>Opening {name}…</Link>
    </main>
  );
}
