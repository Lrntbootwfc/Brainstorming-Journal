import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  MessageCircle, 
  BookOpen, 
  Bot, 
  User as UserIcon, 
  Clock, 
  Paperclip,
  CheckCheck
} from 'lucide-react';
import Markdown from 'react-markdown';
import { JournalSession, PaperThemePreference } from '../types';
import { getThemeConfig } from '../utils/theme';

interface WhatsAppChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: JournalSession[];
  theme?: PaperThemePreference;
}

interface JournalChatMessage {
  id: string;
  sender: 'user' | 'journal_ai';
  text: string;
  timestamp: string;
}

export const WhatsAppChatModal: React.FC<WhatsAppChatModalProps> = ({
  isOpen,
  onClose,
  sessions,
  theme,
}) => {
  const [messages, setMessages] = useState<JournalChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'journal_ai',
      text: "👋 Hello! I'm your Brainstorming & Journal Companion. Ask me anything about your recorded memories, ideas, or request synthesis of your previous entries.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const themeConfig = getThemeConfig(theme);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const quickPrompts = [
    "What are my recent brainstorms?",
    "Summarize my key insights",
    "List all my open action items",
    "What mood have I had most often?"
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: JournalChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare journal context summary for AI
    const journalContext = sessions.slice(0, 10).map((s) => {
      const msgs = s.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
      return `[Entry: "${s.title}" (${s.category || 'General'}) on ${s.createdAt}]\nSummary: ${s.summary || 'None'}\nInsights: ${(s.keyInsights || []).join(', ')}\nContent:\n${msgs}`;
    }).join('\n\n---\n\n');

    try {
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              id: m.id,
              role: m.sender === 'user' ? 'user' : 'model',
              content: m.text,
              timestamp: new Date().toISOString(),
            })),
            {
              id: userMsg.id,
              role: 'user',
              content: textToSend,
              timestamp: new Date().toISOString(),
            },
          ],
          promptType: 'Journal Assistant Companion',
          context: `You are the user's interactive notebook journal companion. The user has ${sessions.length} recorded entries. Here is their journal content context:\n${journalContext}`,
        }),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 80)}`);
      }

      if (!response.ok && !data.reply) {
        throw new Error(data.error || 'Failed to get companion response');
      }

      const aiMsg: JournalChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'journal_ai',
        text: data.reply || "I've reviewed your journal entries.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Companion chat error:', err);
      const errorMsg: JournalChatMessage = {
        id: 'err-' + Date.now(),
        sender: 'journal_ai',
        text: "I couldn't retrieve that reflection right now. Please check your network connection and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div 
        className="paper-card w-full max-w-xl h-[85vh] max-h-[720px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: themeConfig.paperCardBg,
          borderColor: themeConfig.border,
          color: themeConfig.inkColor
        }}
      >
        {/* Header */}
        <div 
          className="px-5 py-3.5 flex items-center justify-between border-b"
          style={{
            backgroundColor: themeConfig.primary,
            color: '#ffffff'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center font-bold"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
              >
                <Bot className="h-5 w-5" />
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-white flex items-center gap-1.5">
                Chat with Your Brainstorm Journal
              </h3>
              <p className="text-[11px] opacity-80 flex items-center gap-1 text-white">
                <span>AI Companion</span>
                <span>•</span>
                <span>{sessions.length} entries indexed</span>
              </p>
            </div>
          </div>

          <button
            id="close-whatsapp-chat-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick prompt pills */}
        <div 
          className="px-4 py-2 border-b flex items-center gap-2 overflow-x-auto text-xs scrollbar-none"
          style={{
            backgroundColor: themeConfig.paperBg,
            borderColor: themeConfig.border
          }}
        >
          <span className="text-[10px] uppercase font-bold opacity-60 tracking-wider shrink-0">Ask:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="shrink-0 px-3 py-1 rounded-full border transition-all text-xs shadow-2xs hover:opacity-90"
              style={{
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border,
                color: themeConfig.inkColor
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat message stream */}
        <div 
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5"
          style={{
            backgroundColor: themeConfig.paperBg,
            color: themeConfig.inkColor
          }}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 shadow-xs text-sm leading-relaxed ${
                    isUser
                      ? 'text-white rounded-tr-xs'
                      : 'border rounded-tl-xs'
                  }`}
                  style={isUser ? {
                    backgroundColor: themeConfig.userBubbleBg,
                    color: themeConfig.userBubbleText
                  } : {
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.inkColor
                  }}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div className="markdown-body space-y-2 prose prose-sm">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                    <span>{msg.timestamp}</span>
                    {isUser && <CheckCheck className="h-3 w-3 text-emerald-300" />}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start">
              <div 
                className="border rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs flex items-center gap-2 text-xs"
                style={{
                  backgroundColor: themeConfig.paperCardBg,
                  borderColor: themeConfig.border
                }}
              >
                <Sparkles className="h-3.5 w-3.5 animate-spin" style={{ color: themeConfig.primary }} />
                <span className="opacity-70">Journal assistant is reading your reflections...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Footer Input */}
        <div 
          className="p-3 border-t"
          style={{
            backgroundColor: themeConfig.paperCardBg,
            borderColor: themeConfig.border
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              id="whatsapp-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about memories, themes, brainstorms..."
              className="flex-1 rounded-full border px-4 py-2.5 text-sm focus:outline-none transition-all shadow-inner"
              style={{
                backgroundColor: themeConfig.paperBg,
                borderColor: themeConfig.border,
                color: themeConfig.inkColor
              }}
            />
            <button
              id="send-whatsapp-chat-btn"
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 rounded-full text-white flex items-center justify-center shadow-xs transition-all disabled:opacity-40 hover:opacity-90"
              style={{ backgroundColor: themeConfig.primary }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
