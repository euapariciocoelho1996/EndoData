import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import Header from "../Navegacao/Header";
import Sidebar from "../Navegacao/Sidebar";
import "./PrescriptionsAndRecipesList.css";
import { FileText, BookMarked, Search, Calendar, User } from "lucide-react";

type Prescription = {
  id: string;
  patientId: string;
  patientName: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
  observations: string;
  createdAt: Timestamp | null;
  doctorId: string;
};

type Recipe = {
  id: string;
  patientId: string;
  patientName: string;
  patientAddress: string;
  medications: {
    name: string;
    concentration: string;
    quantity: string;
    dosage: string;
    frequency: string;
    duration: string;
    useInstructions: string;
  }[];
  specialInstructions: string;
  isControlled: boolean;
  validityDays: number;
  issueDate: string;
  createdAt: Timestamp | null;
  doctorId: string;
};

type FilterType = "all" | "prescriptions" | "recipes";

// Função helper para converter timestamp
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

// Função para formatar data
function formatDate(dateValue: unknown): string {
  if (!dateValue) return "Data não disponível";
  const timestamp = dateValue as Timestamp | null;
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (typeof dateValue === "string") {
    return new Date(dateValue).toLocaleDateString("pt-BR");
  }
  return "Data não disponível";
}

const PrescriptionsAndRecipesList: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    let prescriptionsLoaded = false;
    let recipesLoaded = false;

    const checkLoading = () => {
      if (prescriptionsLoaded && recipesLoaded) {
        setLoading(false);
      }
    };

    // Query para prescrições
    const qPrescriptions = query(
      collection(db, "prescriptions"),
      where("doctorId", "==", user.uid)
    );

    // Query para receitas
    const qRecipes = query(
      collection(db, "recipes"),
      where("doctorId", "==", user.uid)
    );

    // Subscribe para prescrições
    const unsubscribePrescriptions = onSnapshot(
      qPrescriptions,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Prescription, "id">;
          return { id: doc.id, ...data };
        }) as Prescription[];

        // Ordenar por data (mais recentes primeiro)
        list.sort((a, b) => {
          const ta = toMillis(a.createdAt);
          const tb = toMillis(b.createdAt);
          return tb - ta;
        });

        setPrescriptions(list);
        prescriptionsLoaded = true;
        checkLoading();
      },
      (err) => {
        console.error("Erro ao buscar prescrições:", err);
        prescriptionsLoaded = true;
        checkLoading();
      }
    );

    // Subscribe para receitas
    const unsubscribeRecipes = onSnapshot(
      qRecipes,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Recipe, "id">;
          return { id: doc.id, ...data };
        }) as Recipe[];

        // Ordenar por data (mais recentes primeiro)
        list.sort((a, b) => {
          const ta = toMillis(a.createdAt);
          const tb = toMillis(b.createdAt);
          return tb - ta;
        });

        setRecipes(list);
        recipesLoaded = true;
        checkLoading();
      },
      (err) => {
        console.error("Erro ao buscar receitas:", err);
        recipesLoaded = true;
        checkLoading();
      }
    );

    return () => {
      unsubscribePrescriptions();
      unsubscribeRecipes();
    };
  }, []);

  // Reseta a página quando busca ou filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

  // Função de filtro combinada
  const getFilteredItems = () => {
    let items: Array<{
      type: "prescription" | "recipe";
      data: Prescription | Recipe;
    }> = [];

    if (filterType === "all" || filterType === "prescriptions") {
      items.push(
        ...prescriptions.map((p) => ({
          type: "prescription" as const,
          data: p,
        }))
      );
    }

    if (filterType === "all" || filterType === "recipes") {
      items.push(...recipes.map((r) => ({ type: "recipe" as const, data: r })));
    }

    // Aplicar busca
    if (search.trim()) {
      const searchLower = search.trim().toLowerCase();
      items = items.filter((item) => {
        const patientName = item.data.patientName?.toLowerCase() || "";
        return patientName.includes(searchLower);
      });
    }

    // Ordenar por data (mais recentes primeiro)
    items.sort((a, b) => {
      const ta = toMillis(a.data.createdAt);
      const tb = toMillis(b.data.createdAt);
      return tb - ta;
    });

    return items;
  };

  const filteredItems = getFilteredItems();
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  const totalCount = filteredItems.length;
  const prescriptionsCount = prescriptions.length;
  const recipesCount = recipes.length;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="prescriptions-recipes-container">
          <div className="header-section">
            <h2>Prescrições e Receitas</h2>
            <p className="subtitle">
              Visualize todas as prescrições e receitas emitidas por você
            </p>
          </div>

          {/* Estatísticas */}
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-icon prescription">
                <FileText size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{prescriptionsCount}</div>
                <div className="stat-label">Prescrições</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon recipe">
                <BookMarked size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{recipesCount}</div>
                <div className="stat-label">Receitas</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon total">
                <FileText size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{totalCount}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="filters-section">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filterType === "all" ? "active" : ""}`}
                onClick={() => setFilterType("all")}
              >
                Todas ({totalCount})
              </button>
              <button
                className={`filter-tab ${
                  filterType === "prescriptions" ? "active" : ""
                }`}
                onClick={() => setFilterType("prescriptions")}
              >
                Prescrições ({prescriptionsCount})
              </button>
              <button
                className={`filter-tab ${
                  filterType === "recipes" ? "active" : ""
                }`}
                onClick={() => setFilterType("recipes")}
              >
                Receitas ({recipesCount})
              </button>
            </div>

            <div className="search-box">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por nome do paciente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Lista de Itens */}
          {loading ? (
            <div className="loading-message">Carregando...</div>
          ) : currentItems.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>Nenhum item encontrado.</p>
              <span>
                {search
                  ? "Tente ajustar sua busca ou filtros."
                  : "Você ainda não emitiu nenhuma prescrição ou receita."}
              </span>
            </div>
          ) : (
            <>
              <div className="items-grid">
                {currentItems.map((item) => (
                  <div key={item.data.id} className={`item-card ${item.type}`}>
                    <div className="item-header">
                      <div className="item-type-badge">
                        {item.type === "prescription" ? (
                          <>
                            <FileText size={18} />
                            <span>Prescrição</span>
                          </>
                        ) : (
                          <>
                            <BookMarked size={18} />
                            <span>Receita</span>
                          </>
                        )}
                      </div>
                      {item.type === "recipe" &&
                        (item.data as Recipe).isControlled && (
                          <div className="controlled-badge">Controlado</div>
                        )}
                    </div>

                    <div className="item-body">
                      <div className="item-info-row">
                        <User size={16} />
                        <span className="item-label">Paciente:</span>
                        <span className="item-value">
                          {item.data.patientName}
                        </span>
                      </div>

                      <div className="item-info-row">
                        <Calendar size={16} />
                        <span className="item-label">Data:</span>
                        <span className="item-value">
                          {formatDate(item.data.createdAt)}
                        </span>
                      </div>

                      <div className="item-info-row">
                        <FileText size={16} />
                        <span className="item-label">Medicamentos:</span>
                        <span className="item-value">
                          {item.data.medications?.length || 0} item(ns)
                        </span>
                      </div>

                      {item.type === "recipe" && (
                        <div className="item-info-row">
                          <span className="item-label">Validade:</span>
                          <span className="item-value">
                            {(item.data as Recipe).validityDays} dias
                          </span>
                        </div>
                      )}

                      {item.data.medications &&
                        item.data.medications.length > 0 && (
                          <div className="medications-preview">
                            <strong>Medicamentos:</strong>
                            <ul>
                              {item.data.medications
                                .slice(0, 2)
                                .map((med, idx) => (
                                  <li key={idx}>
                                    {med.name} {med.dosage && `- ${med.dosage}`}
                                  </li>
                                ))}
                              {item.data.medications.length > 2 && (
                                <li className="more-items">
                                  +{item.data.medications.length - 2} mais
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    &lt; Anterior
                  </button>

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

export default PrescriptionsAndRecipesList;
