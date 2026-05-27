import { NextRequest } from "next/server";
import { apiError, created, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { createProduct, listProducts } from "@/server/modules/products/service";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const params = request.nextUrl.searchParams;
    const products = await listProducts({
      search: params.get("search") ?? undefined,
      color: params.get("color") ?? undefined,
      size: params.get("size") ?? undefined,
      status: params.get("status") ?? undefined,
      withoutSupplier: params.get("withoutSupplier") ?? undefined
    });
    return ok({ products });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const product = await createProduct(await request.json());
    return created({ product });
  } catch (error) {
    return apiError(error);
  }
}
