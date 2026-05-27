import "../src/server/loadEnv";
import bcrypt from "bcryptjs";
import { PrismaClient, VariantStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin12345";
  const configuredHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const passwordHash =
    configuredHash && configuredHash.startsWith("$2")
      ? configuredHash
      : await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash }
  });

  const product = await prisma.product.upsert({
    where: { id: "seed-nike-stussy" },
    update: {},
    create: {
      id: "seed-nike-stussy",
      title: "Nike Stussy",
      brand: "Nike",
      baseCategory: process.env.DEFAULT_AVITO_CATEGORY ?? "Одежда, обувь, аксессуары",
      baseDescription:
        "Капсульная модель Nike Stussy. Варианты отличаются цветом и размером.",
      avitoAttributes: {
        condition: process.env.DEFAULT_CONDITION ?? "Новое",
        goodsType: "Мужская одежда"
      }
    }
  });

  const variants = [
    { title: "Nike Stussy Black M", color: "Black", size: "M", price: "12990.00" },
    { title: "Nike Stussy Black L", color: "Black", size: "L", price: "12990.00" },
    { title: "Nike Stussy Grey M", color: "Grey", size: "M", price: "11990.00" }
  ];

  for (const variant of variants) {
    await prisma.variant.upsert({
      where: {
        id: `seed-${variant.color.toLowerCase()}-${variant.size.toLowerCase()}`
      },
      update: {},
      create: {
        id: `seed-${variant.color.toLowerCase()}-${variant.size.toLowerCase()}`,
        productId: product.id,
        ...variant,
        quantity: 3,
        description: `${variant.title}. Новый товар, готов к отгрузке.`,
        status: VariantStatus.READY
      }
    });
  }

  await prisma.actionLog.create({
    data: {
      message: "Seed data created",
      context: { email, productId: product.id }
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
