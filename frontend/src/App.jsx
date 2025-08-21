import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, UploadCloud, Monitor } from 'lucide-react';
import './index.css';

// Estilos de animação para o carregamento do chatbot
const customStyles = `
@keyframes bounce-slow {
  0%, 100% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}
.animate-bounce-slow {
  animation: bounce-slow 1s infinite;
}
`;

const App = () => {
  // Estados para gerenciar as mensagens, o input do usuário e o status de carregamento
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // NOVO: Estado para armazenar o arquivo selecionado
  const [selectedFile, setSelectedFile] = useState(null);
  
  const messagesEndRef = useRef(null);
  // NOVO: Referência para o input de arquivo oculto
  const fileInputRef = useRef(null);

  // A URL do seu backend. O Nginx atua como proxy reverso, então o frontend
  // faz a requisição para a rota '/api' que é redirecionada para o backend.
  const API_BASE_URL = "/api";

  // Função assíncrona para enviar uma mensagem para o backend
  const sendMessage = async () => {
    // Evita enviar mensagens vazias
    if (!input.trim()) return;

    // Adiciona a mensagem do usuário à lista de mensagens
    const userMessage = { sender: 'user', text: input };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Faz a requisição POST para o endpoint '/api/chat'
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // O corpo da requisição é um objeto JSON com a mensagem do usuário
        body: JSON.stringify({ user_message: userMessage.text }),
      });

      // Se a resposta da API não for bem-sucedida, lança um erro
      if (!response.ok) {
        throw new Error(`Erro de HTTP: ${response.status}`);
      }

      // Converte a resposta para JSON e adiciona a mensagem do bot à lista
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

  // Lida com o envio da mensagem ao pressionar a tecla 'Enter'
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };

  // NOVO: Função para abrir o seletor de arquivos
  const handleFileUploadClick = () => {
    fileInputRef.current.click();
  };

  // NOVO: Função para lidar com a seleção do arquivo
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      console.log('Arquivo selecionado:', file.name);
      // Aqui você adicionaria a lógica para fazer o upload do arquivo para o backend
      // Por exemplo: chamar uma função de upload
    }
  };

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex justify-center min-h-screen bg-slate-900 font-sans p-4 gap-6">
        
        {/* Coluna principal do Chat */}
        <div className="flex flex-col w-1/2 max-w-2xl h-[85vh] bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          
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

          {/* Footer com o input para a nova mensagem */}
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

        {/* Coluna para Machine Learning (seções de upload e monitoramento) */}
        <div className="flex flex-col w-1/2 h-[85vh] bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <header className="p-4 bg-slate-700 text-white flex items-center gap-4 rounded-t-2xl">
            <div className="p-2 bg-slate-600 rounded-full">
              <UploadCloud size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Ferramentas de Machine Learning</h1>
              <p className="text-sm text-slate-400">Upload, Monitoramento e mais...</p>
            </div>
          </header>

          <main className="flex-1 p-6 text-white overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Upload de Arquivos</h2>
            {/* NOVO: Input de arquivo oculto */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <div className="p-4 border-2 border-dashed border-slate-600 rounded-lg text-center">
              <p className="text-slate-400">Arraste e solte arquivos aqui ou clique para selecionar.</p>
              {/* NOVO: Exibe o nome do arquivo selecionado ou um texto padrão */}
              <p className="mt-2 text-sm text-blue-300">
                {selectedFile ? `Arquivo selecionado: ${selectedFile.name}` : 'Nenhum arquivo selecionado.'}
              </p>
              <button 
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full"
                onClick={handleFileUploadClick}
              >
                Selecionar Arquivo
              </button>
            </div>

            <h2 className="text-lg font-bold my-4">Monitoramento de Modelos</h2>
            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={20} className="text-blue-400" />
                <p>Status do Modelo: <span className="text-green-400">Ativo</span></p>
              </div>
              <p className="text-sm text-slate-400">Última atualização: 12/08/2025</p>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default App;