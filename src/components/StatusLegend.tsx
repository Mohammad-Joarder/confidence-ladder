interface StatusLegendProps {
  compact?: boolean;
}

export function StatusLegend({ compact = false }: StatusLegendProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className={`${compact ? "text-sm" : "text-base"} font-semibold text-slate-900 dark:text-white`}>
        Status meaning
      </h2>
      <div className={`mt-3 grid gap-2 ${compact ? "text-xs" : "text-sm"} text-slate-600 dark:text-slate-300`}>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Answered
          </span>
          <p>Teacher posted an official written response for this question.</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            Live session
          </span>
          <p>Teacher marked this for real-time clarification in an upcoming doubt session.</p>
        </div>
      </div>
    </section>
  );
}
