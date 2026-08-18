import { reconcileStuckPaidShipments } from "../src/lib/fulfillment";

async function main() {
  const results = await reconcileStuckPaidShipments();
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
