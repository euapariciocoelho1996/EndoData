import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  FileText,
  BarChart,
  Settings,
  HelpCircle,
  BookMarked,
  ClipboardList,
  Calendar,
} from "lucide-react";

// Tipo para os items do menu
type NavItem = {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  path: string; // Adicionado path para navegação
};

// Props do componente
type SidebarProps = {
  logo?: string;
  onNavigate?: (path: string) => void;
};

// Items de navegação - podem ser customizados por quem usar o componente
const defaultNavItems: NavItem[] = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Users, label: "Pacientes", path: "/PatientList" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: FileText, label: "Prescrição", path: "/new-prescription" },
  { icon: BookMarked, label: "Receita", path: "/new-recipe" },
  { icon: ClipboardList, label: "Prescrições e Receitas", path: "/prescriptions-recipes" },
  { icon: BarChart, label: "Relatórios", path: "/reports" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

const Sidebar: React.FC<SidebarProps> = ({ logo = "EndoData", onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">{logo}</div>
      <nav className="sidebar-nav">
        <ul>
          {defaultNavItems.map((item) => (
            <li key={item.label}>
              <a
                href="#"
                className={location.pathname === item.path ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation(item.path);
                }}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleNavigation("/help");
          }}
        >
          <HelpCircle size={20} />
          <span>Ajuda</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
