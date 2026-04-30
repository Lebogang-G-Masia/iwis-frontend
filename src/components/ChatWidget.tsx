"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: message };
    setHistory((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
      const baseUrl = apiBaseUrl.replace(/\/$/, ""); // Clean slashes
      
      console.log(`[CHAT DEBUG] Sending query to: ${baseUrl}/chat`);

      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: history,
        }),
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        console.error(`[CHAT ERROR] Server returned ${response.status}:`, errorDetail);
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      setHistory((prev) => [...prev, { role: "assistant", content: data.bot_response }]);
    } catch (error: any) {
      console.error("[CHAT FATAL ERROR]:", error);
      setHistory((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting to the IWIS brain. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-widget-container">
      <button 
        className={`chat-toggle-btn ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Chat"
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {isOpen && (
        <div className="chat-window">
          <header className="chat-header">
            <h3>IWIS Assistant</h3>
          </header>

          <div className="chat-messages">
            {history.length === 0 && (
              <div className="chat-welcome">
                <p>Hi! I'm your IWIS assistant. Ask me about water quality, nitrate levels, or if it's safe to swim.</p>
              </div>
            )}
            {history.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && <div className="chat-bubble assistant loading">Consulting telemetry...</div>}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !message.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        .chat-widget-container { position: fixed; bottom: 2rem; right: 2rem; z-index: 1000; font-family: system-ui, sans-serif; }
        .chat-toggle-btn { width: 3.5rem; height: 3.5rem; border-radius: 50%; background: #2b6cb0; color: white; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-size: 1.5rem; display: flex; align-items: center; justify-content: center; }
        .chat-window { position: absolute; bottom: 4.5rem; right: 0; width: 320px; height: 450px; background: white; border-radius: 16px; box-shadow: 0 12px 32px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; }
        .chat-header { background: #144d92; color: white; padding: 1rem; display: flex; justify-content: space-between; align-items: center; }
        .chat-header h3 { margin: 0; font-size: 0.9rem; font-weight: 800; }
        .chat-header span { font-size: 0.7rem; color: #48bb78; font-weight: 800; text-transform: uppercase; }
        .chat-messages { flex: 1; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; background: #f8fafc; }
        .chat-bubble { max-width: 85%; padding: 0.75rem; border-radius: 12px; font-size: 0.85rem; line-height: 1.5; }
        .chat-bubble.user { align-self: flex-end; background: #2b6cb0; color: white; border-bottom-right-radius: 2px; }
        .chat-bubble.assistant { align-self: flex-start; background: white; color: #1a202c; border: 1px solid #e2e8f0; border-bottom-left-radius: 2px; }
        .chat-input-area { padding: 1rem; border-top: 1px solid #edf2f7; display: flex; gap: 0.5rem; background: white; }
        .chat-input-area input { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem; font-size: 0.85rem; }
        .chat-input-area button { background: #1a202c; color: white; border: none; border-radius: 8px; padding: 0 1rem; font-weight: bold; cursor: pointer; }
        .chat-welcome { text-align: center; color: #718096; font-size: 0.8rem; padding: 1rem; }
      `}</style>
    </div>
  );
}
