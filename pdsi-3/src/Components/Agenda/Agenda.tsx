import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import Header from "../Navegacao/Header";
import Sidebar from "../Navegacao/Sidebar";
import "./Agenda.css";
import {
  Calendar,
  Clock,
  User,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
} from "lucide-react";
import Swal from "sweetalert2";

type Patient = {
  id: string;
  name: string;
  cpf?: string;
};

type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  task: string;
  doctorId: string;
  createdAt: Timestamp | null;
  notified: boolean;
  completed: boolean;
};

const Agenda: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    date: "",
    time: "",
    task: "",
  });

  // Buscar pacientes
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPatients = async () => {
      try {
        const q = query(collection(db, "patients"), where("doctorId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const patientsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Patient[];
        setPatients(patientsList);
      } catch (err) {
        console.error("Erro ao buscar pacientes:", err);
      }
    };

    fetchPatients();
  }, []);

  // Buscar agendamentos
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "appointments"), where("doctorId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Appointment, "id">;
          return { id: doc.id, ...data };
        }) as Appointment[];

        list.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA.getTime() - dateB.getTime();
        });

        setAppointments(list);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao buscar agendamentos:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtrar pacientes
  const filteredPatients = patients.filter((p) => {
    const search = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(search) || (p.cpf || "").toLowerCase().includes(search)
    );
  });

  // Filtrar agendamentos
  const filteredAppointments = appointments.filter((appointment) => {
    if (filterDate && appointment.date !== filterDate) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        appointment.patientName.toLowerCase().includes(search) ||
        appointment.task.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Selecionar paciente
  const handlePatientSelect = (patient: Patient) => {
    setFormData({ ...formData, patientId: patient.id, patientName: patient.name });
    setSearchTerm("");
  };

  // Limpar formulário
  const resetForm = () => {
    setFormData({ patientId: "", patientName: "", date: "", time: "", task: "" });
    setEditingId(null);
    setShowForm(false);
  };

  // Editar agendamento
  const handleEdit = (appointment: Appointment) => {
    setFormData({
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      date: appointment.date,
      time: appointment.time,
      task: appointment.task,
    });
    setEditingId(appointment.id);
    setShowForm(true);
  };

  // Salvar agendamento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      Swal.fire("Erro", "Usuário não autenticado", "error");
      return;
    }

    if (!formData.patientId || !formData.date || !formData.time || !formData.task) {
      Swal.fire("Erro", "Preencha todos os campos", "error");
      return;
    }

    try {
      const appointmentData = {
        patientId: formData.patientId,
        patientName: formData.patientName,
        date: formData.date,
        time: formData.time,
        task: formData.task,
        doctorId: user.uid,
        createdAt: Timestamp.now(),
        notified: false,
        completed: false,
      };

      if (editingId) {
        const existingAppointment = appointments.find((a) => a.id === editingId);
        await updateDoc(doc(db, "appointments", editingId), {
          ...appointmentData,
          createdAt: existingAppointment?.createdAt || Timestamp.now(),
        });
        Swal.fire("Sucesso", "Agendamento atualizado com sucesso!", "success");
      } else {
        await addDoc(collection(db, "appointments"), appointmentData);
        Swal.fire("Sucesso", "Agendamento criado com sucesso!", "success");
      }

      resetForm();
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      Swal.fire("Erro", "Erro ao salvar agendamento", "error");
    }
  };

  // Deletar agendamento
  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Tem certeza?",
      text: "Esta ação não pode ser desfeita!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, deletar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "appointments", id));
        Swal.fire("Deletado!", "Agendamento deletado com sucesso.", "success");
      } catch (error) {
        console.error("Erro ao deletar agendamento:", error);
        Swal.fire("Erro", "Erro ao deletar agendamento", "error");
      }
    }
  };

  // Marcar como concluído
  const handleComplete = async (appointment: Appointment) => {
    try {
      await updateDoc(doc(db, "appointments", appointment.id), { completed: true });
      Swal.fire("Sucesso", "Agendamento marcado como concluído!", "success");
    } catch (error) {
      console.error("Erro ao marcar como concluído:", error);
      Swal.fire("Erro", "Erro ao marcar como concluído", "error");
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Verificar se agendamento é hoje
  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split("T")[0];
    return dateString === today;
  };

  // Verificar se agendamento é passado
  const isPast = (dateString: string, timeString: string) => {
    const appointmentDateTime = new Date(`${dateString}T${timeString}`);
    return appointmentDateTime < new Date();
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="agenda-container">
          {/* Cabeçalho */}
          <div className="header-section">
            <h2>Agenda</h2>
            <p className="subtitle">Gerencie seus agendamentos e tarefas diárias</p>
          </div>

          {/* Botões e filtros */}
          <div className="agenda-actions">
            <button
              className="btn-primary"
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
            >
              <Plus size={18} /> {showForm ? "Cancelar" : "Novo Agendamento"}
            </button>

            <div className="filter-group">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="date-filter"
              />
              <button
                className="btn-secondary"
                onClick={() => setFilterDate("")}
                disabled={!filterDate}
              >
                Limpar Filtro
              </button>
            </div>
          </div>

          {/* Formulário */}
          {showForm && (
            <div className="appointment-form-container">
              <form onSubmit={handleSubmit} className="appointment-form">
                <h3>{editingId ? "Editar Agendamento" : "Novo Agendamento"}</h3>
                {/* Seleção de paciente */}
                <div className="form-group">
                  <label>
                    <User size={16} /> Paciente
                  </label>
                  {!formData.patientId ? (
                    <div className="patient-search">
                      <div className="search-input-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                          type="text"
                          placeholder="Buscar paciente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      {searchTerm && (
                        <div className="patient-dropdown">
                          {filteredPatients.length > 0 ? (
                            filteredPatients.map((patient) => (
                              <div
                                key={patient.id}
                                className="patient-option"
                                onClick={() => handlePatientSelect(patient)}
                              >
                                <User size={16} />
                                <span>{patient.name}</span>
                                {patient.cpf && (
                                  <span className="patient-cpf">CPF: {patient.cpf}</span>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="patient-option no-results">
                              Nenhum paciente encontrado
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="selected-patient">
                      <span>{formData.patientName}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, patientId: "", patientName: "" })}
                        className="btn-remove"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>

                {/* Data */}
                <div className="form-group">
                  <label>
                    <Calendar size={16} /> Data
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="form-input"
                    required
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {/* Horário */}
                <div className="form-group">
                  <label>
                    <Clock size={16} /> Horário
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                {/* Tarefa */}
                <div className="form-group">
                  <label>Tarefa / Observações</label>
                  <textarea
                    value={formData.task}
                    onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                    className="form-input"
                    rows={4}
                    placeholder="Descreva a tarefa ou observações do agendamento..."
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    {editingId ? "Atualizar" : "Salvar"}
                  </button>
                  <button type="button" onClick={resetForm} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de Agendamentos */}
          {loading ? (
            <div className="loading-message">Carregando agendamentos...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} />
              <p>Nenhum agendamento encontrado.</p>
              <span>
                {searchTerm || filterDate
                  ? "Tente ajustar seus filtros."
                  : "Crie seu primeiro agendamento!"}
              </span>
            </div>
          ) : (
            <div className="appointments-list">
              {filteredAppointments.map((appointment) => {
                const isPastAppointment = isPast(appointment.date, appointment.time);
                const isTodayAppointment = isToday(appointment.date);

                return (
                  <div
                    key={appointment.id}
                    className={`appointment-card ${
                      isPastAppointment ? "past" : ""
                    } ${isTodayAppointment ? "today" : ""} ${
                      appointment.completed ? "completed" : ""
                    }`}
                  >
                    <div className="appointment-header">
                      <div className="appointment-date-time">
                        <Calendar size={18} />
                        <span className="date-text">{formatDate(appointment.date)}</span>
                        <Clock size={18} />
                        <span className="time-text">{appointment.time}</span>
                      </div>
                      {appointment.completed && (
                        <span className="completed-badge">
                          <CheckCircle2 size={16} /> Concluído
                        </span>
                      )}
                      {isTodayAppointment && !appointment.completed && (
                        <span className="today-badge">Hoje</span>
                      )}
                    </div>

                    <div className="appointment-body">
                      <div className="appointment-patient">
                        <User size={16} />
                        <span>{appointment.patientName}</span>
                      </div>
                      <div className="appointment-task">
                        <p>{appointment.task}</p>
                      </div>
                    </div>

                    <div className="appointment-actions">
                      {!appointment.completed && (
                        <button
                          onClick={() => handleComplete(appointment)}
                          className="btn-icon complete"
                          title="Marcar como concluído"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(appointment)}
                        className="btn-icon edit"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(appointment.id)}
                        className="btn-icon delete"
                        title="Deletar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Agenda;
