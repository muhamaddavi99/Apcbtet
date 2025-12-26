import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Send, Loader2, Sparkles, BarChart3, Megaphone, Trash2, Copy, Save, Database, Image as ImageIcon, Plus, History, X } from 'lucide-react';
import VoiceInput from '@/components/VoiceInput';
import MarkdownRenderer from '@/components/MarkdownRenderer';

type Message = { role: 'user' | 'assistant'; content: string; image?: string };
type AIType = 'chat' | 'analyze' | 'announcement' | 'crud';
type ChatSession = {
  id: string;
  name: string;
  type: AIType;
  messages: Message[];
  createdAt: Date;
};

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
const CRUD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-crud`;

const SESSIONS_KEY = 'ai_chat_sessions';

export default function AIAssistant() {
  usePageTitle('AI Asisten');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AIType>('chat');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSendingImage, setIsSendingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed.map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) })));
      } catch (e) {
        console.error('Failed to load sessions', e);
      }
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) {
        setMessages(session.messages);
        setActiveTab(session.type);
      }
    } else {
      setMessages([]);
    }
  }, [currentSessionId, sessions]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile) setUserRole(profile.role);
      }
    };
    getUser();
  }, []);

  const saveCurrentSession = (newMessages: Message[]) => {
    if (currentSessionId) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: newMessages } : s
      ));
    }
  };

  const createNewSession = () => {
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id,
      name: `Sesi ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      type: activeTab,
      messages: [],
      createdAt: new Date(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(id);
    setMessages([]);
    setSelectedImage(null);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  };

  const streamChat = async (userMessages: Message[], type: AIType, imageBase64?: string): Promise<{ content: string; image?: string }> => {
    const messagesPayload = userMessages.map(m => ({ role: m.role, content: m.content }));
    
    // If there's an image, add it to the last user message
    if (imageBase64) {
      const lastUserMsg = messagesPayload[messagesPayload.length - 1];
      if (lastUserMsg) {
        lastUserMsg.content = `[User mengirim gambar] ${lastUserMsg.content}`;
      }
    }

    const resp = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: messagesPayload, 
        type,
        userImage: imageBase64 
      }),
    });

    if (resp.status === 429) throw new Error('Rate limit tercapai, coba lagi nanti.');
    if (resp.status === 402) throw new Error('Kredit habis, silakan top up.');
    if (!resp.ok || !resp.body) throw new Error('Gagal menghubungi AI');

    const contentType = resp.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await resp.json();
      if (data.type === 'image' && data.imageUrl) {
        const newMsg: Message = { 
          role: 'assistant', 
          content: data.message || 'Berikut gambar yang diminta:',
          image: data.imageUrl 
        };
        const updatedMessages = [...userMessages, newMsg];
        setMessages(updatedMessages);
        saveCurrentSession(updatedMessages);
        return { content: data.message, image: data.imageUrl };
      } else if (data.type === 'text' && data.message) {
        const newMsg: Message = { role: 'assistant', content: data.message };
        const updatedMessages = [...userMessages, newMsg];
        setMessages(updatedMessages);
        saveCurrentSession(updatedMessages);
        return { content: data.message };
      }
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.role === 'assistant') {
                const updated = prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                return updated;
              } else {
                return [...prev, { role: 'assistant', content: assistantContent }];
              }
            });
          }
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    // Save final messages
    setMessages(prev => {
      saveCurrentSession(prev);
      return prev;
    });

    return { content: assistantContent };
  };

  const editImageWithAI = async (imageUrl: string, prompt: string): Promise<string | null> => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-edit-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageUrl, prompt }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || 'Gagal edit gambar');
      }

      const data = await resp.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Edit image error:', error);
      throw error;
    }
  };

  const parseAIResponse = (content: string) => {
    // First try to find hidden action data format
    const hiddenActionMatch = content.match(/<!-- ACTION_DATA\s*([\s\S]*?)\s*ACTION_DATA_END -->/);
    if (hiddenActionMatch) {
      try {
        return JSON.parse(hiddenActionMatch[1].trim());
      } catch {
        // Fall through to other parsing methods
      }
    }
    
    // Try to find JSON in code blocks
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return null;
      }
    }
    
    // Try to parse raw JSON
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  const executeCrudAction = async (action: string, data: Record<string, any>) => {
    const resp = await fetch(CRUD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action, data, user_id: userId }),
    });

    const result = await resp.json();
    if (!resp.ok) throw new Error(result.error || 'Gagal menyimpan data');
    return result;
  };

  const handleSaveToDatabase = async (content: string, type: AIType) => {
    if (!['admin', 'staff'].includes(userRole)) {
      toast({ title: 'Error', description: 'Hanya admin/staff yang bisa menyimpan ke database', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      let action = '';
      let data: Record<string, any> = {};

      if (type === 'announcement') {
        const lines = content.split('\n').filter(l => l.trim());
        const title = lines[0]?.replace(/^[#*\s]+/, '').trim() || 'Pengumuman';
        const bodyContent = lines.slice(1).join('\n').trim() || content;
        
        action = 'create_announcement';
        data = { title, content: bodyContent, priority: 'normal' };
      } else if (type === 'crud') {
        const parsed = parseAIResponse(content);
        if (parsed && parsed.action) {
          action = parsed.action;
          data = parsed.data || parsed;
        } else {
          toast({ title: 'Error', description: 'Format data tidak valid.', variant: 'destructive' });
          return;
        }
      }

      if (!action) {
        toast({ title: 'Error', description: 'Tidak dapat menentukan aksi', variant: 'destructive' });
        return;
      }

      const result = await executeCrudAction(action, data);
      toast({ title: 'Berhasil', description: result.message || 'Data berhasil disimpan' });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Gagal menyimpan', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    // Create new session if none exists
    if (!currentSessionId) {
      createNewSession();
    }

    const messageContent = input.trim() || (selectedImage ? 'Tolong analisis gambar ini' : '');
    const userMsg: Message = { 
      role: 'user', 
      content: messageContent,
      image: selectedImage || undefined
    };
    
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    
    const imageToSend = selectedImage;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // If there's an image and prompt contains edit keywords, use edit function
      if (imageToSend && (messageContent.toLowerCase().includes('edit') || 
          messageContent.toLowerCase().includes('ubah') || 
          messageContent.toLowerCase().includes('modifikasi'))) {
        setIsSendingImage(true);
        const editedUrl = await editImageWithAI(imageToSend, messageContent);
        if (editedUrl) {
          const assistantMsg: Message = { 
            role: 'assistant', 
            content: 'Berikut hasil edit gambar:', 
            image: editedUrl 
          };
          const updatedMessages = [...currentMessages, assistantMsg];
          setMessages(updatedMessages);
          saveCurrentSession(updatedMessages);
        }
        setIsSendingImage(false);
      } else {
        await streamChat(currentMessages, activeTab, imageToSend || undefined);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menghubungi AI',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsSendingImage(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setSelectedImage(null);
    if (currentSessionId) {
      saveCurrentSession([]);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Disalin', description: 'Teks berhasil disalin ke clipboard' });
  };

  const handleUseImageForAnnouncement = (imageUrl: string) => {
    // Store the image URL in localStorage so Pengumuman page can use it
    localStorage.setItem('ai_image_for_announcement', imageUrl);
    toast({ 
      title: 'Gambar Tersimpan', 
      description: 'Gambar siap digunakan di halaman Pengumuman. Buka halaman Pengumuman dan buat pengumuman baru.' 
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'File harus berupa gambar', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Ukuran file maksimal 5MB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholders: Record<AIType, string> = {
    chat: 'Tanya tentang absensi, jadwal, foto sekolah...',
    analyze: 'Minta analisis data absensi atau performa...',
    announcement: 'Minta buatkan pengumuman, misal: "Buat pengumuman libur"',
    crud: 'Contoh: "Tambah siswa baru Ahmad NIS 12345"',
  };

  const tabInfo: Record<AIType, { icon: React.ReactNode; title: string; desc: string }> = {
    chat: { icon: <Bot className="h-4 w-4" />, title: 'Chatbot', desc: 'Tanya jawab tentang sekolah' },
    analyze: { icon: <BarChart3 className="h-4 w-4" />, title: 'Analisis', desc: 'Insight dan rekomendasi' },
    announcement: { icon: <Megaphone className="h-4 w-4" />, title: 'Pengumuman', desc: 'Generate & simpan pengumuman' },
    crud: { icon: <Database className="h-4 w-4" />, title: 'CRUD Data', desc: 'Kelola data dengan AI' },
  };

  const isAdminOrStaff = ['admin', 'staff'].includes(userRole);
  const filteredSessions = sessions.filter(s => s.type === activeTab);

  return (
    <Layout>
      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
          <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
          <span className="truncate">AI Asisten</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Asisten AI untuk membantu tugas sekolah
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v as AIType);
        setCurrentSessionId(null);
        setMessages([]);
      }} className="mt-4 sm:mt-6">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          {Object.entries(tabInfo).map(([key, info]) => {
            if (key === 'crud' && !isAdminOrStaff) return null;
            return (
              <TabsTrigger 
                key={key} 
                value={key} 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm"
              >
                {info.icon}
                <span className="truncate">{info.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(tabInfo).map(([key, info]) => {
          if (key === 'crud' && !isAdminOrStaff) return null;
          return (
            <TabsContent key={key} value={key} className="mt-3 sm:mt-4">
              {/* Session selector */}
              <div className="flex gap-2 mb-3">
                <Select 
                  value={currentSessionId || ''} 
                  onValueChange={(v) => setCurrentSessionId(v || null)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih sesi atau buat baru..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSessions.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Belum ada riwayat sesi</p>
                      </div>
                    )}
                    {filteredSessions.map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{session.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({session.messages.length} pesan)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={createNewSession}
                  title="Sesi Baru"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                {currentSessionId && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => deleteSession(currentSessionId)}
                    title="Hapus Sesi"
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Card className="h-[calc(100vh-18rem)] sm:h-[calc(100vh-20rem)]">
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        {info.icon}
                        <span className="truncate">{info.title}</span>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm truncate">{info.desc}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs self-start sm:self-auto flex-shrink-0">
                      Gemini 2.5
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col h-[calc(100%-4rem)] sm:h-[calc(100%-5rem)] px-3 sm:px-6">
                  <ScrollArea className="flex-1 pr-2 sm:pr-4 mb-3 sm:mb-4" ref={scrollRef}>
                    <div className="space-y-3 sm:space-y-4">
                      {messages.length === 0 && (
                        <div className="text-center py-8 sm:py-12 text-muted-foreground">
                          <Bot className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                          <p className="text-sm sm:text-base">Belum ada percakapan</p>
                          <p className="text-xs sm:text-sm">Mulai dengan mengetik pertanyaan di bawah</p>
                          <div className="mt-4 text-xs space-y-1">
                            <p>Contoh: "Tampilkan foto sekolah"</p>
                            <p>Contoh: "Lihat gambar pengumuman"</p>
                          </div>
                        </div>
                      )}
                      {messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.role === 'assistant' && (
                            <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-3 ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.image && (
                              <div className="mb-2">
                                <img 
                                  src={msg.image} 
                                  alt="Gambar" 
                                  className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(msg.image, '_blank')}
                                />
                              </div>
                            )}
                            {msg.role === 'assistant' ? (
                              <MarkdownRenderer content={msg.content} className="text-xs sm:text-sm" />
                            ) : (
                              <p className="whitespace-pre-wrap text-xs sm:text-sm break-words">{msg.content}</p>
                            )}
                            {msg.role === 'assistant' && (
                              <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 sm:h-7 px-2 text-xs"
                                  onClick={() => handleCopy(msg.content)}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">Salin</span>
                                </Button>
                                {msg.image && isAdminOrStaff && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 sm:h-7 px-2 text-xs text-green-600"
                                    onClick={() => handleUseImageForAnnouncement(msg.image!)}
                                    title="Gunakan gambar ini untuk pengumuman"
                                  >
                                    <Megaphone className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Pengumuman</span>
                                  </Button>
                                )}
                                {isAdminOrStaff && (key === 'announcement' || key === 'crud') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 sm:h-7 px-2 text-xs text-primary"
                                    onClick={() => handleSaveToDatabase(msg.content, key as AIType)}
                                    disabled={isLoading}
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Simpan</span>
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                        <div className="flex gap-2 sm:gap-3 justify-start">
                          <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary animate-spin" />
                          </div>
                          <div className="bg-muted rounded-lg p-2 sm:p-3">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {isSendingImage ? 'Memproses gambar...' : 'Mengetik...'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Selected image preview */}
                  {selectedImage && (
                    <div className="relative mb-2 inline-block">
                      <img 
                        src={selectedImage} 
                        alt="Preview" 
                        className="h-20 rounded-lg object-cover border"
                      />
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleClear}
                      disabled={messages.length === 0}
                      title="Hapus percakapan"
                      className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <VoiceInput 
                      onTranscript={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
                      disabled={isLoading}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isLoading}
                      title="Upload gambar untuk dikirim ke AI"
                      className={`h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 ${selectedImage ? 'ring-2 ring-primary bg-primary/10' : ''}`}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <Textarea
                      placeholder={selectedImage ? 'Tulis pesan untuk gambar ini...' : placeholders[key as AIType]}
                      value={activeTab === key ? input : ''}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[36px] sm:min-h-[44px] max-h-24 sm:max-h-32 resize-none text-sm"
                      disabled={isLoading}
                    />
                    <Button 
                      onClick={handleSend} 
                      disabled={isLoading || (!input.trim() && !selectedImage)}
                      className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                      size="icon"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {isAdminOrStaff && (
        <div className="mt-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
          <h3 className="text-xs sm:text-sm font-medium mb-2">Contoh Perintah:</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• "Tampilkan foto profil sekolah"</p>
            <p>• "Lihat gambar pengumuman terbaru"</p>
            <p>• "Tampilkan semua foto di database"</p>
            <p>• "Tambah siswa baru Ahmad NIS 12345"</p>
          </div>
        </div>
      )}
    </Layout>
  );
}
