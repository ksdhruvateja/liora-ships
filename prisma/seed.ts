import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.courierBrandMap.deleteMany();

  const maps = [
    { matchType: "NAME_CONTAINS", matchValue: "overnight", displayName: "Liora Overnight", sortOrder: 10 },
    { matchType: "NAME_CONTAINS", matchValue: "next day", displayName: "Liora Overnight", sortOrder: 20 },
    { matchType: "NAME_CONTAINS", matchValue: "priority", displayName: "Liora Priority", sortOrder: 30 },
    { matchType: "NAME_CONTAINS", matchValue: "express", displayName: "Liora Express", sortOrder: 40 },
    { matchType: "NAME_CONTAINS", matchValue: "expedited", displayName: "Liora Express", sortOrder: 50 },
    { matchType: "NAME_CONTAINS", matchValue: "saver", displayName: "Liora Saver", sortOrder: 60 },
    { matchType: "NAME_CONTAINS", matchValue: "economy", displayName: "Liora Economy", sortOrder: 70 },
    { matchType: "NAME_CONTAINS", matchValue: "ground", displayName: "Liora Ground", sortOrder: 80 },
    { matchType: "NAME_CONTAINS", matchValue: "standard", displayName: "Liora Ground", sortOrder: 90 },
  ];

  await prisma.courierBrandMap.createMany({ data: maps });

  const shipments = await prisma.shipment.findMany({
    select: { id: true, brandedCourierName: true },
  });
  for (const shipment of shipments) {
    const next = shipment.brandedCourierName
      .replaceAll("Forez Ships", "Liora")
      .replaceAll("Forezships", "Liora");
    if (next !== shipment.brandedCourierName) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { brandedCourierName: next },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
