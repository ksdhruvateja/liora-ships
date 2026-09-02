export class EasyshipRechargeError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "EasyshipRechargeError";
    this.code = code;
  }
}

export const RECHARGE_BLOCKED_BY_CARD_ISSUER = "RECHARGE_BLOCKED_BY_CARD_ISSUER";
export const EASYSHIP_RECHARGE_FAILED = "EASYSHIP_RECHARGE_FAILED";
export const EASYSHIP_RECHARGE_UNCERTAIN = "EASYSHIP_RECHARGE_UNCERTAIN";

export const EMPLOYEE_RECHARGE_BLOCKED_MESSAGE =
  "Automatic shipping payment could not be completed. An administrator has been notified.";
