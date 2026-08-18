import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function carrierDisplayName(easyshipName: string, brandedName: string) {
  const raw = (easyshipName || brandedName).trim();
  return raw
    .replace(/^Liora Choice\s*[·\-–:]\s*/i, "")
    .replace(/^Liora\s+(Saver|Ground|Express|Priority|Overnight|Economy|Shipping)\b\s*[·\-–:]?\s*/i, "")
    .trim() || raw || "Shipping";
}

async function main() {
  await prisma.courierBrandMap.deleteMany();

  const shipments = await prisma.shipment.findMany({
    select: { id: true, brandedCourierName: true, easyshipCourierName: true },
  });
  for (const shipment of shipments) {
    const next = carrierDisplayName(shipment.easyshipCourierName, shipment.brandedCourierName);
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
