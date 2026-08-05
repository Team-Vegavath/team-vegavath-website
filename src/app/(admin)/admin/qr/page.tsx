import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import QRGenerator from "@/components/admin/QRGenerator";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "QR Codes",
};

export const dynamic = "force-dynamic";

// S72C (Section I). isAdmin only, NO viewer guard: the page renders a QR code from
// a constant route list and writes nothing, so it is a read surface and viewers get
// it like every other one. Middleware guards /admin/* as well - both layers, as
// always.
export default async function AdminQRPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  return (
    <>
      <AdminPageHeader title="QR Codes" />
      <QRGenerator />
    </>
  );
}
