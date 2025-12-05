import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Loader2, Sparkles, Key } from 'lucide-react';
import { getEmployees } from '../services/mockDb';
import { cn } from '../utils';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your AI HR Assistant. I have access to the employee database. You can ask me about visa expirations, document status, or general HR queries.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null); // null = checking
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      } else {
        setHasApiKey(false);
      }
    } catch (e) {
      console.error("Error checking API key:", e);
      setHasApiKey(false);
    }
  };

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        console.error("Error selecting API key:", e);
      }
    } else {
        alert("API Key selection is not supported in this environment.");
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // 1. Get current data context
      const employees = getEmployees();
      const dataContext = employees.map(e => (
        `- Name: ${e.fullName} | ID: ${e.employeeId} | Passport: ${e.passportNumber || 'N/A'} | Type: ${e.visaType} | Visa Exp: ${e.visaExpiryDate} | Health Exp: ${e.healthCardExpiryDate} | Labour Exp: ${e.labourCardExpiryDate} | Status: ${e.status}`
      )).join('\n');

      const systemInstruction = `You are an expert HR Assistant for "VisaFlow", a Visa Management System.
      
      You have access to the current live employee database:
      ${dataContext}

      Current Date: ${new Date().toISOString().split('T')[0]}

      Guidelines:
      1. Answer questions based strictly on the provided employee data.
      2. If asked about status, refer to the "Status" field (VALID, WARNING, CRITICAL, EXPIRED).
      3. If asked for a summary (e.g., "who is expiring soon?"), analyze the dates and list the names clearly.
      4. Be concise, professional, and helpful.
      5. If the answer cannot be found in the data, state that clearly.
      6. Do not make up information.
      `;

      // 2. Call Gemini API - create instance just before call to ensure fresh key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          // Pass history to maintain conversation context
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: systemInstruction,
        }
      });

      const responseText = response.text || "I couldn't generate a response. Please try again.";
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);

    } catch (error: any) {
      console.error("AI Error:", error);
      
      if (error.message?.includes("Requested entity was not found") || error.toString().includes("404")) {
          setMessages(prev => [...prev, { role: 'model', text: "It looks like the API key is invalid or expired. Please select a key again." }]);
          setHasApiKey(false);
      } else {
          setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error connecting to the AI service. Please check your connection." }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="bg-indigo-50 p-4 rounded-full mb-4">
          <Key className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">API Key Required</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          To use the AI HR Assistant, you need to select a Google Gemini API key. This feature is powered by the Gemini 2.5 Flash model.
        </p>
        <button
          onClick={handleSelectKey}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Key className="h-4 w-4" />
          Select API Key
        </button>
        <p className="text-xs text-gray-400 mt-4">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Billing information
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-600" />
          AI HR Assistant
        </h1>
        <p className="text-gray-500 mt-1">Ask questions about your employees' visa and document status.</p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex gap-3 max-w-[80%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 border border-gray-200"
              )}>
                {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </div>
              
              <div className={cn(
                "p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm",
                msg.role === 'user' 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-[80%]">
               <div className="w-8 h-8 rounded-full bg-white text-indigo-600 border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="h-5 w-5" />
               </div>
               <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Thinking...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <form onSubmit={handleSend} className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about visas, expiries, or employee details..."
              className="flex-1 border-gray-200 rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="text-xs text-center text-gray-400 mt-2">
            AI can make mistakes. Verify critical data in the Employee List.
          </p>
        </div>
      </div>
    </div>
  );
};
