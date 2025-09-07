
import React, { ReactNode, memo } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const CardComponent: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  const interactiveClasses = onClick ? 'cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-text-muted' : '';

  return (
    <div 
      className={`bg-surface rounded-lg p-4 sm:p-6 border border-border shadow ${interactiveClasses} ${className}`} 
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const Card = memo(CardComponent);