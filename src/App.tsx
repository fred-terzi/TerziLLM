
import { useState } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setMessages([...messages, input]);
      setInput('');
    }
  };

  return (
    <div className="chat-container" style={{ maxWidth: 400, margin: '40px auto', border: '1px solid #ccc', borderRadius: 8, padding: 16, background: '#fff' }}>
      <h2 style={{ textAlign: 'center' }}>Basic Chat</h2>
      <div className="chat-messages" style={{ minHeight: 200, maxHeight: 300, overflowY: 'auto', marginBottom: 16, background: '#f9f9f9', padding: 8, borderRadius: 4 }}>
        {messages.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center' }}>No messages yet.</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ margin: '8px 0', padding: '6px 10px', background: '#e6f7ff', borderRadius: 4 }}>{msg}</div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#1677ff', color: '#fff' }}>Send</button>
      </form>
    </div>
  );
}

export default App
