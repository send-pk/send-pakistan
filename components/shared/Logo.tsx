
import React from 'react';
import { useTheme } from '../../App';

export const Logo: React.FC<{ className?: string, textClassName?: string, iconClassName?: string }> = ({ className, textClassName, iconClassName }) => {
    const { theme } = useTheme();

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`w-6 h-6 text-primary ${iconClassName}`}
                fill="currentColor"
            >
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
            <span className={`text-3xl font-bold text-content-primary ${textClassName}`}>
                send
                <span className="text-primary">.</span>
            </span>
        </div>
    );
};

export const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={`w-6 h-6 text-primary ${className}`}
        fill="currentColor"
    >
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);