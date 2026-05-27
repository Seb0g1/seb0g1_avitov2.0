import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCreationWizard } from "@/components/admin/ProductCreationWizard";
import { listAvitoCategories } from "@/server/modules/products/service";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await listAvitoCategories();

  return (
    <div className="grid">
      <div className="page-header">
        <div>
          <p className="eyebrow">Новый мульти-товар</p>
          <h1>Создание объявления</h1>
        </div>
        <Link className="button" href="/catalog">
          <ArrowLeft size={18} aria-hidden />
          В каталог
        </Link>
      </div>
      <ProductCreationWizard initialCategories={categories} />
    </div>
  );
}
