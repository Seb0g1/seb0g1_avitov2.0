import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { getProduct } from "@/server/modules/products/service";
import { serializeProduct } from "@/server/modules/products/serialize";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: Params) {
  const { id } = await params;
  const product = serializeProduct(await getProduct(id));

  return (
    <div className="grid">
      <header className="page-header">
        <div>
          <p className="eyebrow">Карточка товара</p>
          <h1>{product.title}</h1>
        </div>
        <Link className="button" href="/catalog">
          <ArrowLeft size={18} aria-hidden />
          В каталог
        </Link>
      </header>
      <ProductEditor product={product} />
    </div>
  );
}
