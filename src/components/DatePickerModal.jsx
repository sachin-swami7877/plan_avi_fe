import { useState, useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthYearLabel(date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function getCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const grid = [];
  for (let i = 0; i < startPad; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  return grid;
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function getToday() {
  return toISODate(new Date());
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

function getLast7Start() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return toISODate(d);
}

const PRESETS = [
  { label: 'Today', getRange: () => ({ start: getToday(), end: getToday() }) },
  { label: 'Yesterday', getRange: () => ({ start: getYesterday(), end: getYesterday() }) },
  { label: 'Last 7 Days', getRange: () => ({ start: getLast7Start(), end: getToday() }) },
  { label: 'All Records', getRange: () => ({ start: null, end: null }) },
];

export default function DatePickerModal({ open, onClose, onApply, initialStartDate, initialEndDate, rangeMode = false, initialDate }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = initialStartDate || initialDate ? new Date(initialStartDate || initialDate) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Range mode state
  const [startDate, setStartDate] = useState(() => initialStartDate || initialDate || null);
  const [endDate, setEndDate] = useState(() => initialEndDate || initialDate || null);
  const [selectingEnd, setSelectingEnd] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelect = (day) => {
    if (!day) return;
    const d = toISODate(new Date(year, month, day));

    if (!rangeMode) {
      // Single date mode (backward compat)
      setStartDate(d);
      setEndDate(d);
      return;
    }

    if (!selectingEnd || !startDate) {
      setStartDate(d);
      setEndDate(null);
      setSelectingEnd(true);
    } else {
      if (d < startDate) {
        setStartDate(d);
        setEndDate(startDate);
      } else {
        setEndDate(d);
      }
      setSelectingEnd(false);
    }
  };

  const handlePreset = (preset) => {
    const { start, end } = preset.getRange();
    setStartDate(start);
    setEndDate(end);
    setSelectingEnd(false);
  };

  const handleApply = () => {
    if (rangeMode) {
      onApply(startDate, endDate);
    } else {
      onApply(startDate || endDate);
    }
    onClose();
  };

  const isInRange = (day) => {
    if (!day || !startDate) return false;
    const d = toISODate(new Date(year, month, day));
    if (!endDate) return d === startDate;
    return d >= startDate && d <= endDate;
  };

  const isStart = (day) => {
    if (!day) return false;
    return toISODate(new Date(year, month, day)) === startDate;
  };

  const isEnd = (day) => {
    if (!day || !endDate) return false;
    return toISODate(new Date(year, month, day)) === endDate;
  };

  // Label for range display
  const getRangeLabel = () => {
    if (!startDate && !endDate) return 'All Records';
    if (startDate === getToday() && endDate === getToday()) return "Today's Records";
    if (startDate === getYesterday() && endDate === getYesterday()) return "Yesterday's Records";
    if (startDate && endDate && startDate !== endDate) {
      return `${new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(endDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (startDate) {
      return new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
    return 'Select date';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Previous month">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg font-bold text-gray-800">{getMonthYearLabel(new Date(year, month, 1))}</span>
            <button type="button" onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Next month">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          {rangeMode && (
            <p className="text-sm text-gray-500">{getRangeLabel()}</p>
          )}
          {!rangeMode && startDate && (
            <p className="text-sm text-gray-500">
              {new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Presets */}
        {rangeMode && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {PRESETS.map((preset) => {
              const { start, end } = preset.getRange();
              const active = startDate === start && endDate === end;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
            {calendarDays.map((day, i) => (
              <div key={i} className="flex justify-center">
                {day === null ? (
                  <span className="w-9 h-9" />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelect(day)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      isStart(day) || isEnd(day)
                        ? 'bg-violet-500 text-white'
                        : isInRange(day)
                        ? 'bg-violet-100 text-violet-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl bg-violet-500 text-white font-medium hover:bg-violet-600"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
