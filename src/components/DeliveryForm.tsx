import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Camera, Send, Package, User, Phone, Home, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Resident {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
}

interface DeliveryFormProps {
  resident: Resident;
  apartmentInfo: { bloco: string; apartamento: string };
  onBack: () => void;
  onComplete: () => void;
  funcionarioId: string;
  condominioNome: string;
  condominioId?: string;
}

// Gerar código de retirada aleatório
const generateWithdrawalCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString(); // 5 dígitos
};

export const DeliveryForm = ({ 
  resident, 
  apartmentInfo, 
  onBack, 
  onComplete,
  funcionarioId,
  condominioNome,
  condominioId,
}: DeliveryFormProps) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [observations, setObservations] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [withdrawalCode] = useState(generateWithdrawalCode());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [resolvedCondoName, setResolvedCondoName] = useState<string>(condominioNome);

  const resolveCondominioNome = async (): Promise<string> => {
    const envName = (import.meta as any).env?.VITE_CONDOMINIO_NOME;
    if (envName) return envName as string;
    try {
      // Buscar condominio a partir do morador selecionado
      const { data: morador } = await supabase
        .from('moradores')
        .select('condominio_id')
        .eq('id', resident.id)
        .maybeSingle();
      if (morador?.condominio_id) {
        const { data: condo } = await supabase
          .from('condominios')
          .select('nome')
          .eq('id', morador.condominio_id)
          .maybeSingle();
        if (condo?.nome) return condo.nome;
      }
      // Fallback: pega o primeiro condomínio cadastrado
      const { data: firstCondo } = await supabase
        .from('condominios')
        .select('nome')
        .limit(1)
        .maybeSingle();
      if (firstCondo?.nome) return firstCondo.nome;
    } catch {}
    return condominioNome;
  };

  useEffect(() => {
    resolveCondominioNome().then((n) => setResolvedCondoName(n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const startCamera = async () => {
    try {
      console.log('🎥 Iniciando câmera...');
      
      // getUserMedia requer HTTPS ou localhost em muitos navegadores
      if (!window.isSecureContext && location.hostname !== 'localhost') {
        throw new Error('INSECURE_CONTEXT');
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Câmera não suportada neste navegador');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      
      setStream(mediaStream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
      
    } catch (error: any) {
      console.error('❌ Erro na câmera:', error);
      
      let message = 'Erro ao acessar câmera';
      if (error?.message === 'INSECURE_CONTEXT') {
        message = 'A câmera exige HTTPS ou localhost. Acesse via https:// ou use localhost em vez do IP de rede.';
      }
      if (error.name === 'NotAllowedError') {
        message = 'Permissão da câmera negada. Permita o acesso nas configurações do navegador.';
      } else if (error.name === 'NotFoundError') {
        message = 'Nenhuma câmera encontrada no dispositivo.';
      }
      
      toast({
        variant: "destructive",
        title: "Câmera indisponível",
        description: message,
      });
      
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        toast({
          variant: "destructive",
          title: "Câmera não pronta",
          description: "Aguarde a câmera carregar completamente.",
        });
        return;
      }
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoPreview(dataURL);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `encomenda-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setPhotoFile(file);
            stopCamera();
            
            toast({
              title: "Foto capturada!",
              description: "Foto da encomenda salva com sucesso.",
            });
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!photoFile) {
      toast({
        variant: "destructive",
        title: "Foto obrigatória",
        description: "Por favor, tire uma foto da encomenda.",
      });
      return;
    }

    if (!resident) {
      toast({
        variant: "destructive",
        title: "Morador não selecionado",
        description: "Por favor, selecione um morador.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📦 Iniciando salvamento da encomenda...');
      
      // 1. Validar funcionarioId recebido por props
      if (!funcionarioId) {
        throw new Error('Usuário não autenticado');
      }
      console.log('✅ Usando funcionário logado:', funcionarioId);

      // 2. Upload da foto para o Supabase Storage e usar a URL pública no WhatsApp
      let photoUrl = "";
      try {
        const bucket = 'Imagem Encomenda'; // Corrigido para o nome exato do bucket
        const fileName = `encomendas/${resident.id}/${Date.now()}.jpg`;
        console.log('📸 Tentando upload da foto:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, photoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Erro no upload:', uploadError);
          throw new Error(uploadError.message || 'Upload error');
        } else {
          console.log('✅ Upload realizado:', uploadData);
          
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
          
          if (urlData?.publicUrl) {
            photoUrl = urlData.publicUrl;
            console.log('🔗 URL da foto:', photoUrl);
          }
        }
      } catch (error) {
        console.error('❌ Erro no upload da foto:', error);
        const message = error instanceof Error ? error.message : 'Falha no upload da imagem';
        toast({ variant: 'destructive', title: 'Erro', description: `Falha no upload da imagem: ${message}` });
        throw new Error(message);
      }

      // 3. Salvar entrega no Supabase
      const entregaData = {
        morador_id: resident.id,
        funcionario_id: funcionarioId, // Usando o UUID correto do funcionário
        codigo_retirada: withdrawalCode,
        foto_url: photoUrl,
        observacoes: observations,
        status: 'pendente',
        data_entrega: new Date().toISOString(),
        mensagem_enviada: false,
        condominio_id: condominioId || undefined,
      };

      console.log('💾 Salvando entrega no Supabase:', entregaData);

      const { data: entregaResult, error: entregaError } = await supabase
        .from('entregas')
        .insert([entregaData])
        .select()
        .single();

      if (entregaError) {
        console.error('❌ Erro ao salvar entrega:', entregaError);
        throw new Error(`Erro ao salvar entrega: ${entregaError.message}`);
      } else {
        console.log('✅ Entrega salva no Supabase:', entregaResult);
      }

      // 4. Salvar no localStorage como backup
      const delivery = {
        id: entregaResult?.id || Date.now().toString(),
        resident: {
          id: resident.id,
          name: resident.name,
          phone: resident.phone,
        },
        apartmentInfo: {
          bloco: apartmentInfo.bloco,
          apartamento: apartmentInfo.apartamento,
        },
        withdrawalCode,
        photo: photoUrl,
        observations,
        timestamp: new Date().toISOString(),
        status: 'pendente'
      };

      const savedDeliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
      savedDeliveries.push(delivery);
      localStorage.setItem('deliveries', JSON.stringify(savedDeliveries));

      // 5. Enviar notificação via WhatsApp (link público da imagem)
      try {
        const now = new Date();
        const data = now.toLocaleDateString('pt-BR');
        const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const resolvedCondoName = await resolveCondominioNome();

        const response = await fetch('https://ofaifvyowixzktwvxrps.supabase.co/functions/v1/send-whatsapp-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: resident.phone,
            message: (() => {
              const obs = observations && observations.trim().length > 0 
                ? `\n📝 Observações: ${observations.trim()}\n` 
                : '';
              return `🏢 *${resolvedCondoName}*\n\n📦 *Nova Encomenda Chegou!*\n\nOlá *${resident.name}*, você tem uma nova encomenda!\n\n📅 Data: ${data}\n⏰ Hora: ${hora}\n🔑 Código de retirada: *${withdrawalCode}*${obs}\nPara retirar, apresente este código na portaria.\n\nNão responda esta mensagem, este é um atendimento automático.`;
            })(),
            type: 'delivery',
            deliveryData: {
              codigo: withdrawalCode,
              morador: resident.name,
              apartamento: apartmentInfo.apartamento,
              bloco: apartmentInfo.bloco,
              observacoes: observations,
              data: data,
              hora: hora,
              foto: photoUrl
            }
          }),
        });

        if (response.ok) {
          console.log('✅ WhatsApp notification sent successfully');
          // 5.1 Atualizar flag mensagem_enviada na tabela de entregas
          if (entregaResult?.id) {
            const { error: updateError } = await supabase
              .from('entregas')
              .update({ mensagem_enviada: true })
              .eq('id', entregaResult.id);

            if (updateError) {
              console.error('❌ Erro ao atualizar mensagem_enviada:', updateError);
            } else {
              console.log('✅ mensagem_enviada atualizada para true');
            }
          }
        } else {
          console.error('❌ Failed to send WhatsApp notification');
        }
      } catch (error) {
        console.error('❌ Error sending WhatsApp notification:', error);
      }

      toast({
        title: "Encomenda registrada!",
        description: `Código: ${withdrawalCode}. Salvo no Supabase com sucesso!`,
      });

      onComplete();
    } catch (error: any) {
      console.error('❌ Erro geral:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao registrar encomenda. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Badge variant="secondary" className="text-sm">
              {apartmentInfo.bloco} - {apartmentInfo.apartamento}
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-primary" />
            Registrar Entrega
          </CardTitle>
        </CardHeader>
      </Card>

      <Card className="shadow-card bg-gradient-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                {getInitials(resident.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {resident.name}
              </h3>
              <p className="text-muted-foreground">{resident.phone}</p>
              {resident.role && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {resident.role}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-primary" />
            Foto da Encomenda *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photo" className="text-sm font-medium">
              Adicionar foto
            </Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Button
                type="button"
                variant="dashboard"
                size="lg"
                onClick={startCamera}
                disabled={isCameraActive}
                className="w-full h-12 sm:h-auto"
              >
                <Camera className="h-5 w-5 mr-2" />
                {isCameraActive ? "Câmera ativa" : "Tirar foto da encomenda"}
              </Button>
              
              <label htmlFor="photo" className="w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-12 sm:h-auto"
                  asChild
                >
                  <span>
                    <Package className="h-5 w-5 mr-2" />
                    Galeria
                  </span>
                </Button>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>

            {isCameraActive && (
              <div className="relative bg-black rounded-lg overflow-hidden h-64 sm:h-80">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  onCanPlay={() => console.log('✅ Vídeo pode reproduzir')}
                  onError={(e) => console.error('❌ Erro no vídeo:', e)}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-white text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Iniciando câmera...</p>
                    </div>
                  </div>
                )}
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                  <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    onClick={stopCamera}
                    className="rounded-full w-12 h-12 sm:w-14 sm:h-14 p-0 shadow-lg"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    onClick={capturePhoto}
                    className="bg-white text-black hover:bg-gray-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 p-0 shadow-lg border-4 border-gray-300"
                  >
                    <Camera className="h-6 w-6 sm:h-8 sm:w-8" />
                  </Button>
                </div>
                
                <div className="absolute top-4 right-4">
                  <div className="bg-red-500 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-bold animate-pulse">
                    ● REC
                  </div>
                </div>
              </div>
            )}

            {photoPreview && (
              <div className="relative bg-muted rounded-lg p-2">
                <img
                  src={photoPreview}
                  alt="Preview da encomenda"
                  className="w-full max-h-96 object-contain rounded-md shadow-card"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="text-lg">Código de Retirada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Código que será enviado ao morador:
            </p>
            <p className="text-3xl font-bold text-primary tracking-wider">
              {withdrawalCode}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              O morador precisará informar este código para retirar a encomenda
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="text-lg">Observações (Opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ex: Encomenda frágil, requer cuidado..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="text-lg">Preview da Mensagem WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-foreground">
              🏢 <strong>{resolvedCondoName}</strong><br/>
              Olá <strong>{resident.name}</strong>, sua encomenda chegou e está na portaria.<br/>
              <br/>
              🔑 <strong>Código de retirada: {withdrawalCode}</strong><br/>
              {observations && (
                <>
                  <br/>
                  📝 Observações: {observations}
                </>
              )}
              <br/>
              📷 Foto da encomenda em anexo<br/>
              <br/>
              Retire quando puder apresentando este código ao porteiro.
              <br/>
              <br/>
              Não responda esta mensagem, este é um atendimento automático.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        size="xl"
        variant="success"
        className="w-full"
        onClick={handleSubmit}
        disabled={isSubmitting || !photoFile}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Registrando no Supabase...
          </>
        ) : (
          <>
            <Send className="h-5 w-5 mr-2" />
            Registrar e Enviar WhatsApp
          </>
        )}
      </Button>
    </div>
  );
};
