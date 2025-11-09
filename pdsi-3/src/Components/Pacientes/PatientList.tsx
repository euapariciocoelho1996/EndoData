import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import Header from "../Navegacao/Header";
import Sidebar from "../Navegacao/Sidebar";
// Remova a importação do PatientForm.css e use o novo CSS
import "./PatientList.css";

type Patient = {
  id: string;
  name: string;
  cpf?: string;
  dateOfBirth?: string;
  createdAt?: unknown;
};

// --- ÍCONES EM SVG (para usar no componente) ---

const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
    />
  </svg>
);

const CpfIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m-6 2.25h6M12 9l3 3m0 0-3 3m3-3h6m-6 3.75h6m-6 2.25h6m-6 2.25h6"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25m10.5-2.25v2.25M6.75 21h10.5a2.25 2.25 0 0 0 2.25-2.25V7.5a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 7.5v11.25a2.25 2.25 0 0 0 2.25 2.25Z"
    />
  </svg>
);

// --- FUNÇÕES HELPER ---

// Converte diferentes formatos de timestamp para milissegundos
function toMillis(value: unknown): number {
  if (!value) return 0;
  const maybeTimestamp = value as { toMillis?: () => number } | undefined;
  if (maybeTimestamp && typeof maybeTimestamp.toMillis === "function") {
    return maybeTimestamp.toMillis();
  }
  if (typeof value === "number") return value;
  if (typeof value === "string") return new Date(value).getTime() || 0;
  return 0;
}

// Pega as iniciais do nome para o avatar
const getInitials = (name: string) => {
  const names = name.split(" ");
  if (names.length === 0) return "?";
  const first = names[0][0] || "";
  const last = names.length > 1 ? names[names.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
};

// --- COMPONENTE PRINCIPAL ---

const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Estado para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6; // Seu requisito de 6 por página

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return setLoading(false);

    const qPatients = query(
      collection(db, "patients"),
      where("doctorId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      qPatients,
      (snapshot) => {
        let list = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Patient, "id">;
          return { id: doc.id, ...data };
        }) as Patient[];

        list = list.sort((a, b) => {
          const ta = toMillis(a.createdAt);
          const tb = toMillis(b.createdAt);
          return tb - ta; // Mais novos primeiro
        });

        setPatients(list);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao buscar pacientes:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Reseta a página para 1 quando a busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Lógica de filtro
  const filtered = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.cpf || "").includes(q.replace(/\D/g, ""))
    );
  });

  // Lógica de paginação
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPatients = filtered.slice(startIndex, endIndex); // <-- Usamos este para o map

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="patients-container">
          <h2>Busca e Listagem de Pacientes</h2>

          {/* Campo de busca estilizado */}
          <div className="search-box">
            <span className="search-icon">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="loading-text">Carregando pacientes...</p>
          ) : filtered.length === 0 ? (
            <p className="no-results">Nenhum paciente encontrado.</p>
          ) : (
            <>
              {/* Grid de Pacientes */}
              <div className="patients-grid">
                {currentPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="patient-card"
                    onClick={() => navigate(`/paciente/${patient.id}`)}
                  >
                    {/* Avatar com iniciais */}
                    <div className="patient-avatar">
                      {getInitials(patient.name)}
                    </div>
                    {/* Informações do paciente */}
                    <div className="patient-info">
                      <h3 className="patient-name">{patient.name}</h3>
                      <span className="patient-detail">
                        <span className="detail-icon">
                          <CpfIcon />
                        </span>
                        CPF: {patient.cpf || "Não informado"}
                      </span>
                      <span className="patient-detail">
                        <span className="detail-icon">
                          <CalendarIcon />
                        </span>
                        Nascimento:{" "}
                        {patient.dateOfBirth
                          ? new Date(patient.dateOfBirth).toLocaleDateString(
                              "pt-BR",
                              { timeZone: "UTC" }
                            )
                          : "Não informado"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Barra de Paginação */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    &lt; Anterior
                  </button>

                  {/* Gera os botões de número */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={currentPage === page ? "active" : ""}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Próximo &gt;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientList;
