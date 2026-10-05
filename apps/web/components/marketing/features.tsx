import { clientColorHex } from "@punchcard/shared";
import type { ReactNode } from "react";

/** The native surfaces, each shown as the thing itself rather than an icon. */

const SMITH = clientColorHex("blue");
const PATEL = clientColorHex("green");

function DynamicIsland() {
  return (
    <div className="clock flex flex-col items-center gap-4" aria-hidden>
      <div className="flex h-9 w-[210px] items-center justify-between rounded-full bg-black px-3 text-paper">
        <span className="size-2.5 rounded-full" style={{ background: SMITH }} />
        <span className="text-[14px] font-semibold text-[#FF7E3A] tabular">
          1:<span className="clock-mm" />
        </span>
      </div>
      <div className="w-[270px] rounded-[30px] bg-black px-5 py-4 text-paper">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold">Smith kitchen</span>
          <span className="text-[13px] text-paper/60 tabular">
            <span className="clock-earned" />
          </span>
        </div>
        <p className="mt-1 text-[34px] leading-none font-semibold text-[#FF7E3A] tabular">
          1:<span className="clock-mm" />:<span className="clock-ss" />
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] font-semibold">
          <span className="rounded-full bg-white/15 py-1.5 text-center">Break</span>
          <span className="rounded-full bg-[#FF7E3A] py-1.5 text-center text-charcoal">Stop</span>
        </div>
      </div>
    </div>
  );
}

function AndroidLiveUpdate() {
  return (
    <div className="w-full max-w-[300px] rounded-[22px] bg-[#1F2226] p-4 text-paper" aria-hidden>
      <div className="flex items-center gap-2 text-[12px] text-paper/70">
        <span className="flex size-5 items-center justify-center rounded-full bg-[#FF7E3A] text-[10px] font-bold text-charcoal">
          P
        </span>
        Punchcard
        <span className="ml-auto rounded-full bg-[#FF7E3A]/20 px-2 py-0.5 font-semibold text-[#FF9459] tabular">1:47</span>
      </div>
      <p className="mt-2 text-[15px] font-semibold">Smith kitchen</p>
      <p className="text-[13px] text-paper/70">Running, 1h 47m</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15">
        <div className="h-full w-2/5 rounded-full bg-[#FF7E3A]" />
      </div>
      <div className="mt-3 flex gap-5 text-[13px] font-semibold text-[#FF9459]">
        <span>Stop</span>
        <span>Add break</span>
      </div>
    </div>
  );
}

function Widgets() {
  return (
    <div className="flex items-end gap-3" aria-hidden>
      <div className="flex size-[132px] flex-col justify-between rounded-[22px] bg-surface p-3.5 ring-1 ring-line">
        <span className="text-[12px] font-semibold text-ink-muted">Today</span>
        <span>
          <span className="block text-[30px] leading-none font-semibold tabular">6:22</span>
          <span className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-muted">
            <span className="size-2 rounded-full" style={{ background: SMITH }} />
            Smith kitchen
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex size-[60px] items-center justify-center rounded-full bg-surface ring-1 ring-line">
          <span className="text-[13px] font-bold tabular">1:47</span>
        </div>
        <div className="flex h-[60px] w-[132px] items-center gap-2 rounded-[18px] bg-accent px-3 text-on-accent">
          <span className="size-2 rounded-full bg-on-accent" />
          <span className="text-[12px] leading-tight font-semibold">
            Start
            <br />
            Patel rewire
          </span>
        </div>
      </div>
    </div>
  );
}

