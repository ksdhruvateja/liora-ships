/**
 * Curated Unsplash photography used across the site. Every image is served
 * through next/image (images.unsplash.com is allowed in next.config.mjs).
 * Keep one photo per placement so pages don't repeat each other.
 */
const u = (id: string, w = 1800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const photos = {
  // Home
  heroJet: u("1542296332-2e4473faf563", 2400), // cargo jet at golden hour
  highwayInterchange: u("1465447142348-e9952c393450"),
  parcels: u("1595246140625-573b715d11dc"),
  courierVan: u("1612630741022-b29ec17d013d"),
  courierScooter: u("1617347454431-f49d7ff5c3b1"),
  openRoad: u("1519003722824-194d4455a60c"), // truck on an open mountain road
  warehouseBoxes: u("1586528116311-ad8dd3c8310d"), // warehouse stacked with boxes
  docksAerial: u("1565891741441-64926e441838"), // loading docks from above
  compareRates: u("1460925895917-afdab827c52f"), // laptop showing charts side by side
  savingsGrowth: u("1579621970563-ebec7560ff3e"), // plant growing from coins
  truckSunset: u("1591768793355-74d04bb6608f"),
  planeWing: u("1436491865332-7a61a109cc05"),
  containerShip: u("1524522173746-f628baad3644"),
  handoff: u("1566576721346-d4a3b4eaeb55"),
  forklift: u("1616401784845-180882ba9ba8"),
  orangeContainers: u("1605732562742-3023a888e56e"),
  driver: u("1449965408869-eaa3f722e40d"),
  containersAerial: u("1590496793929-36417d3117de"),
  cityNight: u("1444723121867-7a241cacace9"),

  // Other pages
  quoteHeader: u("1601584115197-04ecc0da31d7", 2200),
  freightTrain: u("1474487548417-781cb71495f3"),
  stackedBoxes: u("1609143739217-01b60dad1c67"),
  vanLoading: u("1620455800201-7f00aeef12ed"),
  desertRoad: u("1500530855697-b586d89ba3ee", 2200),
  warehouseAisle: u("1587293852726-70cdb56c2866"),
};
