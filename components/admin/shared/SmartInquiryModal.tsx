import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../../shared/Modal';
import { Button } from '../../shared/Button';
import { Parcel, User } from '../../../types';
import { UserIcon } from '../../icons/UserIcon';
import { AlertTriangleIcon } from '../../icons/AlertTriangleIcon';
import { LogoIcon } from '../../shared/Logo';

interface SmartInquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    parcels: Parcel[];
    users: User[];
}

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

export const SmartInquiryModal: React.FC<SmartInquiryModalProps> = ({ isOpen, onClose, parcels, users }) => {
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: "Hello! I'm your smart assistant. Ask me anything about your operations data, like 'How many parcels were delivered today?' or 'Summarize the performance for Brand X.'" }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);
    
    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal is closed, but keep the initial greeting.
            setMessages([{ sender: 'ai', text: "Hello! I'm your smart assistant. Ask me anything about your operations data, like 'How many parcels were delivered today?' or 'Summarize the performance for Brand X.'" }]);
            setUserInput('');
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newUserMessage: Message = { sender: 'user', text: userInput };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);
        setError(null);

        try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            // Prepare a summarized version of the data for the prompt
            const summarizedParcels = parcels.map(p => ({
                status: p.status,
                brandName: p.brandName,
                codAmount: p.codAmount,
                deliveryCharge: p.deliveryCharge,
                createdAt: p.createdAt,
                pickupDriverId: p.pickupDriverId,
                deliveryDriverId: p.deliveryDriverId,
                failedAttemptReason: p.failedAttemptReason,
            }));

            const summarizedUsers = users.map(u => ({
                id: u.id,
                name: u.name,
                role: u.role,
            }));
            
            const dataContext = `
                Here is the current operational data in JSON format.
                Today's date is ${new Date().toDateString()}.

                Parcels: ${JSON.stringify(summarizedParcels)}
                Users (including Brands and Drivers): ${JSON.stringify(summarizedUsers)}
            `;

            const prompt = `
                You are a helpful AI assistant for a courier company called SEND.
                Your task is to answer questions based ONLY on the provided JSON data context.
                Do not make up information. If the answer isn't in the data, say so.
                Keep your answers concise and clear.
                
                ${dataContext}
                
                Question: ${userInput}
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const aiResponseText = response.text;
            
            if (aiResponseText) {
                const newAiMessage: Message = { sender: 'ai', text: aiResponseText };
                setMessages(prev => [...prev, newAiMessage]);
            } else {
                 setError("I received an empty response. Please try rephrasing your question.");
            }

        } catch (err: any) {
            console.error("Gemini API error:", err);
            if (err instanceof ReferenceError && err.message.includes('process is not defined')) {
                 setError("Could not connect to the AI service. The API key is not configured correctly in this environment.");
            } else {
                 setError("Sorry, I encountered an error while processing your request. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Smart Inquiry" size="2xl">
            <div className="flex flex-col h-[70vh]">
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-background rounded-t-lg space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center"><LogoIcon className="w-4 h-4" /></div>}
                            <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'ai' ? 'bg-surface border border-border' : 'bg-primary text-white'}`}>
                               <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                            {msg.sender === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center"><UserIcon className="w-5 h-5 text-content-secondary" /></div>}
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center"><LogoIcon className="w-4 h-4" /></div>
                            <div className="max-w-md p-3 rounded-lg bg-surface border border-border">
                               <div className="flex items-center gap-2 text-sm text-content-secondary">
                                   <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                                   <span>Thinking...</span>
                               </div>
                            </div>
                        </div>
                    )}
                     {error && (
                         <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><AlertTriangleIcon className="w-5 h-5" /></div>
                            <div className="max-w-md p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                               <p className="text-sm font-semibold">Error</p>
                               <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-border bg-surface rounded-b-lg">
                    <form onSubmit={handleSubmit}>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Ask about your data..."
                                disabled={isLoading}
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-60"
                            />
                            <Button type="submit" disabled={isLoading || !userInput.trim()}>
                                Send
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    );
};
