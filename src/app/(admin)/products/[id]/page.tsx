import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { listAvitoFashionBrands } from "@/server/modules/avitoCategories/brandList";
import { listClothingCategoryOptions } from "@/server/modules/avitoCategories/clothingTemplates";
import { getProduct } from "@/server/modules/products/service";
import { serializeProduct } from "@/server/modules/products/serialize";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: Params) {
  const { id } = await params;
  const product = serializeProduct(await getProduct(id));
  const clothingCategories = await listClothingCategoryOptions();
  const brandOptions = await listAvitoFashionBrands();

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
      <ProductEditor
        product={product}
        clothingCategories={clothingCategories}
        brandOptions={brandOptions}
      />
    </div>
  );
}
