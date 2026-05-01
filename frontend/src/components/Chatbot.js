import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './Chatbot.css';

import API from '../config/api';

function Chatbot({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      type: 'bot', 
      text: user?.role === 'admin' 
        ? '👋 Hi Admin! I can help you manage candidates, review applications, and optimize your hiring process!'
        : '👋 Hi! I\'m your ResuMatch assistant. Ask me about resume tips, scoring, or finding jobs!' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/chatbot`, { 
        message: userMessage,
        userRole: user?.role 
      });
      setMessages(prev => [...prev, { type: 'bot', text: response.data.response }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Sorry, I encountered an error. Please try again!' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestionsUser = [
    'How can I improve my resume?',
    'How to boost my score?',
    'What jobs are available?',
    'How does scoring work?'
  ];

  const quickQuestionsAdmin = [
    'How to review candidates?',
    'How does scoring work?',
    'How to upload resumes in bulk?',
    'What reports can I download?'
  ];

  const quickQuestions = user?.role === 'admin' ? quickQuestionsAdmin : quickQuestionsUser;

  const handleQuickQuestion = (question) => {
    setInput(question);
    setTimeout(() => sendMessage(), 100);
  };

  return (
    <>
      {/* Chatbot Button */}
      <button 
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chatbot"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <h3>ResuMatch {user?.role === 'admin' ? 'Admin' : ''} Assistant</h3>
                <p>Online • Always here to help</p>
              </div>
            </div>
            <button 
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                {msg.type === 'bot' && <div className="message-avatar">🤖</div>}
                <div className="message-bubble">
                  {msg.text.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < msg.text.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
                {msg.type === 'user' && <div className="message-avatar">{user?.role === 'admin' ? '👔' : '👤'}</div>}
              </div>
            ))}
            {loading && (
              <div className="message bot">
                <div className="message-avatar">🤖</div>
                <div className="message-bubble typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div className="quick-questions">
              <p>Quick questions:</p>
              {quickQuestions.map((q, i) => (
                <button 
                  key={i}
                  className="quick-question-btn"
                  onClick={() => handleQuickQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <button 
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="send-btn"
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;