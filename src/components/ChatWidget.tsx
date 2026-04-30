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
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: history, // Backend expects history for context
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      setHistory((prev) => [...prev, { role: "assistant", content: data.bot_response }]);
    } catch (error) {
      console.error("Chat error:", error);
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
      {/* Toggle Button */}
      <button 
        className={`chat-toggle-btn ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Chat"
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <header className="chat-header">
            <h3>IWIS Assistant</h3>
            <span>Online</span>
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
            {isLoading && <div className="chat-bubble assistant loading">Typing...</div>}
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
        .chat-widget-container {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 1000;
          font-family: var(--font-geist-sans), system-ui, sans-serif;
        }

        .chat-toggle-btn {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          background: #2b6cb0;
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, background 0.2s;
        }

        .chat-toggle-btn:hover {
          transform: scale(1.05);
          background: #2c5282;
        }

        .chat-toggle-btn.is-open {
          background: #4a5568;
        }

        .chat-window {
          position: absolute;
          bottom: 4.5rem;
          right: 0;
          width: 350px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .chat-header {
          background: #2b6cb0;
          color: white;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 1rem;
        }

        .chat-header span {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .chat-messages {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: #f7fafc;
        }

        .chat-welcome {
          text-align: center;
          color: #718096;
          font-size: 0.875rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .chat-bubble {
          max-width: 80%;
          padding: 0.75rem;
          border-radius: 12px;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .chat-bubble.user {
          align-self: flex-end;
          background: #2b6cb0;
          color: white;
          border-bottom-right-radius: 2px;
        }

        .chat-bubble.assistant {
          align-self: flex-start;
          background: white;
          color: #2d3748;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 2px;
        }

        .chat-bubble.loading {
          opacity: 0.7;
          font-style: italic;
        }

        .chat-input-area {
          padding: 1rem;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 0.5rem;
          background: white;
        }

        .chat-input-area input {
          flex: 1;
          border: 1px solid #cbd5e0;
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }

        .chat-input-area input:focus {
          outline: none;
          border-color: #2b6cb0;
        }

        .chat-input-area button {
          background: #2b6cb0;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: bold;
          cursor: pointer;
        }

        .chat-input-area button:disabled {
          background: #cbd5e0;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
