import { CLIENT_COLOR_NAMES, CLIENT_PALETTE, clientColorHex, isClientColor } from "./palette";

describe("CLIENT_PALETTE", () => {
  it("has 10 named swatches with unique names and hex values", () => {
    expect(CLIENT_PALETTE).toHaveLength(10);
    expect(new Set(CLIENT_PALETTE.map((s) => s.name)).size).toBe(10);
    expect(new Set(CLIENT_PALETTE.map((s) => s.hex.toLowerCase())).size).toBe(10);
  });
  it("uses 6-digit hex colours", () => {
    for (const s of CLIENT_PALETTE) expect(s.hex).toMatch(/^#[0-9A-F]{6}$/);
  });
  it("lists names in palette order", () => {
    expect(CLIENT_COLOR_NAMES).toEqual(CLIENT_PALETTE.map((s) => s.name));
  });
});

describe("isClientColor", () => {
  it("accepts palette names only", () => {
    expect(isClientColor(CLIENT_PALETTE[0]!.name)).toBe(true);
    expect(isClientColor("#FF0000")).toBe(false);
    expect(isClientColor(3)).toBe(false);
  });
});

describe("clientColorHex", () => {
  it("maps a swatch name to its hex", () => {
    const s = CLIENT_PALETTE[3]!;
    expect(clientColorHex(s.name)).toBe(s.hex);
  });
});
