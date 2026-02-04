

import { useState, useRef } from 'react';
import './App.css';
import { createWebLLMHandler, createMessage } from './core/WebLLM-manager';

function App() {

  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handlerRef = useRef<any>(null);

  // Initialize WebLLM handler once
  const initializeHandler = async () => {
    if (!handlerRef.current) {
      handlerRef.current = createWebLLMHandler();
      try {
        await handlerRef.current.initialize({ modelId: handlerRef.current.getAvailableModels()[0] });
      } catch (err: any) {
        setError(err?.message || 'Failed to initialize AI model');
      }
    }
  };

  // Send message and get AI response
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setError(null);
    setLoading(true);
    await initializeHandler();
    const userMsg: { role: 'user' | 'assistant'; content: string } = { role: 'user', content: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput('');
    try {
      const aiResult = await handlerRef.current.generate([
        ...messages.map((m) => createMessage(m.role, m.content)),
        createMessage('user', input)
      ]);
      setMessages((msgs) => [...msgs, { role: 'assistant', content: aiResult.content }]);
    } catch (err: any) {
      setError(err?.message || 'AI response failed');
    }
    setLoading(false);
  };

  return (
    <div className="chat-container" style={{ maxWidth: 400, margin: '40px auto', border: '1px solid #ccc', borderRadius: 8, padding: 16, background: '#fff' }}>
      <h2 style={{ textAlign: 'center' }}>Local AI Chat</h2>
      <div className="chat-messages" style={{ minHeight: 200, maxHeight: 300, overflowY: 'auto', marginBottom: 16, background: '#f9f9f9', padding: 8, borderRadius: 4 }}>
        {messages.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center' }}>No messages yet.</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ margin: '8px 0', padding: '6px 10px', background: msg.role === 'user' ? '#e6f7ff' : '#fffbe6', borderRadius: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
            </div>
          ))
        )}
      </div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={loading ? 'Waiting for AI...' : 'Type a message...'}
          disabled={loading}
          style={{ flex: 1, padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#1677ff', color: '#fff' }}>Send</button>
      </form>
      <div style={{ marginTop: 12, fontSize: 12, color: '#888', textAlign: 'center' }}>
        Powered by WebLLM (local AI, no cloud)
      </div>
    </div>
  );
}

export default App
