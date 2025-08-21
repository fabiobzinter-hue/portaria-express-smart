import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, Package } from 'lucide-react';

export const TestApp = () => {
  const [step, setStep] = useState<'login' | 'search' | 'camera' | 'success'>('login');
  const [apartamento, setApartamento] = useState('');
  const [morador, setMorador] = useState<{ nome: string; telefone: string } | null>(null);
  const [photo, setPhoto] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Dados fixos para teste - com telefones corretos
  const moradores: Record<string, { nome: string; telefone: string }> = {
    '1905': { nome: 'Fabio Brito Zissou', telefone: '(11) 99999-1111' },
    '1001': { nome: 'Maria Santos', telefone: '(11) 98888-4444' },
    '2003': { nome: 'Carlos Silva', telefone: '(11) 97777-5555' }
  };

  const handleLogin = () => {
    setStep('search');
  };

  const handleSearch = () => {
    const found = moradores[apartamento];
    if (found) {
      setMorador(found);
      setStep('camera');
      startCamera();
    } else {
      alert('Apartamento não encontrado! Tente: 1905, 1001 ou 2003');
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Erro câmera:', error);
      alert('Erro na câmera. Verifique permissões.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        
        // Parar câmera
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        setStep('success');
      }
    }
  };

  const reset = () => {
    setStep('login');
    setApartamento('');
    setMorador(null);
    setPhoto('');
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      {step === 'login' && (
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle>🏢 Portaria Express</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label>CPF:</label>
                <Input value="12345678901" readOnly />
              </div>
              <div>
                <label>Senha:</label>
                <Input type="password" value="123456" readOnly />
              </div>
              <Button onClick={handleLogin} className="w-full">
                Entrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'search' && (
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle>🔍 Buscar Apartamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label>Apartamento:</label>
                <Input
                  value={apartamento}
                  onChange={(e) => setApartamento(e.target.value)}
                  placeholder="1905, 1001 ou 2003"
                />
              </div>
              <Button onClick={handleSearch} className="w-full">
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'camera' && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="text-white p-4 text-center">
            <h2>📦 Foto para: {morador?.nome}</h2>
            <p>Apartamento: {apartamento}</p>
          </div>
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
            <Button
              onClick={reset}
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16 p-0"
            >
              <X className="h-8 w-8" />
            </Button>
            
            <Button
              onClick={capturePhoto}
              variant="default"
              size="lg"
              className="bg-white text-black rounded-full w-20 h-20 p-0"
            >
              <Camera className="h-10 w-10" />
            </Button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle className="text-green-600">✅ Sucesso!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p><strong>Morador:</strong> {morador?.nome}</p>
              <p><strong>Telefone:</strong> {morador?.telefone}</p>
              <p><strong>Apartamento:</strong> {apartamento}</p>
              <p><strong>Código:</strong> {Math.floor(10000 + Math.random() * 90000)}</p>
              
              {photo && (
                <img src={photo} alt="Foto" className="w-full h-32 object-cover rounded" />
              )}
              
              <Button onClick={reset} className="w-full">
                <Package className="h-4 w-4 mr-2" />
                Nova Entrega
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