function GeofenceNudge() {
  return (
    <div className="flex w-full max-w-[300px] flex-col gap-2" aria-hidden>
      <div className="rounded-[18px] bg-surface p-3.5 ring-1 ring-line">
        <p className="text-[12px] text-ink-muted">Punchcard, now</p>
        <p className="mt-0.5 text-[14px] font-semibold">Left Smith kitchen. Still on the clock?</p>
        <div className="mt-2.5 flex gap-2 text-[13px] font-semibold">
          <span className="rounded-full bg-accent px-3 py-1 text-on-accent">Stop at 16:02</span>
          <span className="rounded-full px-3 py-1 ring-1 ring-line-strong">Keep going</span>
        </div>
      </div>
      <div className="ml-6 rounded-[18px] bg-surface p-3.5 opacity-80 ring-1 ring-line">
        <p className="text-[12px] text-ink-muted">Punchcard, 07:58</p>
        <p className="mt-0.5 text-[14px] font-semibold">Arrived at Patel rewire. Start the clock?</p>
      </div>
    </div>
  );
}

function TimesheetSheet() {
  const rows = [
    ["Mon 29", "Panel swap", "7.5", "$450.00"],
    ["Tue 30", "Panel swap", "8.0", "$480.00"],
    ["Wed 1", "Second fix", "6.0", "$360.00"],
  ];
  return (
    <div className="w-full max-w-[300px] rotate-[-1.5deg] rounded-[6px] bg-[#FFFDF8] p-4 text-charcoal shadow-md" aria-hidden>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-bold">Timesheet</p>
          <p className="text-[11px] text-[#555D68]">Patel rewire, week of 29 Sep</p>
        </div>
        <span className="h-6 w-1.5 rounded-full" style={{ background: PATEL }} />
      </div>
      <table className="mt-3 w-full text-[11px] tabular">
        <tbody>
          {rows.map(([day, job, hours, amount]) => (
            <tr key={day} className="border-t border-[#DAD4C6]">
              <td className="py-1.5">{day}</td>
              <td className="py-1.5 text-[#555D68]">{job}</td>
              <td className="py-1.5 text-right">{hours} h</td>
              <td className="py-1.5 text-right">{amount}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-charcoal font-bold">
            <td className="py-1.5" colSpan={2}>
              Total
            </td>
            <td className="py-1.5 text-right">21.5 h</td>
            <td className="py-1.5 text-right">$1,290.00</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Feature({
  title,
  children,
  art,
  dark = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  art: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-lg border ${
        dark ? "border-transparent bg-charcoal text-paper" : "border-line bg-surface-elevated"
      } ${className}`}
    >
      <div className={`flex min-h-[260px] flex-1 items-center justify-center px-6 py-10 ${dark ? "" : "bg-surface-sunken/60"}`}>
        {art}
      </div>
      <div className="px-6 pt-5 pb-7">
        <h3 className="semi-condensed text-headline font-bold">{title}</h3>
        <p className={`mt-2 max-w-[52ch] text-callout ${dark ? "text-paper/75" : "text-ink-muted"}`}>{children}</p>
      </div>
    </article>
  );
}

export function Features() {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Feature
        className="md:col-span-4"
        dark
        title="On the Lock Screen and in the Dynamic Island"
        art={<DynamicIsland />}
      >
        The running job, its client colour, the elapsed time and what you have earned so far, with Stop and Break buttons
        you can press with gloves on. No unlocking, no opening the app.
      </Feature>
      <Feature className="md:col-span-2" title="Android 16 Live Update" art={<AndroidLiveUpdate />}>
        A promoted Live Update with a running chronometer on Android 16, and an ongoing notification on older versions.
      </Feature>
      <Feature className="md:col-span-2" title="Widgets that start the clock" art={<Widgets />}>
        Today&apos;s total on the Home Screen, a Lock Screen ring, and one tap to restart your last job.
      </Feature>
      <Feature className="md:col-span-2" title="Nudges when you forget" art={<GeofenceNudge />}>
        A reminder after 10 hours on the clock. With Pro, a prompt when you leave a job site or pull up at the next one.
      </Feature>
      <Feature className="md:col-span-2" title="Timesheets clients accept" art={<TimesheetSheet />}>
        Day and week views, edits with a note, photos and mileage. Send a PDF or CSV from the share sheet.
      </Feature>
    </div>
  );
}
