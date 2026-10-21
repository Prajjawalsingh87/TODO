import { WEEKDAYS } from '../recurrence'
import { fieldClass } from '../todoUtils'

const weekdayOf = (iso) => {
  if (!iso) return new Date().getDay()
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** "Repeat" select plus weekday toggles for weekly rules. `due` seeds the default weekday. */
function RepeatPicker({ value, onChange, due, label = true }) {
  const freq = value?.freq || ""

  const setFreq = (next) => {
    // Keep the series id so later occurrences still share one id prefix.
    const series = value?.series ? { series: value.series } : {}
    if (!next) onChange(null)
    else if (next === "weekly") onChange({ ...series, freq: "weekly", days: [weekdayOf(due)] })
    else onChange({ ...series, freq: next })
  }

  const toggleDay = (day) => {
    const days = value.days.includes(day) ? value.days.filter((d) => d !== day) : [...value.days, day].sort((a, b) => a - b)
    if (days.length) onChange({ ...value, days })
  }

  const select = (
    <select aria-label={label ? undefined : "Repeat"} className={fieldClass} value={freq} onChange={(e) => setFreq(e.target.value)}>
      <option value="">Never</option>
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
    </select>
  )

  return (
    <>
      {label ? <label className="flex items-center gap-2 text-sm text-slate-600">Repeat {select}</label> : select}
      {freq === "weekly" && (
        <div className="flex basis-full flex-wrap gap-1" role="group" aria-label="Repeat on">
          {WEEKDAYS.map((name, day) => {
            const on = value.days.includes(day)
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                aria-label={name}
                title={on && value.days.length === 1 ? "Pick another day before removing this one" : name}
                onClick={() => toggleDay(day)}
                className={`h-8 w-9 rounded-lg text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  on ? "bg-brand-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                }`}
              >
                {name.slice(0, 2)}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

export default RepeatPicker
