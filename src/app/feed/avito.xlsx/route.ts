import { NextRequest } from "next/server";
import { env } from "@/server/config/env";
import { buildAvitoXlsx } from "@/server/modules/exports/avitoXlsx";
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
  const buffer = await buildAvitoXlsx(rows);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="avito.xlsx"'
    }
  });
}
