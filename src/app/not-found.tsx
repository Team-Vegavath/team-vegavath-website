import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 | Team Vegavath",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#121212] px-4 text-center text-[#EBEBEB]">
      <h1 className="text-8xl font-bold text-[#EBEBEB]">404</h1>
      <h2 className="text-2xl font-semibold text-[#9a9a9a]">Page not found</h2>
      <p className="max-w-md text-[#9a9a9a]">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-lg bg-[#EF5D08] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#EF5D08]"
      >
        Go back home
      </Link>
    </div>
  );
}
