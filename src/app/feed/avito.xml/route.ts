import { NextRequest } from "next/server";
import { env } from "@/server/config/env";
import { getFeedRows } from "@/server/modules/exports/feedRows";
import { buildAvitoXml } from "@/server/modules/exports/xml";

function isAuthorized(request: NextRequest) {
  const token =
    request.nextUrl.searchParams.get("token") ??
    request.headers.get("x-feed-token");
  return token === env.FEED_PUBLIC_TOKEN;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await getFeedRows();
  return new Response(buildAvitoXml(rows), {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}
