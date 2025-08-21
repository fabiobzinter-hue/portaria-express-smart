import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { 
  Home, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  UserCheck,
  UserX,
  Phone
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth'; // Importar useAuth

interface Morador {
  id: string;
  nome: string;
  apartamento: string;
  bloco: string;
  telefone: string;
  ativo: boolean;
  condominio_id: string;
  created_at: string;
}

interface Condominio {
  id: string;
  nome: string;
}

export const AdminResidents = () => {
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMorador, setEditingMorador] = useState<Morador | null>(null);
  const { toast } = useToast();
  const { user } = useAuth(); // Obter usuário logado
  const [userCondominioId, setUserCondominioId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    apartamento: '',
    bloco: '',
    telefone: '',
    condominio_id: '',
    ativo: true
  });

  useEffect(() => {
    const condoId = user?.funcionario?.condominio_id;
    if (condoId) {
      setUserCondominioId(condoId);
      loadData(condoId);
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadData = async (condominioId: string) => {
    try {
      setIsLoading(true);

      // Carregar moradores do condomínio
      const { data: moradoresData, error: morError } = await supabase
        .from('moradores')
        .select('*')
        .eq('condominio_id', condominioId) // Filtrar por condominioId
        .order('nome');

      if (morError) throw morError;

      // Carregar condomínios (apenas o do usuário logado)
      const { data: condominiosData, error: condError } = await supabase
        .from('condominios')
        .select('id, nome')
        .eq('id', condominioId) // Filtrar por condominioId
        .order('nome');

      if (condError) throw condError;

      setMoradores(moradoresData || []);
      setCondominios(condominiosData || []);

      // Preencher condominio_id no formulário se for um novo morador
      if (!editingMorador) {
        setFormData(prev => ({ ...prev, condominio_id: condominioId }));
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar moradores."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Garantir que o condominio_id está preenchido corretamente
    const finalCondominioId = formData.condominio_id || userCondominioId;
    if (!finalCondominioId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Condomínio não especificado para o morador."
      });
      return;
    }

    try {
      if (editingMorador) {
        // Atualizar morador existente
        const { error } = await supabase
          .from('moradores')
          .update({
            nome: formData.nome,
            apartamento: formData.apartamento,
            bloco: formData.bloco,
            telefone: formData.telefone,
            condominio_id: finalCondominioId, // Usar o ID final
            ativo: formData.ativo
          })
          .eq('id', editingMorador.id)
          .eq('condominio_id', userCondominioId); // Adicionar filtro de segurança

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Morador atualizado com sucesso."
        });
      } else {
        // Criar novo morador
        const { error } = await supabase
          .from('moradores')
          .insert([{
            nome: formData.nome,
            apartamento: formData.apartamento,
            bloco: formData.bloco,
            telefone: formData.telefone,
            condominio_id: finalCondominioId, // Usar o ID final
            ativo: formData.ativo
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Morador cadastrado com sucesso."
        });
      }

      setIsDialogOpen(false);
      resetForm();
      if (userCondominioId) {
        loadData(userCondominioId); // Recarregar dados após a operação
      }

    } catch (error: any) {
      console.error('Erro ao salvar morador:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao salvar morador."
      });
    }
  };

  const handleEdit = (morador: Morador) => {
    setEditingMorador(morador);
    setFormData({
      nome: morador.nome,
      apartamento: morador.apartamento,
      bloco: morador.bloco,
      telefone: morador.telefone,
      condominio_id: morador.condominio_id,
      ativo: morador.ativo
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este morador?')) return;

    try {
      const { error } = await supabase
        .from('moradores')
        .delete()
        .eq('id', id)
        .eq('condominio_id', userCondominioId); // Adicionar filtro de segurança

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Morador excluído com sucesso."
      });

      if (userCondominioId) {
        loadData(userCondominioId); // Recarregar dados após a operação
      }

    } catch (error: any) {
      console.error('Erro ao excluir morador:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao excluir morador."
      });
    }
  };

  const handleToggleStatus = async (morador: Morador) => {
    try {
      const { error } = await supabase
        .from('moradores')
        .update({ ativo: !morador.ativo })
        .eq('id', morador.id)
        .eq('condominio_id', userCondominioId); // Adicionar filtro de segurança

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Morador ${morador.ativo ? 'desativado' : 'ativado'} com sucesso.`
      });

      if (userCondominioId) {
        loadData(userCondominioId); // Recarregar dados após a operação
      }

    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao alterar status."
      });
    }
  };

  const resetForm = () => {
    setFormData(prev => ({
      nome: '',
      apartamento: '',
      bloco: '',
      telefone: '',
      condominio_id: userCondominioId || '', // Definir para o ID do condomínio do usuário logado
      ativo: true
    }));
    setEditingMorador(null);
  };

  const filteredMoradores = moradores.filter(morador =>
    morador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    morador.apartamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (morador.bloco && morador.bloco.toLowerCase().includes(searchTerm.toLowerCase())) ||
    morador.telefone.includes(searchTerm)
  );

  const getCondominioNome = (condominioId: string) => {
    return condominios.find(c => c.id === condominioId)?.nome || 'N/A';
  };

  const formatApartment = (apartamento: string, bloco: string) => {
    return bloco ? `${bloco}-${apartamento}` : apartamento;
  };

  if (isLoading || !userCondominioId) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Moradores</h2>
          <p className="text-gray-600">
            Cadastre e gerencie os moradores do condomínio
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Morador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingMorador ? 'Editar Morador' : 'Novo Morador'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do morador"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apartamento">Apartamento</Label>
                  <Input
                    id="apartamento"
                    value={formData.apartamento}
                    onChange={(e) => setFormData({ ...formData, apartamento: e.target.value })}
                    placeholder="Ex: 101"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloco">Bloco</Label>
                  <Input
                    id="bloco"
                    value={formData.bloco}
                    onChange={(e) => setFormData({ ...formData, bloco: e.target.value })}
                    placeholder="Ex: A (opcional)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condominio">Condomínio</Label>
                <Select
                  value={formData.condominio_id}
                  onValueChange={(value) => setFormData({ ...formData, condominio_id: value })}
                  disabled={!!userCondominioId} // Desabilitar se já tiver um condominioId do usuário
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o condomínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {condominios.map((condominio) => (
                      <SelectItem key={condominio.id} value={condominio.id}>
                        {condominio.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="ativo">Morador Ativo</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingMorador ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar moradores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Home className="h-5 w-5 mr-2" />
            Moradores ({filteredMoradores.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Apartamento</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Condomínio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMoradores.map((morador) => (
                <TableRow key={morador.id}>
                  <TableCell className="font-medium">{morador.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatApartment(morador.apartamento, morador.bloco)}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex items-center">
                    <Phone className="h-4 w-4 mr-1 text-gray-400" />
                    {morador.telefone}
                  </TableCell>
                  <TableCell>{getCondominioNome(morador.condominio_id)}</TableCell>
                  <TableCell>
                    <Badge variant={morador.ativo ? "default" : "secondary"}>
                      {morador.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(morador)}
                      >
                        {morador.ativo ? (
                          <UserX className="h-4 w-4 text-red-600" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(morador)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(morador.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

