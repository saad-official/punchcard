import { clientColorHex } from "@punchcard/shared";

/**
 * The hero: the Clock screen inside a stylised phone, plus the Lock Screen
 * Live Activity for the same running job. Pure HTML/CSS; the `.clock`
 * wrapper drives every ticking digit (see globals.css), so both surfaces
 * stay in step without JavaScript.
 */

const SMITH = clientColorHex("blue");
const PATEL = clientColorHex("green");
const RIVERA = clientColorHex("amber");

/** "1:47:12" with live minutes and seconds. */
function Elapsed({ className = "" }: { className?: string }) {
  return (
    <span className={`tabular ${className}`} role="img" aria-label="1 hour 47 minutes elapsed">
      <span aria-hidden>1:</span>
      <span aria-hidden className="clock-mm" />
      <span aria-hidden>:</span>
      <span aria-hidden className="clock-ss" />
    </span>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-7 pt-3.5 text-[13px] font-semibold tabular">
      <span>9:41</span>
      <span className="flex items-center gap-1.5" aria-hidden>
        <span className="flex items-end gap-[2px]">
          {[4, 6, 8, 10].map((h) => (
            <span key={h} className="w-[3px] rounded-[1px] bg-current" style={{ height: h }} />
          ))}
        </span>
        <span className="relative h-[11px] w-[22px] rounded-[3px] border border-current opacity-90">
          <span className="absolute inset-[1.5px] right-[5px] rounded-[1.5px] bg-current" />
        </span>
      </span>
    </div>
  );
}

function TodayRow({ color, client, job, time, earned }: { color: string; client: string; job: string; time: string; earned: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="h-8 w-1 rounded-full" style={{ background: color }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{client}</span>
        <span className="block truncate text-[12px] text-ink-muted">{job}</span>
      </span>
      <span className="text-right tabular">
        <span className="block text-[14px] font-semibold">{time}</span>
        <span className="block text-[12px] text-ink-muted">{earned}</span>
      </span>
    </li>
  );
}

function ClockScreen() {
  return (
    <div className="flex h-full flex-col bg-surface text-ink">
      <StatusBar />
      <div className="flex items-baseline justify-between px-6 pt-6">
        <p className="text-[28px] leading-none font-bold tracking-tight">Clock</p>
        <p className="text-[13px] text-ink-muted">Mon 5 Oct</p>
      </div>

      <div className="mx-4 mt-5 rounded-[20px] border border-line bg-surface-elevated px-5 pt-4 pb-5">
        <p className="inline-flex items-center gap-2 rounded-full bg-surface-sunken py-1 pr-3 pl-2 text-[13px] font-semibold">
          <span className="size-2.5 rounded-full" style={{ background: SMITH }} aria-hidden />
          Smith kitchen
        </p>
        <p className="mt-1 text-[12px] text-ink-muted">Kitchen refit, since 7:54</p>
        <p className="mt-3 text-[56px] leading-[1] font-semibold tracking-[-0.03em]">
          <Elapsed />
        </p>
        <p className="mt-2 text-[13px] text-ink-muted tabular">
          <span className="clock-earned font-semibold text-ink" aria-label="107 dollars" /> so far at $60/h
        </p>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <span className="flex h-12 items-center justify-center rounded-[12px] bg-accent text-[16px] font-bold text-on-accent">
            Stop
          </span>
          <span className="flex h-12 items-center justify-center rounded-[12px] border border-line-strong px-5 text-[15px] font-semibold">
            Break
          </span>
        </div>
      </div>

      <div className="px-6 pt-5">
        <p className="text-[13px] font-semibold text-ink-muted">Earlier today</p>
        <ul className="mt-1 divide-y divide-line">
          <TodayRow color={PATEL} client="Patel rewire" job="Panel swap" time="2h 10m" earned="$156.00" />
          <TodayRow color={RIVERA} client="Rivera bathroom" job="Leak call-out" time="0h 45m" earned="$54.00" />
        </ul>
      </div>
    </div>
  );
}

/** Lock Screen Live Activity banner (dark glass, as iOS draws it). */
function LockScreenActivity() {
  return (
    <div className="rounded-[24px] bg-[#3A3F45]/75 p-4 text-paper shadow-lg ring-1 ring-white/15 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex items-center gap-3">
        <span className="h-11 w-1.5 rounded-full" style={{ background: SMITH }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">Smith kitchen</p>
          <p className="text-[13px] text-paper/70 tabular">
            <span className="clock-earned" aria-label="107 dollars" /> so far
          </p>
        </div>
        <p className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-[#FF7E3A]">
          <Elapsed />
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[14px] font-semibold" aria-hidden>
        <span className="rounded-full bg-white/12 py-2 text-center">Break</span>
        <span className="rounded-full bg-[#FF7E3A] py-2 text-center text-charcoal">Stop</span>
      </div>
    </div>
  );
}

export function HeroDevice() {
  return (
    <figure className="clock relative mx-auto w-[300px] pb-16 lg:pb-0">
      <div className="relative h-[620px] w-[300px] rounded-[48px] bg-charcoal p-[9px] shadow-lg ring-1 ring-black/40 dark:bg-[#0B0C0E] dark:ring-white/15">
        <div className="relative h-full overflow-hidden rounded-[40px]">
          <ClockScreen />
          <span
            className="absolute top-2.5 left-1/2 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-charcoal"
            aria-hidden
          />
        </div>
      </div>
      <div className="absolute bottom-0 left-1/2 w-[330px] max-w-[calc(100vw-32px)] -translate-x-1/2 lg:bottom-28 lg:left-0 lg:-translate-x-[48%]">
        <LockScreenActivity />
      </div>
      <figcaption className="sr-only">
        The Punchcard Clock screen with a job running for Smith kitchen, and the same timer as a Live Activity on the
        Lock Screen with Break and Stop buttons.
      </figcaption>
    </figure>
  );
}
