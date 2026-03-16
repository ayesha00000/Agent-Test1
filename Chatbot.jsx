import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

//const API_URL = 'http://127.0.0.1:8000';
const API_URL = 'https://zakat-app-production-fdaa.up.railway.app';


function Chatbot({ messages, setMessages }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      // Send last 11 messages as context (10 history + current)
      const contextMessages = updatedMessages.slice(-11);
      
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: currentInput,
        conversation_history: contextMessages.slice(0, -1) // Exclude current message
      });

      const aiMessage = { role: 'assistant', content: response.data.answer };
      setMessages([...updatedMessages, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = { 
        role: 'assistant', 
        content: '❌ Sorry, I encountered an error. Please make sure the backend is running and try again.' 
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    const freshStart = [
      { 
        role: 'assistant', 
        content: 'As-salamu alaykum! I\'m your Zakat assistant. Ask me anything about Zakat, Nisab, or Islamic finance.' 
      }
    ];
    setMessages(freshStart);
  };

  const handleExampleClick = (question) => {
    setInput(question);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-green-700">🤖 AI Zakat Assistant</h2>
          <button 
            onClick={clearChat}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition duration-200 flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>Clear Chat</span>
          </button>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4 h-96 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                msg.role === 'user' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-left">
              <div className="inline-block bg-gray-200 px-4 py-2 rounded-lg">
                <p className="text-sm text-gray-600">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={sendMessage} className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask about Zakat, Nisab, or Islamic finance..." 
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" 
            disabled={loading} 
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()} 
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>

        {/* Example Questions */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Example questions:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'What is Zakat?', 
              'How is Nisab calculated?', 
              'Can I give Zakat to family?', 
              'What is the Zakat percentage?',
              'What assets are zakatable?',
              'Who can receive Zakat?'
            ].map((question, idx) => (
              <button 
                key={idx} 
                onClick={() => handleExampleClick(question)} 
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition duration-200"
                disabled={loading}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
          <p className="text-xs text-blue-700">
            💡 <strong>Conversation memory active!</strong> I remember the last 10 messages for context during this session.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;