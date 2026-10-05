import { centsToDecimal, earningsCents, formatMoney, minorUnitDigits } from "./pay";

describe("earningsCents", () => {
  it("pays a whole hour at the hourly rate", () => {
    expect(earningsCents(3600, 6500)).toBe(6500);
  });
  it("pays partial hours exactly", () => {
    expect(earningsCents(5400, 6500)).toBe(9750);
    expect(earningsCents(60, 6000)).toBe(100);
  });
  it("rounds half-up to the nearest cent by default", () => {
    // 1 s at $45/h = 1.25 cents; 2 s = 2.5 cents
    expect(earningsCents(1, 4500)).toBe(1);
    expect(earningsCents(2, 4500)).toBe(3);
  });
  it("supports rounding cents up or down", () => {
    expect(earningsCents(1, 4500, "up")).toBe(2);
    expect(earningsCents(2, 4500, "down")).toBe(2);
  });
  it("does not drift like float math on awkward rates", () => {
    // 0.1 h at $33.33 = 333.3 cents
    expect(earningsCents(360, 3333)).toBe(333);
    // 7 h 13 min at $57.89 = 41,777.28 cents
    expect(earningsCents(7 * 3600 + 13 * 60, 5789)).toBe(41777);
  });
  it("stays exact for products beyond Number.MAX_SAFE_INTEGER", () => {
    expect(earningsCents(3600 * 1_000_000_000, 9_000_001)).toBe(9_000_001_000_000_000);
  });
  it("is zero for zero time or a zero rate", () => {
    expect(earningsCents(0, 6500)).toBe(0);
    expect(earningsCents(3600, 0)).toBe(0);
  });
  it("rejects non-integer inputs", () => {
    expect(() => earningsCents(1.5, 100)).toThrow(RangeError);
    expect(() => earningsCents(1, 99.5)).toThrow(RangeError);
  });
});

describe("minorUnitDigits", () => {
  it("knows 2 for USD, 0 for JPY, 3 for KWD", () => {
    expect(minorUnitDigits("USD")).toBe(2);
    expect(minorUnitDigits("JPY")).toBe(0);
    expect(minorUnitDigits("KWD")).toBe(3);
  });
});

describe("centsToDecimal", () => {
  it("renders minor units as a plain decimal string", () => {
    expect(centsToDecimal(6500, "USD")).toBe("65.00");
    expect(centsToDecimal(5, "CAD")).toBe("0.05");
    expect(centsToDecimal(4500, "JPY")).toBe("4500");
    expect(centsToDecimal(-1234, "USD")).toBe("-12.34");
  });
});

describe("formatMoney", () => {
  it("formats USD in en-US by default", () => {
    expect(formatMoney(123456)).toBe("$1,234.56");
  });
  it("formats CAD for a Canadian locale and marks it in a US locale", () => {
    expect(formatMoney(123456, "CAD", "en-CA")).toBe("$1,234.56");
    expect(formatMoney(123456, "CAD", "en-US")).toBe("CA$1,234.56");
  });
  it("treats JPY minor units as whole yen", () => {
    expect(formatMoney(1234, "JPY", "en-US")).toBe("¥1,234");
  });
  it("follows locale separators", () => {
    expect(formatMoney(123456, "EUR", "de-DE").replace(/\s/g, " ")).toBe("1.234,56 €");
  });
  it("formats negative amounts", () => {
    expect(formatMoney(-500, "USD", "en-US")).toBe("-$5.00");
  });
});
