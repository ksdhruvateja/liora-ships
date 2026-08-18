import type { EasyshipClient } from "./easyship";

export function createMockEasyshipClient(): EasyshipClient {
  return {
    async requestRates() {
      return [
        {
          courierServiceId: "mock-ground",
          courierName: "Standard",
          umbrellaName: "Ground",
          serviceName: "Standard",
          totalCharge: 8.5,
          currency: "USD",
          minDeliveryTime: 5,
          maxDeliveryTime: 7,
        },
        {
          courierServiceId: "mock-express",
          courierName: "Express",
          umbrellaName: "Express",
          serviceName: "Express",
          totalCharge: 14.2,
          currency: "USD",
          minDeliveryTime: 2,
          maxDeliveryTime: 3,
        },
        {
          courierServiceId: "mock-overnight",
          courierName: "Overnight",
          umbrellaName: "Priority",
          serviceName: "Overnight",
          totalCharge: 28,
          currency: "USD",
          minDeliveryTime: 1,
          maxDeliveryTime: 1,
        },
      ];
    },
    async createShipmentAndBuyLabel({ platformOrderNumber }) {
      const trackingNumber = `FZ${platformOrderNumber.slice(-8).toUpperCase()}`;
      return {
        easyshipShipmentId: `MOCK-${platformOrderNumber}`,
        labelUrl: `mock://label/${platformOrderNumber}`,
        trackingNumber,
      };
    },
  };
}
