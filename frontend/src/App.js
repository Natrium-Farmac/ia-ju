import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // A URL do seu backend em Python. Note que agora usamos o nome do serviço 'backend'
  const API_URL = "http://localhost:8000";

  // Função para enviar uma mensagem para o backend
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error(`Erro de HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      const botMessage = { sender: 'bot', text: data.response };
      setMessages(prevMessages => [...prevMessages, botMessage]);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage = { sender: 'bot', text: 'Desculpe, ocorreu um erro ao se conectar com o servidor.' };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Garante que a tela role para a mensagem mais recente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Lida com o envio da mensagem ao pressionar Enter
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 font-sans p-4">
      <div className="flex flex-col w-full max-w-2xl h-[85vh] bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Cabeçalho do Chat */}
        <header className="p-4 bg-slate-700 text-white flex items-center gap-4 rounded-t-2xl">
          <div className="p-2 bg-slate-600 rounded-full">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Chatbot da Farmácia</h1>
            <p className="text-sm text-slate-400">Online</p>
          </div>
        </header>

        {/* Área de Mensagens */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-slate-500 italic mt-12">
              Envie uma mensagem para começar a conversa.
            </div>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start gap-3 p-4 rounded-3xl max-w-[80%] ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-700 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="flex-shrink-0">
                  {msg.sender === 'bot' ? (
                    <div className="p-2 bg-slate-600 rounded-full">
                      <Bot size={16} />
                    </div>
                  ) : (
                    <div className="p-2 bg-blue-700 rounded-full">
                      <User size={16} />
                    </div>
                  )}
                </div>
                <p className="text-sm self-center leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3 p-4 bg-slate-700 text-slate-200 rounded-3xl rounded-bl-none max-w-[80%]">
                <div className="flex-shrink-0 p-2 bg-slate-600 rounded-full">
                  <Bot size={16} />
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce-slow" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce-slow" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce-slow" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input para nova mensagem */}
        <footer className="p-4 bg-slate-700 flex gap-2 items-center rounded-b-2xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 p-3 bg-slate-600 text-slate-50 border border-slate-500 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            className={`p-3 rounded-full transition-colors ${
              isLoading ? 'bg-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isLoading}
          >
            <Send size={24} className="text-white" />
          </button>
        </footer>
      </div>
    </div>
  );
};

export default App;

