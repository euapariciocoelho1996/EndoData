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
import "./Reports.css";
import {
  Users,
  FileText,
  BookMarked,
  Calendar,
  TrendingUp,
  BarChart3,
  Activity,
} from "lucide-react";

type Patient = {
  id: string;
  name: string;
  createdAt?: unknown;
};

type Prescription = {
  id: string;
  patientId: string;
  patientName: string;
  createdAt: Timestamp | null;
  doctorId: string;
};

type Recipe = {
  id: string;
  patientId: string;
  patientName: string;
  createdAt: Timestamp | null;
  doctorId: string;
};

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

// Função para obter o início da semana (segunda-feira)
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta para segunda-feira
  return new Date(d.setDate(diff));
}

// Função para obter o fim da semana (domingo)
function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// Função para formatar data
function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Função para obter nome do dia da semana
function getDayName(date: Date): string {
  const days = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  return days[date.getDay()];
}

// Função para obter todos os dias da semana atual
function getWeekDays(): Date[] {
  const start = getStartOfWeek(new Date());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

const Reports: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    let patientsLoaded = false;
    let prescriptionsLoaded = false;
    let recipesLoaded = false;

    const checkLoading = () => {
      if (patientsLoaded && prescriptionsLoaded && recipesLoaded) {
        setLoading(false);
      }
    };

    // Query para pacientes
    const qPatients = query(
      collection(db, "patients"),
      where("doctorId", "==", user.uid)
    );

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

    // Subscribe para pacientes
    const unsubscribePatients = onSnapshot(
      qPatients,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Patient, "id">;
          return { id: doc.id, ...data };
        }) as Patient[];
        setPatients(list);
        patientsLoaded = true;
        checkLoading();
      },
      (err) => {
        console.error("Erro ao buscar pacientes:", err);
        patientsLoaded = true;
        checkLoading();
      }
    );

    // Subscribe para prescrições
    const unsubscribePrescriptions = onSnapshot(
      qPrescriptions,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Prescription, "id">;
          return { id: doc.id, ...data };
        }) as Prescription[];
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
      unsubscribePatients();
      unsubscribePrescriptions();
      unsubscribeRecipes();
    };
  }, []);

  // Calcular atendimentos da semana
  const getWeekAttendances = () => {
    const startOfWeek = getStartOfWeek(new Date());
    const endOfWeek = getEndOfWeek(new Date());
    const startMillis = startOfWeek.getTime();
    const endMillis = endOfWeek.getTime();

    // Combinar prescrições e receitas
    const allAttendances = [
      ...prescriptions.map((p) => ({
        type: "prescription" as const,
        date: toMillis(p.createdAt),
        patientName: p.patientName,
      })),
      ...recipes.map((r) => ({
        type: "recipe" as const,
        date: toMillis(r.createdAt),
        patientName: r.patientName,
      })),
    ];

    // Filtrar atendimentos da semana
    const weekAttendances = allAttendances.filter(
      (attendance) => attendance.date >= startMillis && attendance.date <= endMillis
    );

    // Agrupar por dia
    const weekDays = getWeekDays();
    const attendancesByDay = weekDays.map((day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dayAttendances = weekAttendances.filter((attendance) => {
        const attendanceDate = new Date(attendance.date);
        return attendanceDate >= dayStart && attendanceDate <= dayEnd;
      });

      return {
        day,
        date: formatDate(day),
        dayName: getDayName(day),
        count: dayAttendances.length,
        prescriptions: dayAttendances.filter((a) => a.type === "prescription")
          .length,
        recipes: dayAttendances.filter((a) => a.type === "recipe").length,
      };
    });

    return attendancesByDay;
  };

  const weekAttendances = getWeekAttendances();
  const totalWeekAttendances = weekAttendances.reduce(
    (sum, day) => sum + day.count,
    0
  );
  const averageDailyAttendances =
    weekAttendances.length > 0
      ? (totalWeekAttendances / weekAttendances.length).toFixed(1)
      : "0";

  // Dia com mais atendimentos
  const dayWithMostAttendances = weekAttendances.length > 0
    ? weekAttendances.reduce(
        (max, day) => (day.count > max.count ? day : max),
        weekAttendances[0]
      )
    : null;

  // Total de atendimentos (prescrições + receitas)
  const totalAttendances = prescriptions.length + recipes.length;

  // Pacientes únicos atendidos
  const uniquePatientsAttended = new Set([
    ...prescriptions.map((p) => p.patientId),
    ...recipes.map((r) => r.patientId),
  ]).size;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="reports-container">
          <div className="header-section">
            <h2>Relatórios</h2>
            <p className="subtitle">
              Visualize estatísticas detalhadas sobre seus pacientes e
              atendimentos
            </p>
          </div>

          {loading ? (
            <div className="loading-message">Carregando dados...</div>
          ) : (
            <>
              {/* Cards de Estatísticas Principais */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon patients">
                    <Users size={28} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{patients.length}</div>
                    <div className="stat-label">Pacientes Cadastrados</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon attendances">
                    <Activity size={28} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{totalAttendances}</div>
                    <div className="stat-label">Total de Atendimentos</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon prescriptions">
                    <FileText size={28} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{prescriptions.length}</div>
                    <div className="stat-label">Prescrições</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon recipes">
                    <BookMarked size={28} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{recipes.length}</div>
                    <div className="stat-label">Receitas</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon week">
                    <Calendar size={28} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{totalWeekAttendances}</div>
                    <div className="stat-label">Atendimentos nesta Semana</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon average">
                    <TrendingUp size={28} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{averageDailyAttendances}</div>
                    <div className="stat-label">Média Diária (Semana)</div>
                  </div>
                </div>
              </div>

              {/* Atendimentos da Semana */}
              <div className="week-section">
                <h3>
                  <Calendar size={20} />
                  Atendimentos da Semana
                </h3>
                <p className="week-period">
                  {formatDate(getStartOfWeek(new Date()))} até{" "}
                  {formatDate(getEndOfWeek(new Date()))}
                </p>

                <div className="week-attendances">
                  {weekAttendances.map((dayData, index) => (
                    <div key={index} className="day-card">
                      <div className="day-header">
                        <span className="day-name">{dayData.dayName}</span>
                        <span className="day-date">{dayData.date}</span>
                      </div>
                      <div className="day-stats">
                        <div className="day-stat">
                          <span className="day-stat-label">Total:</span>
                          <span className="day-stat-value">{dayData.count}</span>
                        </div>
                        <div className="day-stat">
                          <span className="day-stat-label">Prescrições:</span>
                          <span className="day-stat-value">
                            {dayData.prescriptions}
                          </span>
                        </div>
                        <div className="day-stat">
                          <span className="day-stat-label">Receitas:</span>
                          <span className="day-stat-value">
                            {dayData.recipes}
                          </span>
                        </div>
                      </div>
                      {dayData.count > 0 && (
                        <div className="day-bar">
                          <div
                            className="day-bar-fill"
                            style={{
                              width: `${
                                (dayData.count /
                                  Math.max(
                                    ...weekAttendances.map((d) => d.count),
                                    1
                                  )) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="additional-info">
                <div className="info-card">
                  <BarChart3 size={24} />
                  <div className="info-content">
                    <h4>Pacientes Únicos Atendidos</h4>
                    <p>{uniquePatientsAttended} pacientes diferentes</p>
                  </div>
                </div>

                {dayWithMostAttendances && dayWithMostAttendances.count > 0 && (
                  <div className="info-card">
                    <TrendingUp size={24} />
                    <div className="info-content">
                      <h4>Dia com Mais Atendimentos</h4>
                      <p>
                        {dayWithMostAttendances.dayName} ({dayWithMostAttendances.date})
                        com {dayWithMostAttendances.count} atendimentos
                      </p>
                    </div>
                  </div>
                )}

                <div className="info-card">
                  <FileText size={24} />
                  <div className="info-content">
                    <h4>Taxa de Prescrições vs Receitas</h4>
                    <p>
                      {totalAttendances > 0
                        ? `${((prescriptions.length / totalAttendances) * 100).toFixed(1)}%`
                        : "0%"}{" "}
                      prescrições |{" "}
                      {totalAttendances > 0
                        ? `${((recipes.length / totalAttendances) * 100).toFixed(1)}%`
                        : "0%"}{" "}
                      receitas
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Reports;

