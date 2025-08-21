import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Funcionario = Tables<'funcionarios'>;
type Condominio = Tables<'condominios'> & { sindico_id?: string | null }; // Adicionar sindico_id ao tipo Condominio
type Morador = Tables<'moradores'>;

interface AuthUser {
  funcionario: Funcionario;
  condominio: Condominio | null; // Pode ser null se o condomínio não for encontrado
  moradores: Morador[];
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restaurar sessão do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const parsed: AuthUser = JSON.parse(stored);
        setUser(parsed);
        // Atualiza o nome do condomínio a partir do banco se existir divergência
        (async () => {
          try {
            const { data } = await supabase
              .from('condominios')
              .select('*, sindico_id') // Selecionar sindico_id
              .eq('id', parsed.condominio?.id)
              .maybeSingle();
            
            if (data && data.nome && data.nome !== parsed.condominio?.nome) {
              const updated = { ...parsed, condominio: { ...parsed.condominio, ...data } } as AuthUser;
              setUser(updated);
              localStorage.setItem('auth_user', JSON.stringify(updated));
            }
          } catch {
            // Ignora erros ao atualizar dados do condomínio
          }
        })();
      }
    } catch {}
  }, []);

  const login = async (cpf: string, senha: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validação básica dos campos
      if (!cpf || !senha) {
        throw new Error('CPF e senha são obrigatórios.');
      }

      // Validação do formato do CPF (deve ter 11 dígitos)
      const cleanCpf = cpf.replace(/\D/g, '');
      const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const trimmedSenha = senha.trim();
      if (cleanCpf.length !== 11) {
        throw new Error('CPF deve ter 11 dígitos.');
      }

      // Validação básica do CPF (não pode ser todos os mesmos números)
      if (/^(\d)\1{10}$/.test(cleanCpf)) {
        throw new Error('CPF inválido.');
      }

      let funcionario: Funcionario | null = null;
      let condominio: Condominio | null = null;

      // 1) Tenta autenticar como funcionário
      const { data: funcionarios, error: funcError } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('cpf', cleanCpf)
        .eq('senha', trimmedSenha)
        .eq('ativo', true);

      if (funcError) {
        console.error('Erro ao buscar funcionário:', funcError);
        throw new Error('Erro ao buscar funcionário. Tente novamente.');
      }

      if (funcionarios && funcionarios.length > 0) {
        funcionario = funcionarios[0];
        const { data: condo, error: condError } = await supabase
          .from('condominios')
          .select('*, sindico_id')
          .eq('id', funcionario.condominio_id)
          .maybeSingle();

        if (condError) {
          console.error('Erro ao buscar condomínio:', condError);
          throw new Error('Erro ao buscar dados do condomínio');
        }
        condominio = condo as Condominio | null;
      } else {
        // 2) Se não achou funcionário, tenta síndico pelo CPF/senha do condomínio
        const cpfAsNumber = Number(cleanCpf);
        const { data: condosByCpf, error: cpfSearchError } = await supabase
          .from('condominios')
          .select('id, nome, sindico_id, sindico_nome, sindico_cpf, sindico_senha')
          .or(`sindico_cpf.eq.${cleanCpf},sindico_cpf.eq.${formattedCpf},sindico_cpf.eq.${isNaN(cpfAsNumber) ? '0' : cpfAsNumber}`);

        if (cpfSearchError) {
          console.error('Erro ao buscar condomínio por CPF de síndico:', cpfSearchError);
          throw new Error('Erro ao verificar dados do síndico');
        }

        const senhaAsNumber = Number(trimmedSenha);
        const condo = (condosByCpf || []).find((c: any) => {
          const stored = c.sindico_senha;
          if (stored === null || stored === undefined) return false;
          if (typeof stored === 'number') {
            return stored === senhaAsNumber;
          }
          // stored como texto
          return String(stored) === trimmedSenha || String(stored).trim() === trimmedSenha;
        }) || null;

        if (!condo) {
          throw new Error('CPF ou senha incorretos.');
        }

        condominio = (function toCondo(c: any) {
          const { id, nome, sindico_id, sindico_nome } = c;
          return { id, nome, sindico_id, sindico_nome } as unknown as Condominio;
        })(condo);

        funcionario = {
          id: condominio.sindico_id || `sindico-${condominio.id}`,
          nome: (condo as any).sindico_nome || 'Síndico',
          cpf: cleanCpf,
          senha: senha,
          cargo: 'sindico' as any,
          ativo: true,
          condominio_id: condominio.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as Funcionario;
      }

      // Busca os moradores do condomínio
      const { data: moradores, error: morError } = await supabase
        .from('moradores')
        .select('*')
        .eq('condominio_id', funcionario!.condominio_id);

      if (morError) {
        console.error('Erro ao buscar moradores:', morError);
        // Não falha se não conseguir buscar moradores
      }

      const authUser: AuthUser = {
        funcionario: funcionario!,
        condominio,
        moradores: moradores || [],
      };

      localStorage.setItem('current_user_cpf', cleanCpf);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      setUser(authUser);
      return authUser;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no login';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('current_user_cpf');
  };

  const getMoradoresByApartamento = (apartamento: string, bloco?: string) => {
    if (!user) return [];
    
    return user.moradores.filter(morador => {
      const apartamentoMatch = morador.apartamento === apartamento;
      const blocoMatch = !bloco || morador.bloco === bloco;
      return apartamentoMatch && blocoMatch;
    });
  };

  return {
    user,
    isLoading,
    error,
    login,
    logout,
    getMoradoresByApartamento,
    isAuthenticated: !!user
  };
};
