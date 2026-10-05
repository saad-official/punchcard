import { formatAddressLabel, formatCoordinates } from "./address";

describe("formatAddressLabel", () => {
  it("prefers the platform's formatted address (Android)", () => {
    expect(formatAddressLabel({ formattedAddress: "12 Harbour St, Sydney NSW 2000, Australia", street: "Harbour St" })).toBe(
      "12 Harbour St, Sydney NSW 2000, Australia",
    );
  });
  it("builds street, city, region and postcode from parts (iOS)", () => {
    expect(
      formatAddressLabel({ streetNumber: "12", street: "Harbour St", city: "Sydney", region: "NSW", postalCode: "2000", country: "Australia" }),
    ).toBe("12 Harbour St, Sydney, NSW, 2000");
  });
  it("falls back to the place name and subregion and drops repeats", () => {
    expect(formatAddressLabel({ name: "Opera House", subregion: "Sydney", region: "Sydney" })).toBe("Opera House, Sydney");
  });
  it("uses the country when nothing finer is known", () => {
    expect(formatAddressLabel({ country: "Australia" })).toBe("Australia");
  });
  it("returns null for an empty result", () => {
    expect(formatAddressLabel({ street: null, city: "  " })).toBeNull();
  });
});

describe("formatCoordinates", () => {
  it("prints five decimals (about a metre)", () => {
    expect(formatCoordinates(-33.856784, 151.215297)).toBe("-33.85678, 151.21530");
  });
});
