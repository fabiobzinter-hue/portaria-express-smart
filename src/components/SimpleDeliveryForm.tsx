import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Package, Send } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Morador {
  id: string;
  nome: string;
  apartamento: string;
  bloco: string;
  telefone: string;
}

interface SimpleDeliveryFormProps {
  onBack: () => void;
  moradores: Morador[];
}

export const SimpleDeliveryForm = ({ onBack, moradores }: SimpleDeliveryFormProps) => {
  const [apartamento, setApartamento] = useState('');
  const [selectedMorador, setSelectedMorador] = useState<Morador | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const codigoRetirada = Math.floor(10000 + Math.random() * 90000).toString();

  const buscarMoradores = () => {
    if (!apartamento.trim()) return;
    
    const encontrados = moradores.filter(m => 
      m.apartamento === apartamento.trim()
    );
    
    if (encontrados.length > 0) {
      setSelectedMorador(encontrados[0]);
    } else {
      toast({
        variant: "destructive",
        title: "Apartamento não encontrado",
        description: "Verifique o número do apartamento.",
      });
    }
  };

  const handleCameraCapture = (file: File, preview: string) => {
    setPhotoFile(file);
    setPhotoPreview(preview);
    setShowCamera(false);
    toast({
      title: "Foto capturada!",
      description: "Foto salva com sucesso.",
    });
  };

  const handleSubmit = async () => {
    if (!selectedMorador || !photoFile) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Selecione um morador e tire uma foto.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Salvar no localStorage no formato unificado "deliveries"
      const delivery = {
        id: Date.now().toString(),
        resident: {
          id: selectedMorador.id,
          name: selectedMorador.nome,
          phone: selectedMorador.telefone,
        },
        apartmentInfo: {
          bloco: selectedMorador.bloco,
          apartamento: selectedMorador.apartamento,
        },
        withdrawalCode: codigoRetirada,
        photo: photoPreview,
        observations: observacoes,
        timestamp: new Date().toISOString(),
        status: 'pendente'
      };

      const deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
      deliveries.push(delivery);
      localStorage.setItem('deliveries', JSON.stringify(deliveries));

      // Enviar WhatsApp
      try {
        await fetch('https://ofaifvyowixzktwvxrps.supabase.co/functions/v1/send-whatsapp-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedMorador.telefone,
            message: `📦 Nova encomenda chegou!\n\nOlá ${selectedMorador.nome}, você tem uma encomenda!\n\nCódigo: ${codigoRetirada}\nApartamento: ${selectedMorador.apartamento}\n\nApresente este código na portaria para retirar.`
          })
        });
      } catch (error) {
        console.error('Erro WhatsApp:', error);
      }

      toast({
        title: "Encomenda registrada!",
        description: `Código: ${codigoRetirada}`,
      });

      onBack();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao registrar encomenda.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Button onClick={onBack} variant="ghost">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nova Encomenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buscar Apartamento */}
          <div>
            <Label>Apartamento</Label>
            <div className="flex gap-2">
              <Input
                value={apartamento}
                onChange={(e) => setApartamento(e.target.value)}
                placeholder="Ex: 1905"
                className="text-lg"
              />
              <Button onClick={buscarMoradores}>Buscar</Button>
            </div>
          </div>

          {/* Morador Selecionado */}
          {selectedMorador && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <h3 className="font-bold">{selectedMorador.nome}</h3>
                <p>Apartamento: {selectedMorador.apartamento}</p>
                <p>Telefone: {selectedMorador.telefone}</p>
                <p className="text-lg font-bold text-blue-600">Código: {codigoRetirada}</p>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a encomenda..."
            />
          </div>

          {/* Foto */}
          <div>
            <Label>Foto da Encomenda *</Label>
            <div className="space-y-2">
              <Button
                onClick={() => setShowCamera(true)}
                variant="outline"
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Tirar Foto
              </Button>
              
              <label htmlFor="photo-file" className="w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <span>
                    <Package className="h-4 w-4 mr-2" />
                    Escolher da Galeria
                  </span>
                </Button>
                <Input
                  id="photo-file"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPhotoFile(file);
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setPhotoPreview(e.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
              
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded"
                />
              )}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedMorador || !photoFile || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>Salvando...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Registrar Encomenda
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
