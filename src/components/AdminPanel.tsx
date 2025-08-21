import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  Building, 
  FileText, 
  BarChart3, 
  ArrowLeft,
  Settings,
  UserPlus,
  Home
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminEmployees } from './AdminEmployees';
import { AdminResidents } from './AdminResidents';
import { AdminReports } from './AdminReports';
import { AdminCondominiums } from './AdminCondominiums'; // Importar o novo componente
import { useAuth } from '../hooks/useAuth';

interface AdminPanelProps {
  onBack: () => void;
}

type AdminView = "dashboard" | "employees" | "residents" | "reports" | "condominiums"; // Adicionar 'condominiums'

export const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const [currentView, setCurrentView] = useState<AdminView>("dashboard");
  const { user } = useAuth();

  const renderCurrentView = () => {
    switch (currentView) {
      case "dashboard":
        return <AdminDashboard />;
      case "employees":
        return <AdminEmployees />;
      case "residents":
        return <AdminResidents />;
      case "reports":
        return <AdminReports />;
      case "condominiums": // Novo case
        return <AdminCondominiums />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center space-x-2">
                <Settings className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Painel Administrativo
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Button
            variant={currentView === "dashboard" ? "default" : "outline"}
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => setCurrentView("dashboard")}
          >
            <BarChart3 className="h-6 w-6" />
            <span className="text-sm">Dashboard</span>
          </Button>

          <Button
            variant={currentView === "employees" ? "default" : "outline"}
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => setCurrentView("employees")}
          >
            <Users className="h-6 w-6" />
            <span className="text-sm">Funcionários</span>
          </Button>

          <Button
            variant={currentView === "residents" ? "default" : "outline"}
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => setCurrentView("residents")}
          >
            <Home className="h-6 w-6" />
            <span className="text-sm">Moradores</span>
          </Button>

          <Button
            variant={currentView === "reports" ? "default" : "outline"}
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => setCurrentView("reports")}
          >
            <FileText className="h-6 w-6" />
            <span className="text-sm">Relatórios</span>
          </Button>
        </div>
        {/* Botão de Condomínios apenas para super_administrador */}
        {user?.funcionario?.cargo === 'super_administrador' && (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-8">
            <Button
              variant={currentView === "condominiums" ? "default" : "outline"}
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => setCurrentView("condominiums")}
            >
              <Building className="h-6 w-6" />
              <span className="text-sm">Condomínios</span>
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border">
          {renderCurrentView()}
        </div>
      </div>
    </div>
  );
};

