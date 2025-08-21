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
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  UserCheck,
  UserX
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth'; // Importar useAuth

interface Funcionario {
  id: string;
  cpf: string;
  nome: string;
  senha: string;
  cargo: string;
  ativo: boolean;
  condominio_id: string;
  created_at: string;
}

interface Condominio {
  id: string;
  nome: string;
}

export const AdminEmployees = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const { toast } = useToast();
  const { user } = useAuth(); // Obter usuário logado
  const [userCondominioId, setUserCondominioId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    cpf: '',
    nome: '',
    senha: '',
    cargo: 'porteiro',
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

      // Carregar funcionários do condomínio
      const { data: funcionariosData, error: funcError } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('condominio_id', condominioId) // Filtrar por condominioId
        .order('nome');

      if (funcError) throw funcError;

      // Carregar condomínios (apenas o do usuário logado)
      const { data: condominiosData, error: condError } = await supabase
        .from('condominios')
        .select('id, nome')
        .eq('id', condominioId) // Filtrar por condominioId
        .order('nome');

      if (condError) throw condError;

      setFuncionarios(funcionariosData || []);
      setCondominios(condominiosData || []);

      // Preencher condominio_id no formulário se for um novo funcionário
      if (!editingFuncionario) {
        setFormData(prev => ({ ...prev, condominio_id: condominioId }));
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar funcionários."
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
        description: "Condomínio não especificado para o funcionário."
      });
      return;
    }

    try {
      if (editingFuncionario) {
        // Atualizar funcionário existente
        const { error } = await supabase
          .from('funcionarios')
          .update({
            cpf: formData.cpf,
            nome: formData.nome,
            senha: formData.senha,
            cargo: formData.cargo,
            condominio_id: finalCondominioId, // Usar o ID final
            ativo: formData.ativo
          })
          .eq('id', editingFuncionario.id)
          .eq('condominio_id', userCondominioId); // Adicionar filtro de segurança

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Funcionário atualizado com sucesso."
        });
      } else {
        // Criar novo funcionário
        const { error } = await supabase
          .from('funcionarios')
          .insert([{
            cpf: formData.cpf,
            nome: formData.nome,
            senha: formData.senha,
            cargo: formData.cargo,
            condominio_id: finalCondominioId, // Usar o ID final
            ativo: formData.ativo
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Funcionário cadastrado com sucesso."
        });
      }

      setIsDialogOpen(false);
      resetForm();
      if (userCondominioId) {
        loadData(userCondominioId); // Recarregar dados após a operação
      }

    } catch (error: any) {
      console.error('Erro ao salvar funcionário:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao salvar funcionário."
      });
    }
  };

  const handleEdit = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    setFormData({
      cpf: funcionario.cpf,
      nome: funcionario.nome,
      senha: funcionario.senha,
      cargo: funcionario.cargo,
      condominio_id: funcionario.condominio_id,
      ativo: funcionario.ativo
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;

    try {
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id)
        .eq('condominio_id', userCondominioId); // Adicionar filtro de segurança

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Funcionário excluído com sucesso."
      });

      if (userCondominioId) {
        loadData(userCondominioId); // Recarregar dados após a operação
      }

    } catch (error: any) {
      console.error('Erro ao excluir funcionário:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao excluir funcionário."
      });
    }
  };

  const handleToggleStatus = async (funcionario: Funcionario) => {
    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({ ativo: !funcionario.ativo })
        .eq('id', funcionario.id)
        .eq('condominio_id', userCondominioId); // Adicionar filtro de segurança

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Funcionário ${funcionario.ativo ? 'desativado' : 'ativado'} com sucesso.`
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
      cpf: '',
      nome: '',
      senha: '',
      cargo: 'porteiro',
      condominio_id: userCondominioId || '', // Definir para o ID do condomínio do usuário logado
      ativo: true
    }));
    setEditingFuncionario(null);
  };

  const filteredFuncionarios = funcionarios.filter(funcionario =>
    funcionario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.cpf.includes(searchTerm) ||
    funcionario.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCondominioNome = (condominioId: string) => {
    return condominios.find(c => c.id === condominioId)?.nome || 'N/A';
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
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Funcionários</h2>
          <p className="text-gray-600">
            Cadastre e gerencie os funcionários do condomínio
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Select
                    value={formData.cargo}
                    onValueChange={(value) => setFormData({ ...formData, cargo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="porteiro">Porteiro</SelectItem>
                      <SelectItem value="zelador">Zelador</SelectItem>
                      <SelectItem value="administrador">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do funcionário"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  placeholder="Senha de acesso"
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
                <Label htmlFor="ativo">Funcionário Ativo</Label>
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
                  {editingFuncionario ? 'Atualizar' : 'Cadastrar'}
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
          placeholder="Buscar funcionários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Funcionários ({filteredFuncionarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Condomínio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFuncionarios.map((funcionario) => (
                <TableRow key={funcionario.id}>
                  <TableCell className="font-medium">{funcionario.nome}</TableCell>
                  <TableCell>{funcionario.cpf}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {funcionario.cargo}
                    </Badge>
                  </TableCell>
                  <TableCell>{getCondominioNome(funcionario.condominio_id)}</TableCell>
                  <TableCell>
                    <Badge variant={funcionario.ativo ? "default" : "secondary"}>
                      {funcionario.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(funcionario)}
                      >
                        {funcionario.ativo ? (
                          <UserX className="h-4 w-4 text-red-600" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(funcionario)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(funcionario.id)}
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

