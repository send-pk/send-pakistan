

import React from 'react';
import { Button } from './Button';

interface DateFilterProps {
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center bg-surface p-1 rounded-lg border border-border">
        <button onClick={() => setDateFilter('today')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${dateFilter === 'today' ? 'bg-background text-primary shadow-sm' : 'text-content-secondary hover:text-content-primary'}`}>Today</button>
        <button onClick={() => setDateFilter('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${dateFilter === 'all' ? 'bg-background text-primary shadow-sm' : 'text-content-secondary hover:text-content-primary'}`}>All Time</button>
        <button onClick={() => setDateFilter('custom')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${dateFilter === 'custom' ? 'bg-background text-primary shadow-sm' : 'text-content-secondary hover:text-content-primary'}`}>Custom</button>
      </div>
      {dateFilter === 'custom' && (
        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
          <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-surface border border-border rounded-md px-2 py-1 text-sm shadow-sm [color-scheme:light] dark:[color-scheme:dark]" aria-label="Start date"/>
          <span className="text-content-muted">to</span>
          <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-surface border border-border rounded-md px-2 py-1 text-sm shadow-sm [color-scheme:light] dark:[color-scheme:dark]" aria-label="End date"/>
        </div>
      )}
    </div>
  );
};