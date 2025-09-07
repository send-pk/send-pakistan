
import React, { useEffect } from 'react';
import { SuccessCheckIcon } from '../icons/SuccessCheckIcon';

interface ScanSuccessFeedbackProps {
    show: boolean;
    onEnd: () => void;
}

const playBeep = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A nice, clear A5 note
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15); // Beep for 150ms
    } catch (e) {
        console.error("Could not play beep sound:", e);
    }
};

export const ScanSuccessFeedback: React.FC<ScanSuccessFeedbackProps> = ({ show, onEnd }) => {
    useEffect(() => {
        if (show) {
            playBeep();
            const timer = setTimeout(() => {
                onEnd();
            }, 1500); // Duration of the feedback
            return () => clearTimeout(timer);
        }
    }, [show, onEnd]);

    if (!show) {
        return null;
    }

    return (
        <>
            <style>
                {`
                    @keyframes fade-in-out {
                        0% { opacity: 0; transform: scale(0.8); }
                        20% { opacity: 1; transform: scale(1.1); }
                        80% { opacity: 1; transform: scale(1); }
                        100% { opacity: 0; transform: scale(0.9); }
                    }
                    .animate-fade-in-out {
                        animation: fade-in-out 1.5s ease-in-out forwards;
                    }
                `}
            </style>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                <div className="animate-fade-in-out bg-surface/90 backdrop-blur-sm rounded-full p-8 shadow-2xl">
                    <SuccessCheckIcon className="w-24 h-24 text-green-500" />
                </div>
            </div>
        </>
    );
};
