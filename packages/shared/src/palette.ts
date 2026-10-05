/** Fixed 10-swatch palette for client colours. Clients store the swatch name, never a raw hex. */
export const CLIENT_PALETTE = [
  { name: "orange", hex: "#FF6A1A" },
  { name: "red", hex: "#E5484D" },
  { name: "amber", hex: "#F5A524" },
  { name: "lime", hex: "#8DB600" },
  { name: "green", hex: "#30A46C" },
  { name: "teal", hex: "#12A594" },
  { name: "sky", hex: "#3DA9FC" },
  { name: "blue", hex: "#3E63DD" },
  { name: "violet", hex: "#8E4EC6" },
  { name: "pink", hex: "#D6409F" },
] as const;

export type ClientColor = (typeof CLIENT_PALETTE)[number]["name"];

export const CLIENT_COLOR_NAMES = CLIENT_PALETTE.map((s) => s.name) as [ClientColor, ...ClientColor[]];

export function isClientColor(value: unknown): value is ClientColor {
  return typeof value === "string" && (CLIENT_COLOR_NAMES as readonly string[]).includes(value);
}

export function clientColorHex(name: ClientColor): string {
  return CLIENT_PALETTE.find((s) => s.name === name)?.hex ?? CLIENT_PALETTE[0].hex;
}
