import React, { ReactNode } from 'react';
import { Card } from './Card';
import { XIcon } from '../icons/XIcon';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
    };

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <Card className={`w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>
                <div className="flex-shrink-0 flex justify-between items-center pb-1.5 mb-2 border-b border-border">
                    <h2 className="text-base font-bold text-content-primary">{title}</h2>
                    <button onClick={onClose} className="p-1 text-content-muted hover:text-content-primary rounded-full hover:bg-border transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="overflow-y-auto">
                    {children}
                </div>
            </Card>
        </div>
    );
};