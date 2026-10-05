import { COMPETITORS, PRICES, soloMonthly } from "@/lib/marketing/content";

const money = (value: number) => `$${value}`;

type Column = { name: string; highlight?: boolean; base: string; perUser: string; solo: string; year: string };

const COLUMNS: Column[] = [
  { name: "Punchcard Free", base: "$0", perUser: "None", solo: "$0", year: "$0" },
  {
    name: "Punchcard Pro",
    highlight: true,
    base: PRICES.proMonthly,
    perUser: "None",
    solo: PRICES.proMonthly,
    year: `${PRICES.proYearly} paid yearly`,
  },
  ...COMPETITORS.map((c) => ({
    name: c.name,
    base: money(c.base),
    perUser: money(c.perUser),
    solo: money(soloMonthly(c)),
    year: money(soloMonthly(c) * 12),
  })),
];

const ROWS: { label: string; key: keyof Omit<Column, "name" | "highlight"> }[] = [
  { label: "Base price per month", key: "base" },
  { label: "Plus, per person per month", key: "perUser" },
  { label: "One tradesperson, per month", key: "solo" },
  { label: "One tradesperson, per year", key: "year" },
];

/** Side-by-side list prices for one person. */
export function ComparisonTable() {
  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-line bg-surface-elevated">
        <table className="w-full min-w-[640px] border-collapse text-left tabular">
          <caption className="sr-only">Monthly and yearly cost for one person: Punchcard against QuickBooks Time and ClockShark</caption>
          <thead>
            <tr>
              <td className="w-[28%] p-4" />
              {COLUMNS.map((col) => (
                <th
                  key={col.name}
                  scope="col"
                  className={`p-4 align-bottom text-callout font-bold ${col.highlight ? "border-t-4 border-accent bg-accent-soft" : ""}`}
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-t border-line">
                <th scope="row" className="p-4 text-callout font-medium text-ink-muted">
                  {row.label}
                </th>
                {COLUMNS.map((col) => (
                  <td
                    key={col.name}
                    className={`p-4 ${row.key === "solo" ? "text-headline font-bold" : "text-callout"} ${
                      col.highlight ? "bg-accent-soft" : ""
                    }`}
                  >
                    {col[row.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-[72ch] text-caption text-ink-muted">
        QuickBooks Time and ClockShark monthly list prices as published on their sites in October 2026,
        before discounts and taxes. Both are built for teams with payroll; check their sites for current terms.
      </p>
    </div>
  );
}
