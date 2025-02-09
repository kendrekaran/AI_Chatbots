import React, { useState, useRef, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import { 
  Send, 
  Loader2, 
  AlertTriangle, 
  Bot, 
  Sparkles, 
  Settings, 
  Moon,
  Sun,
  Trash2,
  Sliders,
  RefreshCw,
  Download,
  Upload,
  Copy,
  Check,
  StopCircle,
  ImageIcon,
  CodeIcon,
  MessageSquare,
  Mic
} from 'lucide-react';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY ?? ""

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  type?: 'text' | 'code' | 'image';
  language?: string;
}

interface ErrorState {
  isError: boolean;
  message: string;
}

interface Settings {
  temperature: number;
  maxTokens: number;
  model: string;
  typingSpeed: number;
  autoScroll: boolean;
  codeHighlighting: boolean;
  speechRecognition: boolean;
  systemPrompt: string;
  darkMode?: boolean;
}

interface Model {
  id: string;
  name: string;
  description: string;
  contextWindow?: number;
  provider?: string;
}

const AVAILABLE_MODELS: Model[] = [
  { 
    id: "google/gemini-2.0-flash-001", 
    name: "Gemini Flash 2.0",
    description: "Most capable Google model",
    provider: "Google",
    contextWindow: 20000
  },
  { 
    id: "deepseek/deepseek-r1-distill-llama-8b", 
    name: "DeepSeek: R1 8B",
    description: "Most capable Deepseek model",
    provider: "DeepSeek",
    contextWindow: 20000
  },
  { 
    id: "anthropic/claude-3.5-haiku-20241022:beta", 
    name: "Claude 3.5 Haiku",
    description: "Most capable Claude model",
    provider: "Anthropic",
    contextWindow: 20000
  },
  { 
    id: "google/gemini-pro", 
    name: "Gemini Pro",
    description: "Google's advanced model",
    provider: "Google",
    contextWindow: 32000
  },
];

const highlightCode = (code: string, language: string) => {
  try {
    return Prism.highlight(code, Prism.languages[language], language);
  } catch (e) {
    return code;
  }
};

