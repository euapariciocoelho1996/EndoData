import React from "react";
import { HouseHeart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Home,
  Users,
  FileText,
  BarChart,
  HelpCircle,
  BookMarked,
  ClipboardList,
  Calendar,
} from "lucide-react";

type NavItem = {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  path: string;
};

type SidebarProps = {
  logo?: string;
  onNavigate?: (path: string) => void;
};

const defaultNavItems: NavItem[] = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Users, label: "Pacientes", path: "/PatientList" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: FileText, label: "Prescrição", path: "/new-prescription" },
  { icon: BookMarked, label: "Receita", path: "/new-recipe" },
  {
    icon: ClipboardList,
    label: "Prescrições e Receitas",
    path: "/prescriptions-recipes",
  },
  { icon: BarChart, label: "Relatórios", path: "/reports" },
  { icon: HouseHeart, label: "Cadastrar Clínicas", path: "/clinics" },
];

const supportNumbers = [
  { name: "Suporte 1", phone: "+55 87 8172-1791" },
  { name: "Suporte 2", phone: "+55 89 8120-9282" },
  { name: "Suporte 3", phone: "+55 87 9913-9429" },
  { name: "Suporte 4", phone: "+55 89 8108-3930" },
  { name: "Suporte 5", phone: "+55 89 8135-8328" },
];

const Sidebar: React.FC<SidebarProps> = ({ logo = "EndoData", onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    if (onNavigate) onNavigate(path);
    else navigate(path);
  };

  const handleHelp = () => {
    Swal.fire({
      title: "Precisa de Suporte?",
      html: `
        ${supportNumbers
          .map(
            (s) => `
          <p style="margin: 8px 0;">
            📞 <strong>${s.name}</strong><br/>
            ${s.phone}
          </p>
        `
          )
          .join("")}
      `,
      icon: "info",
      confirmButtonText: "Fechar",
      showCloseButton: true,
      width: 380,
    });
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
            handleHelp();
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
