import type { EasyshipClient } from "./easyship";

export function createMockEasyshipClient(): EasyshipClient {
  return {
    async requestRates() {
      return [
        {
          courierServiceId: "mock-ground",
          courierName: "UPS Ground",
          umbrellaName: "UPS",
          serviceName: "Ground",
          totalCharge: 8.5,
          currency: "USD",
          minDeliveryTime: 5,
          maxDeliveryTime: 7,
        },
        {
          courierServiceId: "mock-express",
          courierName: "FedEx 2Day",
          umbrellaName: "FedEx",
          serviceName: "2Day",
          totalCharge: 14.2,
          currency: "USD",
          minDeliveryTime: 2,
          maxDeliveryTime: 3,
        },
        {
          courierServiceId: "mock-overnight",
          courierName: "USPS Priority Mail Express",
          umbrellaName: "USPS",
          serviceName: "Priority Mail Express",
          totalCharge: 28,
          currency: "USD",
          minDeliveryTime: 1,
          maxDeliveryTime: 1,
        },
      ];
    },
    async getWalletBalance() {
      return {
        balanceCents: 100_000,
        availableBalanceCents: 100_000,
        currency: "USD",
      };
    },
    async addWalletCredit({ amountDollars }) {
      if (amountDollars <= 0) {
        return { status: 201 as const, transactionReference: "mock-recharge" };
      }
      return { status: 201 as const, transactionReference: `mock-recharge-${amountDollars}` };
    },
    async resolveOriginAddress() {
      return "mock-origin-address-id";
    },
    async listPickupSlots({ courierServiceId }) {
      const { normalizePickupSlotsResponse } = await import("./easyship-pickups");
      if (courierServiceId === "mock-express") {
        return normalizePickupSlotsResponse(courierServiceId, {}, 404);
      }
      if (courierServiceId === "mock-overnight") {
        return normalizePickupSlotsResponse(
          courierServiceId,
          {
            courier_service_handover_option: {
              timezone: "America/New_York",
              pickup_slots: [
                {
                  date: new Date().toISOString().slice(0, 10),
                  time_slots: [
                    {
                      time_slot_id: "mock-free-slot",
                      from_time: "09:00",
                      to_time: "12:00",
                      price: 0,
                      currency: "USD",
                    },
                  ],
                },
              ],
            },
          },
          200,
        );
      }
      return normalizePickupSlotsResponse(
        courierServiceId,
        {
          courier_service_handover_option: {
            timezone: "America/New_York",
            pickup_slots: [
              {
                date: new Date().toISOString().slice(0, 10),
                time_slots: [
                  {
                    time_slot_id: "mock-slot-1",
                    from_time: "12:00",
                    to_time: "16:00",
                    price: 15,
                    currency: "USD",
                  },
                ],
              },
            ],
          },
        },
        200,
      );
    },
    async createPickup() {
      return { easyshipPickupId: "mock-pickup-1", raw: {} };
    },
    async listShipmentsByLabelGeneratedAt() {
      return { shipments: [], meta: {} };
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
