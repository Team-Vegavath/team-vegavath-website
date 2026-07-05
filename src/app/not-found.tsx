import Link from "next/link";
import type { Metadata } from "next";

import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "404 | Team Vegavath",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#121212] text-[#EBEBEB]">
      <section className="flex min-h-screen w-full items-center justify-center">
        <Container>
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <h1 className="text-8xl font-bold text-[#EBEBEB]">404</h1>
            <h2 className="text-2xl font-semibold text-[#9a9a9a]">Page not found</h2>
            <p className="max-w-md text-[#9a9a9a]" style={{ margin: "0 auto" }}>
              The page you are looking for does not exist or has been moved.
            </p>
            <Link
              href="/"
              className="mt-4 rounded-lg bg-[#EF5D08] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#EF5D08]"
            >
              Go back home
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}
