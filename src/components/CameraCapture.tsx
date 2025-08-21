import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCcw, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Parar qualquer stream anterior
      stopCamera();

      console.log('📸 Iniciando câmera...');
      
      // Verificar contexto seguro (permitir localhost e IPs locais em desenvolvimento)
      const isSecure = window.isSecureContext || 
                      location.hostname === 'localhost' || 
                      location.hostname.startsWith('192.168.') ||
                      location.hostname.startsWith('10.') ||
                      location.hostname.startsWith('172.') ||
                      location.hostname.includes('127.0.0.1');
      
      if (!isSecure) {
        console.warn('⚠️ Contexto não seguro detectado, mas tentando mesmo assim...');
      }

      // Tentar diferentes configurações de câmera
      const constraints = {
        video: {
          facingMode: 'environment', // Câmera traseira
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      };

      let mediaStream;
      console.log('➡️ Tentando acessar a câmera com getUserMedia (configuração principal)...'); // Log de depuração
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ getUserMedia (configuração principal) bem-sucedido.'); // Log de depuração
      } catch (error) {
        console.error('❌ Erro detalhado do getUserMedia (principal):', error); // Adicionado para depuração
        console.log('⚠️ Tentando configuração alternativa...'); // Log de depuração
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          console.log('✅ getUserMedia (configuração alternativa) bem-sucedido.'); // Log de depuração
        } catch (altError) {
          console.error('❌ Erro detalhado do getUserMedia (alternativa):', altError); // Log de depuração
          throw altError; // Re-lança o erro para ser capturado pelo catch externo
        }
      }
      
      console.log('✅ Câmera acessada com sucesso'); // Log de depuração
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Aguardar o vídeo carregar completamente
        const waitForVideo = () => {
          return new Promise((resolve, reject) => {
            const video = videoRef.current;
            if (!video) {
              reject(new Error('Elemento de vídeo não encontrado'));
              return;
            }

            const onLoadedMetadata = () => {
              console.log('🎥 Metadados do vídeo carregados');
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              resolve(true);
            };

            const onError = (e: Event) => {
              console.error('❌ Erro no carregamento do vídeo:', e);
              video.removeEventListener('error', onError);
              reject(new Error('Erro no carregamento do vídeo'));
            };

            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);

            // Timeout de 10 segundos
            setTimeout(() => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(new Error('Timeout ao carregar vídeo'));
            }, 10000);
          });
        };

        try {
          console.log('➡️ Tentando reproduzir vídeo...'); // Log de depuração
          await waitForVideo();
          
          // Tentar reproduzir o vídeo
          await videoRef.current.play();
          console.log('🎥 Vídeo iniciado com sucesso'); // Log de depuração
          setIsReady(true);
          setIsLoading(false);
        } catch (playError) {
          console.error('❌ Erro ao reproduzir vídeo:', playError); // Log de depuração
          setError('Erro ao reproduzir vídeo. Tente novamente.');
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('❌ Erro fatal ao iniciar câmera:', error); // Log de depuração
      
      let errorMessage = 'Erro ao acessar câmera';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permissão de câmera negada. Verifique as permissões do navegador.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Câmera não encontrada. Verifique se o dispositivo tem câmera.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Câmera não suportada neste dispositivo.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Câmera está sendo usada por outro aplicativo.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && isReady) {
      try {
        console.log('📸 Capturando foto...');
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        // Definir dimensões do canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Desenhar o frame atual do vídeo no canvas
          ctx.drawImage(video, 0, 0);
          
          // Converter para blob
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
              const preview = canvas.toDataURL('image/jpeg', 0.8);
              
              console.log('✅ Foto capturada com sucesso');
              onCapture(file, preview);
            } else {
              console.error('❌ Erro ao criar blob da foto');
              setError('Erro ao processar foto');
            }
          }, 'image/jpeg', 0.8);
        } else {
          console.error('❌ Erro ao obter contexto do canvas');
          setError('Erro ao processar foto');
        }
      } catch (error) {
        console.error('❌ Erro ao capturar foto:', error);
        setError('Erro ao capturar foto');
      }
    } else {
      console.error('❌ Câmera não está pronta');
      setError('Câmera não está pronta');
    }
  };

  const retryCamera = () => {
    setError(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={onClose}
          variant="destructive"
          size="sm"
          className="rounded-full w-12 h-12 p-0"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Vídeo */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="flex-1 w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-xl">Carregando câmera...</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-white text-center max-w-sm mx-4">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <div className="text-xl mb-4">Erro na Câmera</div>
            <div className="text-sm mb-6">{error}</div>
            <div className="space-y-2">
              <Button onClick={retryCamera} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button onClick={onClose} variant="outline" className="w-full">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Controls */}
      {isReady && !error && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-6">
          <Button
            onClick={onClose}
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16 p-0"
          >
            <X className="h-8 w-8" />
          </Button>
          
          <Button
            onClick={capturePhoto}
            disabled={!isReady}
            variant="default"
            size="lg"
            className="bg-white text-black rounded-full w-20 h-20 p-0 border-4 border-white hover:bg-gray-100"
          >
            <Camera className="h-10 w-10" />
          </Button>
        </div>
      )}
    </div>
  );
};
