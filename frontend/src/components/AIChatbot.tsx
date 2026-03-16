import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, Minus, Maximize2 } from 'lucide-react';
import client from '../api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi there! I am your AI Learning Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    
    // Add user message
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await client.post('/api/ai/chat', {
        history: messages,
        message: userMsg
      });
      
      setMessages([...newMessages, { role: 'assistant', content: res.data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 z-50 flex items-center justify-center group"
      >
        <Bot size={28} className="group-hover:animate-pulse" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-80 md:w-96 bg-gray-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col transition-all ${isMinimized ? 'h-16' : 'h-[500px]'}`}>
      {/* Header */}
      <div className="bg-purple-900/50 border-b border-purple-500/30 p-4 flex justify-between items-center cursor-pointer select-none" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2 text-white font-semibold">
          <Bot size={20} className="text-purple-400" />
          <span>AI Assistant</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages area (hidden if minimized) */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-purple-600' : 'bg-gray-800 border border-purple-500/30'}`}>
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-purple-400" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-purple-400 animate-pulse" />
                </div>
                <div className="bg-gray-800 border border-gray-700 text-gray-400 rounded-2xl rounded-tl-none p-3 text-sm flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-gray-800 bg-gray-900">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="w-full bg-gray-800 border border-gray-700 rounded-full pl-4 pr-12 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-1 top-1 bottom-1 w-9 flex items-center justify-center bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-full transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
