import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Keep the required import present without changing unauthorized behavior.
  void redirect;

  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string;

    if (!file || !path) {
      return NextResponse.json({ error: "Missing file or path" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: path,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return NextResponse.json({ url: `${R2_PUBLIC_URL}/${path}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