const TypeWriter: React.FC<{ text: string; onComplete: () => void; speed?: number }> = ({ 
  text, 
  onComplete,
  speed = 20 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [currentIndex, text, onComplete, speed]);

  return <div className="whitespace-pre-wrap">{displayText}</div>;
};

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={copyCode}
        className="absolute right-2 top-2 p-2 rounded-lg bg-black-800 text-white hover:bg-gray-700"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre className="p-4 bg-gray-800 rounded-lg overflow-x-auto">
        <code className={`language-${language}`} 
              dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }} />
      </pre>
    </div>
  );
};

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatMessages');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState>({ isError: false, message: '' });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light') || 
        (window.matchMedia('(prefers-color-scheme: light)').matches ? 'dark' : 'light');
    }
    return 'light';
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatSettings');
      return saved ? JSON.parse(saved) : {
        temperature: 0.7,
        maxTokens: 2000,
        model: "anthropic/claude-3-sonnet-20240229",
        typingSpeed: 20
      };
    }
    return {
      temperature: 0.7,
      maxTokens: 2000,
      model: "anthropic/claude-3-sonnet-20240229",
      typingSpeed: 20
    };
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [copied, setCopied] = useState(false);
  const [messageFilter, setMessageFilter] = useState<'all' | 'code' | 'text'>('all');

  useEffect(() => {
    if (settings.speechRecognition && !mediaRecorder) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = async (e) => {
            const audioBlob = new Blob([e.data], { type: 'audio/wav' });
           
          };
          setMediaRecorder(recorder);
        })
        .catch(console.error);
    }
  }, [settings.speechRecognition]);

  const toggleRecording = () => {
    if (recording) {
      mediaRecorder?.stop();
    } else {
      mediaRecorder?.start();
    }
    setRecording(!recording);
  };

  const exportChat = () => {
    const chatData = {
      messages,
      settings,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setMessages(data.messages);
          setSettings(data.settings);
        } catch (error) {
          handleError('Invalid chat history file');
        }
      };
      reader.readAsText(file);
    }
  };

  const copyMessage = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredMessages = messages.filter(message => {
    if (messageFilter === 'all') return true;
    if (messageFilter === 'code') return message.type === 'code';
    return message.type === 'text';
  });

  // Auto-scroll effect
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    // Add a small delay to ensure content is rendered
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Persist messages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Persist theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Persist settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatSettings', JSON.stringify(settings));
    }
  }, [settings]);

  const generateMessageId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleError = (errorMessage: string) => {
    setError({ isError: true, message: errorMessage });
    setTimeout(() => setError({ isError: false, message: '' }), 5000);
  };

  const clearMessages = () => {
    if (window.confirm('Are you sure you want to clear all messages? This cannot be undone.')) {
      setMessages([]);
    }
  };

  const regenerateLastResponse = async () => {
    if (messages.length < 2 || isLoading) return;
    
    const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMessageIndex === -1) return;
    
    const messagesCopy = [...messages];
    messagesCopy.splice(messages.length - lastUserMessageIndex - 1);
    
    setMessages(messagesCopy);
    const lastUserMessage = messages[messages.length - lastUserMessageIndex - 1];
    await sendMessage(null, lastUserMessage.content);
  };

  const sendMessage = async (e: React.FormEvent | null, overrideContent?: string) => {
    if (e) e.preventDefault();
    const messageContent = overrideContent || input;
    if ((!messageContent.trim() && !overrideContent) || isLoading) return;

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: messageContent.trim(),
      timestamp: new Date()
    };

    if (!overrideContent) {
      setMessages(prev => [...prev, userMessage]);
      setInput('');
    }
    setIsLoading(true);
    setError({ isError: false, message: '' });

    try {
      if (!OPENROUTER_API_KEY) {
        throw new Error('API key not configured');
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "AI Chat Assistant",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: settings.model,
          messages: messages.concat(userMessage).map(({ role, content }) => ({ role, content })),
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get response');
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0]?.message) {
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.choices[0].message.content,
          timestamp: new Date(),
          isTyping: true
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error:', error);
      handleError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(null);
    }
  };

  const handleTypingComplete = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, isTyping: false } : msg
      )
    );
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Move utility functions inside component
  const detectCodeLanguage = (content: string): string => {
    const patterns = {
      python: /\b(def|import|class|print)\b/,
      javascript: /\b(function|const|let|var|console)\b/,
      html: /<[^>]*>/,
      css: /\{[^}]*\}/,
      sql: /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/i
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) return lang;
    }
    
    return 'text';
  };

  const processChatResponse = (content: string): { type: 'text' | 'code', content: string, language?: string } => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);

    if (match) {
      return {
        type: 'code',
        content: match[2].trim(),
        language: match[1] || detectCodeLanguage(match[2])
      };
    }

    return {
      type: 'text',
      content
    };
  };

  // Fix keyboard shortcuts handler
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'enter':
            e.preventDefault();
            if (input.trim()) sendMessage(null);
            break;
          case 'l':
            e.preventDefault();
            clearMessages();
            break;
          case 's':
            e.preventDefault();
            exportChat();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [input, clearMessages, exportChat, sendMessage]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'light' 
        ? 'bg-gradient-to-b from-indigo-100 to-white' 
        : 'bg-gradient-to-b from-gray-900 to-gray-800'
    }`}>
      <div className="container mx-auto p-4">
        <div className={`max-w-4xl mx-auto rounded-xl shadow-xl overflow-hidden ${
          theme === 'dark' ? 'bg-black' : 'bg-white'
        }`}>
          {/* Header section with enhanced controls */}
          <div className={`p-4 ${
            theme === 'light'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
              : 'bg-gradient-to-r from-gray-800 to-gray-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-white" />
                <h1 className="text-xl font-bold text-white">Enhanced AI Chat</h1>
              </div>
              <div className="flex items-center space-x-2">
                {/* Message type filter */}
                <div className="flex rounded-lg overflow-hidden mr-2">
                  <button
                    onClick={() => setMessageFilter('all')}
                    className={`p-2 ${messageFilter === 'all' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  >
                    <MessageSquare className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => setMessageFilter('code')}
                    className={`p-2 ${messageFilter === 'code' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  >
                    <CodeIcon className="w-4 h-4 text-white" />
                  </button>
                </div>
                
                {/* Export/Import buttons */}
                <button
                  onClick={exportChat}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                  title="Export chat"
                >
                  <Download className="w-5 h-5" />
                </button>
                <label className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer">
                  <Upload className="w-5 h-5" />
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={importChat}
                  />
                </label>
                
                {/* Previous controls */}
                <button
                  onClick={clearMessages}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <button
                  onClick={regenerateLastResponse}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Regenerate last response"
                  disabled={isLoading || messages.length < 2}
                >
                  <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleTheme}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {showSettings && (
            <div className={`p-4 border-b ${
              theme === 'dark' ? 'bg-black border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                <Sliders className="w-5 h-5 inline-block mr-2" />
                Settings
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Model
                  </label>
                  <select
                    value={settings.model}
                    onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                    className={`w-full p-2 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-black border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {AVAILABLE_MODELS.map(model => (
                      <option key={model.id} value={model.id} className="py-2">
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-black' : 'text-gray-500'
                  }`}>
                    {AVAILABLE_MODELS.find(m => m.id === settings.model)?.description}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-black' : 'text-gray-700'
                  }`}>
                    Temperature ({settings.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      temperature: parseFloat(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Lower values make responses more focused, higher values more creative
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="4000"
                    value={settings.maxTokens}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      maxTokens: parseInt(e.target.value) 
                    }))}
                    className={`w-full p-2 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-black border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Maximum length of the response (1 token ≈ 4 characters)
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Typing Speed (ms)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.typingSpeed}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      typingSpeed: parseInt(e.target.value) 
                    }))}
                    className={`w-full p-2 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-black border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Speed of the typing animation (lower = faster)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.autoScroll}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        autoScroll: e.target.checked
                      }))}
                    />
                    <span>Auto-scroll to bottom</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.codeHighlighting}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        codeHighlighting: e.target.checked
                      }))}
                    />
                    <span>Code syntax highlighting</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.speechRecognition}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        speechRecognition: e.target.checked
                      }))}
                    />
                    <span>Enable speech recognition</span>
                  </label>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">System Prompt</label>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    systemPrompt: e.target.value
                  }))}
                  className="w-full p-2 rounded-lg border"
                  rows={3}
                  placeholder="Set a custom system prompt..."
                />
              </div>
            </div>
          )}

          {error.isError && (
            <div className="m-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-red-700">{error.message}</p>
            </div>
          )}
          
          <div className="p-0">
            <div className={`h-[600px] overflow-y-auto p-6 space-y-6 ${
              theme === 'dark' ? 'bg-black' : ''
            }`} role="log">
              {messages.length === 0 && (
                <div className={`text-center p-8 rounded-lg ${
                  theme === 'dark' ? 'bg-black text-gray-300' : 'bg-gray-50 text-gray-500'
                }`}>
                  <Bot className="w-12 h-12 mx-auto mb-4 text-indigo-500" />
                  <p className="font-medium">Welcome to AI Chat!</p>
                  <p className="text-sm mt-2">Start a conversation by sending a message below.</p>
                </div>
              )}

              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start max-w-[80%] space-x-2 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}>
                    {/* ... (avatar) ... */}
                    <div
                      className={`p-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-indigo-500 text-white'
                          : theme === 'dark' 
                            ? 'bg-black text-gray-200' 
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.type === 'code' ? (
                        <CodeBlock code={message.content} language={message.language || 'text'} />
                      ) : message.isTyping ? (
                        <TypeWriter 
                          text={message.content} 
                          onComplete={() => handleTypingComplete(message.id)}
                          speed={settings.typingSpeed}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs ${
                          message.role === 'user' 
                            ? 'text-indigo-200' 
                            : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                        <button
                          onClick={() => copyMessage(message.content)}
                          className="p-1 rounded hover:bg-white/10"
                          title="Copy message"
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className={`p-4 rounded-2xl flex items-center space-x-2 ${
                    theme === 'dark' ? 'bg-black text-gray-200' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Enhanced input form with additional features */}
            <form onSubmit={sendMessage} className={`p-4 border-t ${
              theme === 'dark' ? 'bg-black border-gray-700' : 'bg-gray-50'
            }`}>
              <div className="flex flex-col space-y-2">
                {/* Message input row */}
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className={`w-full p-3 pr-24 border rounded-xl focus:outline-none focus:ring-2 
                               focus:ring-indigo-500 ${
                        theme === 'dark' 
                          ? 'bg-black border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white'
                      }`}
                      disabled={isLoading}
                      aria-label="Message input"
                    />
                    {/* Input actions */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                      {settings.speechRecognition && (
                        <button
                          type="button"
                          onClick={toggleRecording}
                          className={`p-2 rounded-lg transition-colors ${
                            recording 
                              ? 'text-red-500 hover:text-red-600' 
                              : 'text-gray-400 hover:text-gray-500'
                          }`}
                        >
                          {recording ? (
                            <StopCircle className="w-5 h-5" />
                          ) : (
                            <Mic className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {/* Image upload handler */}}
                        className="p-2 text-gray-400 hover:text-gray-500 rounded-lg"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className={`p-3 rounded-xl transition-all duration-200 
                             transform hover:scale-105 active:scale-95 ${
                      theme === 'dark'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
                    } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-label="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>

                {/* Context length indicator */}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    Context length: {messages.reduce((acc, msg) => acc + msg.content.length, 0)} chars
                  </span>
                  <span>
                    {AVAILABLE_MODELS.find(m => m.id === settings.model)?.contextWindow 
                      ? `Max context: ${AVAILABLE_MODELS.find(m => m.id === settings.model)?.contextWindow} tokens`
                      : ''}
                  </span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Keyboard shortcuts modal */}
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
          theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-800'
        }`}>
          <h3 className="font-medium mb-2">Keyboard Shortcuts</h3>
          <ul className="text-sm space-y-1">
            <li>
              <kbd className="px-2 py-1 rounded bg-gray-200 text-gray-800">Ctrl + Enter</kbd>
              <span className="ml-2">Send message</span>
            </li>
            <li>
              <kbd className="px-2 py-1 rounded bg-gray-200 text-gray-800">Ctrl + L</kbd>
              <span className="ml-2">Clear chat</span>
            </li>
            <li>
              <kbd className="px-2 py-1 rounded bg-gray-200 text-gray-800">Ctrl + S</kbd>
              <span className="ml-2">Save chat</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}