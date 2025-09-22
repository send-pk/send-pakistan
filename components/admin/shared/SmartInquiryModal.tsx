import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../../shared/Modal';
import { Button } from '../../shared/Button';
import { SparklesIcon } from '../../icons/SparklesIcon';
import { UserIcon } from '../../icons/UserIcon';
import { User, Parcel } from '../../../types';

// Dynamically import to avoid breaking the app if the library fails to load
let GoogleGenAI: any = null;
const importGenAI = async () => {
  if (!GoogleGenAI) {
    try {
      const module = await import('@google/genai');
      GoogleGenAI = module.GoogleGenAI;
    } catch (e) {
      console.error("Failed to load @google/genai module", e);
    }
  }
};

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface SmartInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcels: Parcel[];
  users: User[];
}

export const SmartInquiryModal: React.FC<SmartInquiryModalProps> = ({ isOpen, onClose, parcels, users }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      importGenAI();
      setMessages([
        { sender: 'ai', text: "Hello! I'm your operations assistant. Ask me anything about your current parcels and users. For example: 'How many parcels were delivered today?' or 'Which driver has the most pending pickups?'" }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const summarizeData = useCallback(() => {
    // To keep the context small, we only summarize key fields.
    const parcelSummary = parcels.map(p => ({
        status: p.status,
        codAmount: p.codAmount,
        brandName: p.brandName,
        pickupDriverId: p.pickupDriverId,
        deliveryDriverId: p.deliveryDriverId,
        createdAt: p.createdAt.substring(0, 10), // just the date
        isCodReconciled: p.isCodReconciled,
    }));
    const userSummary = users.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        status: u.status,
        onDuty: u.onDuty,
    }));

    return `Here is a JSON summary of the current operational data. Today's date is ${new Date().toISOString().substring(0, 10)}.\n\nParcels:\n${JSON.stringify(parcelSummary)}\n\nUsers:\n${JSON.stringify(userSummary)}`;
  }, [parcels, users]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (!GoogleGenAI) {
      await importGenAI();
    }
    
    if (!process.env.API_KEY) {
        setMessages(prev => [...prev, { sender: 'ai', text: "Error: AI service is not configured. The API key is missing. Please contact your administrator." }]);
        setIsLoading(false);
        return;
    }
    
    if (!GoogleGenAI) {
      setMessages(prev => [...prev, { sender: 'ai', text: "Error: Could not load the AI library. Please check the console for errors." }]);
      setIsLoading(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const dataSummary = summarizeData();
      
      const systemInstruction = "You are a helpful and intelligent courier operations analyst for a company called 'SEND'. Your role is to answer questions based *only* on the provided JSON data about parcels and users. Be concise and clear in your answers. If the data doesn't contain the answer, say so. Do not invent information. Today's date is " + new Date().toISOString().substring(0, 10) + ".";

      const prompt = `${dataSummary}\n\nQuestion: ${userMessage.text}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      const aiMessage: Message = { sender: 'ai', text: response.text };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Gemini API error:", error);
      const errorMessage: Message = { sender: 'ai', text: "Sorry, I encountered an error while processing your request. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const ChatBubble = ({ message }: { message: Message }) => {
    const isUser = message.sender === 'user';
    return (
      <div className={`flex items-start gap-3 my-3 ${isUser ? 'justify-end' : ''}`}>
        {!isUser && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><SparklesIcon className="w-5 h-5" /></div>}
        <div className={`max-w-md p-3 rounded-lg ${isUser ? 'bg-primary text-white' : 'bg-surface border border-border'}`}>
            <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{message.text}</p>
        </div>
        {isUser && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-content-secondary"><UserIcon className="w-5 h-5" /></div>}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Smart Inquiry" size="2xl">
      <div className="flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-3 bg-background rounded-t-lg">
          {messages.map((msg, index) => <ChatBubble key={index} message={msg} />)}
          {isLoading && (
            <div className="flex items-start gap-3 my-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><SparklesIcon className="w-5 h-5" /></div>
              <div className="max-w-md p-3 rounded-lg bg-surface border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 border-t border-border bg-surface rounded-b-lg">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1 w-full bg-background border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
              {isLoading ? 'Thinking...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
