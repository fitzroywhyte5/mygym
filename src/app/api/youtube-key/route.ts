import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? process.env.YOUTUBE_API_KEY ?? "";
  return NextResponse.json(
    { key },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
