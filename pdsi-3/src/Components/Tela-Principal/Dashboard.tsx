import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import {
  Users,
  FileText,
  Plus,
  ArrowRight,
  Calculator,
  BookMarked,
  BarChart,
  Edit2,
} from "lucide-react";
import { auth, db } from "../../firebase";
import { HouseHeart } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Header from "../Navegacao/Header";
import Sidebar from "../Navegacao/Sidebar";
// eslint-disable-next-line @typescript-eslint/no-unused-vars

const quickActions = [
  { icon: Users, label: "Paciente", path: "/PatientList" },
  { icon: FileText, label: "Prescrição", path: "/new-prescription" },
  { icon: BookMarked, label: "Receitas", path: "/new-recipe" },
  { icon: Calculator, label: "Calcular IMC", path: "/imc" },
  { icon: Calculator, label: "Calcular M. Basal", path: "/metabolismo-basal" },
  { icon: HouseHeart, label: "Cadastrar Clínicas", path: "/clinics" },
];

const mainNavCards = [
  {
    icon: Users,
    title: "Pacientes",
    description:
      "Gerencie e visualize cadastros de pacientes, históricos e consultas.",
    path: "/PatientList",
  },
  {
    icon: FileText,
    title: "Prescrições",
    description:
      "Crie e gerencie prescrições médicas de forma eficiente e segura.",
    path: "/new-prescription",
  },
  {
    icon: BarChart,
    title: "Relatórios",
    description:
      "Acesse relatórios detalhados sobre pacientes, atendimentos e estatísticas.",
    path: "/reports",
  },
  {
    icon: Calculator,
    title: "Cálculos Clínicos",
    description:
      "Realize cálculos de IMC, metabolismo basal e outras métricas importantes.",
    path: "/imc",
  },
  {
    icon: BarChart,
    title: "Cdastrar Clinicas",
    description:
      "Cadastre e gerencie informações das clínicas associadas ao seu consultório.",
    path: "/clinics",
  },
];

const healthIcons = ["👨‍⚕️", "👩‍⚕️", "🩺", "💊", "🩹", "🧬", "🏥"];

function Dashboard() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState<string>("Doutor");
  const [avatar, setAvatar] = useState<string>("👨‍⚕️");
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const doctorDoc = await getDoc(doc(db, "doctors", user.uid));
        if (doctorDoc.exists()) {
          const data = doctorDoc.data();
          const fullName = data.name || "";
          setFirstName(fullName.split(" ")[0] || "Doutor");
          setAvatar(data.avatar || "👨‍⚕️");
        } else {
          setFirstName(user.email?.split("@")[0] || "Doutor");
          setAvatar("👨‍⚕️");
        }
      } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleAvatarChange = async (icon: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "doctors", user.uid), { avatar: icon });
      setAvatar(icon);
      setShowIconPicker(false);
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar onNavigate={(path) => navigate(path)} />
      <main className="main-content">
        <Header />

        <section className="welcome-banner">
          <div
            className="welcome-avatar-container"
            onClick={() => setShowIconPicker(!showIconPicker)}
          >
            <span className="welcome-avatar">{avatar}</span>
            <Edit2 className="avatar-edit-icon" size={16} />
          </div>

          {showIconPicker && (
            <div className="icon-picker">
              {healthIcons.map((icon) => (
                <span
                  key={icon}
                  className="icon-option"
                  onClick={() => handleAvatarChange(icon)}
                >
                  {icon}
                </span>
              ))}
            </div>
          )}

          <div className="welcome-text">
            <h3>Olá, {firstName}!</h3>
            <p>
              Bem-vindo(a) ao seu painel de controle. Acesse rapidamente as
              funcionalidades essenciais e mantenha-se atualizado(a) com as
              informações dos seus pacientes.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() => navigate("/new-patient")}
          >
            <Plus size={18} />
            Novo Paciente
          </button>
        </section>

        <section className="quick-actions">
          <h2>Ações Rápidas</h2>
          <div className="quick-actions-grid">
            {quickActions.map((action) => (
              <a
                href="#"
                className="action-card"
                key={action.label}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(action.path);
                }}
              >
                <action.icon size={28} />
                <span>{action.label}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="main-navigation">
          <h2>Navegação Principal</h2>
          <div className="main-navigation-grid">
            {mainNavCards.map((card) => (
              <div className="nav-card" key={card.title}>
                <div className="nav-card-icon">
                  <card.icon size={24} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(card.path);
                  }}
                >
                  Abrir
                  <ArrowRight size={16} />
                </a>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
