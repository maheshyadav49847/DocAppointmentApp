import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday, isBefore, isAfter, startOfWeek, endOfWeek } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface CustomDatePickerProps {
  selected: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CustomDatePicker({ selected, onChange, minDate, maxDate, placeholder = 'Select date' }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selected));
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentMonth(startOfMonth(selected));
  }, [selected]);

  const goToPrevMonth = () => {
    setDirection(-1);
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setDirection(1);
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleSelectDate = (day: Date) => {
    onChange(day);
    setIsOpen(false);
  };

  const isDisabled = (day: Date) => {
    if (minDate && isBefore(day, minDate) && !isSameDay(day, minDate)) return true;
    if (maxDate && isAfter(day, maxDate) && !isSameDay(day, maxDate)) return true;
    return false;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-200 cursor-pointer"
      >
        <CalendarDays className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
        <span>{format(selected, 'dd MMM yyyy')}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
            style={{ width: '300px' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevMonth}
                  className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-white/80 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={format(currentMonth, 'MMM-yyyy')}
                    initial={{ opacity: 0, x: direction * 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-white font-bold text-sm tracking-wide"
                  >
                    {format(currentMonth, 'MMMM yyyy')}
                  </motion.span>
                </AnimatePresence>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-white/80 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 px-3 pt-3 pb-1">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={format(currentMonth, 'MMM-yyyy')}
                initial={{ opacity: 0, x: direction * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -30 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-7 px-3 pb-3 gap-0.5"
              >
                {days.map((day, idx) => {
                  const inMonth = isSameMonth(day, currentMonth);
                  const isSelectedDay = isSameDay(day, selected);
                  const isCurrentDay = isToday(day);
                  const disabled = isDisabled(day);

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabled || !inMonth}
                      onClick={() => handleSelectDate(day)}
                      className={`
                        relative w-full aspect-square flex items-center justify-center rounded-xl text-xs font-medium transition-all duration-150
                        ${!inMonth ? 'text-slate-200 cursor-default' : ''}
                        ${inMonth && !isSelectedDay && !disabled ? 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer' : ''}
                        ${isSelectedDay ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold shadow-md shadow-indigo-200 scale-105' : ''}
                        ${isCurrentDay && !isSelectedDay ? 'ring-2 ring-indigo-400 ring-offset-1 font-bold text-indigo-600' : ''}
                        ${disabled && inMonth ? 'text-slate-200 cursor-not-allowed' : ''}
                      `}
                    >
                      {format(day, 'd')}
                      {isCurrentDay && !isSelectedDay && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(startOfMonth(today));
                  onChange(today);
                  setIsOpen(false);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Today
              </button>
              <span className="text-[10px] text-slate-400 font-medium">
                {format(selected, 'EEEE, dd MMM yyyy')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
