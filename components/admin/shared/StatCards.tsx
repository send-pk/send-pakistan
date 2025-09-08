import React from 'react';
import { Card } from '../../shared/Card';

export const StatCard = ({ title, value, icon: Icon, onClick, colorClass = 'text-primary', isActive = false }: {title: string, value: string | number, icon: React.FC<React.SVGProps<SVGSVGElement>>, onClick: () => void, colorClass?: string, isActive?: boolean}) => (
    <div
      onClick={onClick}
      className={`group rounded-xl p-2.5 shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-content-muted border flex flex-col justify-between ${isActive ? 'ring-2 ring-primary bg-primary/20 border-primary' : 'bg-surface/60 dark:bg-surface/80 backdrop-blur-sm border-transparent'}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-content-primary">{value}</div>
        <div className={`flex-shrink-0 p-1.5 rounded-lg bg-black/5 dark:bg-black/20 ${colorClass} transition-transform duration-300 group-hover:scale-105`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-sm text-content-secondary mt-1">{title}</p>
    </div>
);
  
export const FinanceStatCard = ({ title, value, icon: Icon, colorClass = 'text-primary', bgColorClass = 'bg-primary/10' }: { title: string, value: string | number, icon: React.FC<React.SVGProps<SVGSVGElement>>, colorClass?: string, bgColorClass?: string }) => (
    <Card className="p-3 text-center h-full">
        <div className={`mx-auto w-10 h-10 flex items-center justify-center rounded-full ${bgColorClass} mb-2`}>
            <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <p className="text-sm text-content-secondary leading-tight">{title}</p>
        <p className="text-lg font-bold text-content-primary mt-1 break-words">
            {typeof value === 'number' ? `PKR ${value.toLocaleString()}` : value}
        </p>
    </Card>
);