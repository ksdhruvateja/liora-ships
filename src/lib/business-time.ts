import { getConfig } from "./config";

export type BusinessDayRange = {
  timezone: string;
  businessDate: string;
  start: Date;
  end: Date;
};

function formatBusinessDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function offsetMillis(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

export function getBusinessTimezone() {
  return getConfig().BUSINESS_TIMEZONE || "America/New_York";
}

export function getBusinessDayRange(at: Date = new Date(), timeZone = getBusinessTimezone()): BusinessDayRange {
  const businessDate = formatBusinessDate(at, timeZone);
  const [year, month, day] = businessDate.split("-").map(Number);
  const noonUtcGuess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offset = offsetMillis(noonUtcGuess, timeZone);
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offset);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { timezone: timeZone, businessDate, start, end };
}

export function businessDateForTimestamp(at: Date, timeZone = getBusinessTimezone()) {
  return formatBusinessDate(at, timeZone);
}
