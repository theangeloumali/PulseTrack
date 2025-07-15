'use client';

import React, {useState} from 'react';
import {Calendar, ChevronLeft, ChevronRight} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onRangeChange?: (startDate: string, endDate: string) => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRangeChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<'start' | 'end' | null>(null);

  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, {weekStartsOn: 0}); // Sunday
  const calendarEnd = endOfWeek(monthEnd, {weekStartsOn: 0});

  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(new Date(day));
    day = addDays(day, 1);
  }

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // If clicking on a date from a different month, navigate to that month first
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }

    if (!selecting) {
      // First click - start selecting
      onStartDateChange(dateStr);
      onEndDateChange('');
      setSelecting('end');
    } else if (selecting === 'start') {
      onStartDateChange(dateStr);
      setSelecting('end');
    } else if (selecting === 'end') {
      // If clicked date is before start date, make it the new start date
      if (startDateObj && date < startDateObj) {
        onStartDateChange(dateStr);
        onEndDateChange('');
        setSelecting('end');
      } else {
        // Set end date and complete the selection
        onEndDateChange(dateStr);
        setSelecting(null);
        // Don't auto-trigger onRangeChange, let user click Apply or use manual inputs
      }
    }
  };

  const isInRange = (date: Date) => {
    if (!startDateObj || !endDateObj) return false;
    try {
      return isWithinInterval(date, {start: startDateObj, end: endDateObj});
    } catch {
      return false;
    }
  };

  const isRangeStart = (date: Date) => {
    return startDateObj && isSameDay(date, startDateObj);
  };

  const isRangeEnd = (date: Date) => {
    return endDateObj && isSameDay(date, endDateObj);
  };

  const formatDateRange = () => {
    if (!startDate && !endDate) return 'Select date range';
    if (!endDate || endDate === '') return format(new Date(startDate), 'MMM dd, yyyy');
    if (startDate === endDate) return format(new Date(startDate), 'MMM dd, yyyy');
    return `${format(new Date(startDate), 'MMM dd')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`;
  };

  return (
    <div className="relative z-0">
      {/* Trigger Button */}
      <div className="space-y-2">
        <Label>Date Range</Label>
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-start text-left font-normal">
          <Calendar className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </div>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-[9999] p-4 min-w-[320px]">
          {/* Manual Date Inputs */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <Label htmlFor="manual-start" className="text-xs">
                Start Date
              </Label>
              <Input
                id="manual-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  onStartDateChange(e.target.value);
                  setSelecting(null);
                }}
                className="text-xs"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="manual-end" className="text-xs">
                End Date
              </Label>
              <Input
                id="manual-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  onEndDateChange(e.target.value);
                  setSelecting(null);
                  if (onRangeChange) {
                    onRangeChange(startDate, e.target.value);
                  }
                }}
                className="text-xs"
              />
            </div>
          </div>

          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-medium">{format(currentMonth, 'MMMM yyyy')}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-xs font-medium text-muted-foreground text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isStart = isRangeStart(day);
              const isEnd = isRangeEnd(day);
              const inRange = isInRange(day);

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day)}
                  className={`
                    p-2 text-xs rounded-md transition-colors cursor-pointer
                    ${!isCurrentMonth ? 'text-muted-foreground/50' : 'text-foreground'}
                    ${isStart || isEnd ? 'bg-blue-500 text-white dark:bg-blue-600' : ''}
                    ${inRange && !isStart && !isEnd ? 'bg-blue-100 dark:bg-blue-900/20' : ''}
                    ${!inRange && !isStart && !isEnd ? 'hover:bg-muted/50' : ''}
                  `}>
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelecting(null);
                setIsOpen(false);
              }}
              className="flex-1">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelecting(null);
                setIsOpen(false);
                if (onRangeChange && startDate && endDate && endDate !== '') {
                  onRangeChange(startDate, endDate);
                }
              }}
              className="flex-1"
              disabled={!startDate || !endDate || endDate === ''}>
              Apply Range
            </Button>
          </div>

          {/* Instructions */}
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {!selecting && !startDate && 'Click a date to start selecting range'}
            {!selecting && startDate && endDate && endDate !== '' && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                Range selected! Click "Apply Range" to confirm.
              </span>
            )}
            {selecting === 'end' && 'Click to select end date'}
            {selecting === 'start' && 'Click to select start date'}
          </div>
        </div>
      )}
    </div>
  );
}
