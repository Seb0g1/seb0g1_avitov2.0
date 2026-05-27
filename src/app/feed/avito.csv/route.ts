import { NextRequest } from "next/server";
import { env } from "@/server/config/env";
import { buildAvitoCsv } from "@/server/modules/exports/csv";
import { getFeedRows } from "@/server/modules/exports/feedRows";

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
  return new Response(buildAvitoCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8" }
  });
}
