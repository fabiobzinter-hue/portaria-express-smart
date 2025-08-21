import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Lock, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onLogin: (cpf: string, senha: string) => Promise<any>;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação do CPF antes de enviar
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast({
        variant: "destructive",
        title: "CPF inválido",
        description: "O CPF deve ter 11 dígitos.",
      });
      return;
    }

    // Validação básica do CPF (não pode ser todos os mesmos números)
    if (/^(\d)\1{10}$/.test(cleanCpf)) {
      toast({
        variant: "destructive",
        title: "CPF inválido",
        description: "CPF não pode ter todos os dígitos iguais.",
      });
      return;
    }

    // Validação da senha
    if (!password || password.length < 3) {
      toast({
        variant: "destructive",
        title: "Senha inválida",
        description: "A senha deve ter pelo menos 3 caracteres.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const authUser = await onLogin(cleanCpf, password);

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${authUser.funcionario.nome}!`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: error instanceof Error ? error.message : "CPF ou senha incorretos.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-dashboard-header to-muted p-4">
      <Card className="w-full max-w-md shadow-elevated bg-gradient-card">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 p-3 bg-gradient-primary rounded-full w-fit">
            <Building className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Portaria Inteligente
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sistema de Gestão de Entregas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cpf" className="text-sm font-medium">
                CPF
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  className="pl-10 h-12"
                  maxLength={14}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              variant="large"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Entrando..." : "Entrar no Sistema"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground text-center mb-2">
              <strong>Funcionários de Teste:</strong>
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• CPF: 12345678901 | Senha: 123456 | João Silva (Residencial Vista Bela)</p>
              <p>• CPF: 98765432100 | Senha: 654321 | Maria Santos (Condomínio Solar)</p>
              <p>• CPF: 11122233344 | Senha: 789123 | Pedro Oliveira (Residencial Parque)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};