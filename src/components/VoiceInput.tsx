import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length === 0) {
          setIsProcessing(false);
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      toast({
        title: 'Merekam...',
        description: 'Bicara sekarang. Tekan tombol untuk berhenti.',
      });
    } catch (error: any) {
      console.error('Microphone error:', error);
      toast({
        title: 'Error',
        description: error.name === 'NotAllowedError' 
          ? 'Izin mikrofon ditolak. Silakan aktifkan di pengaturan browser.'
          : 'Gagal mengakses mikrofon',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      setIsProcessing(true);
      setIsRecording(false);
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Use browser's Web Speech API for transcription (free, works offline)
        const transcript = await transcribeWithWebSpeech();
        
        if (transcript) {
          onTranscript(transcript);
          toast({
            title: 'Berhasil',
            description: 'Suara berhasil dikonversi ke teks',
          });
        }
        
        setIsProcessing(false);
      };
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: 'Error',
        description: 'Gagal memproses audio',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  // Use Web Speech API for real-time transcription
  const transcribeWithWebSpeech = (): Promise<string> => {
    return new Promise((resolve) => {
      // Fallback if chunks are empty
      if (chunksRef.current.length === 0) {
        resolve('');
        return;
      }

      // For now, just resolve empty - the real transcription happens during recording
      resolve('');
    });
  };

  // Alternative: Use continuous Web Speech API recognition
  const startWebSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: 'Tidak Didukung',
        description: 'Browser Anda tidak mendukung pengenalan suara. Gunakan Chrome atau Edge.',
        variant: 'destructive',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      
      if (event.error === 'not-allowed') {
        toast({
          title: 'Izin Ditolak',
          description: 'Silakan aktifkan izin mikrofon di pengaturan browser.',
          variant: 'destructive',
        });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
        toast({
          title: 'Berhasil',
          description: 'Suara berhasil dikonversi ke teks',
        });
      }
    };

    recognition.start();
    setIsRecording(true);

    // Store recognition object to stop it later
    (window as any).__speechRecognition = recognition;

    toast({
      title: 'Merekam...',
      description: 'Bicara sekarang dalam Bahasa Indonesia.',
    });
  }, [onTranscript, toast]);

  const stopWebSpeechRecognition = useCallback(() => {
    const recognition = (window as any).__speechRecognition;
    if (recognition) {
      recognition.stop();
      delete (window as any).__speechRecognition;
    }
    setIsRecording(false);
  }, []);

  const handleClick = () => {
    if (isRecording) {
      stopWebSpeechRecognition();
    } else {
      startWebSpeechRecognition();
    }
  };

  return (
    <Button
      type="button"
      variant={isRecording ? 'destructive' : 'outline'}
      size="icon"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      title={isRecording ? 'Berhenti merekam' : 'Rekam suara'}
      className={`relative ${isRecording ? 'animate-pulse' : ''}`}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <>
          <Square className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
        </>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
