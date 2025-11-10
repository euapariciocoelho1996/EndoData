import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import Header from "../Navegacao/Header";
import Sidebar from "../Navegacao/Sidebar";
import Swal from "sweetalert2";
import {
  Edit2,
  Trash2,
  Save,
  X,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Droplet,
  AlertTriangle,
  FileText,
} from "lucide-react";
import "./PacienteDetalhe.css";

type PatientData = {
  id: string;
  name: string;
  dateOfBirth: string;
  cpf: string;
  phone: string;
  email: string;
  district: string;
  city: string;
  state: string;
  gender: string;
  bloodType: string;
  allergies: string;
  conditions: string;
  doctorId: string;
  createdAt?: unknown;
};

const PacienteDetalhe: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [formData, setFormData] = useState<PatientData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados do paciente
  useEffect(() => {
    const fetchPatient = async () => {
      if (!patientId) {
        setLoading(false);
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/");
          return;
        }

        const patientDocRef = doc(db, "patients", patientId);
        const patientSnap = await getDoc(patientDocRef);

        if (!patientSnap.exists()) {
          Swal.fire({
            title: "Paciente não encontrado",
            text: "O paciente solicitado não existe.",
            icon: "error",
            confirmButtonText: "Voltar",
          }).then(() => navigate("/PatientList"));
          return;
        }

        const data = patientSnap.data() as Omit<PatientData, "id">;

        // Verificar se o paciente pertence ao médico logado
        if (data.doctorId !== user.uid) {
          Swal.fire({
            title: "Acesso negado",
            text: "Você não tem permissão para acessar este paciente.",
            icon: "error",
            confirmButtonText: "Voltar",
          }).then(() => navigate("/PatientList"));
          return;
        }

        const patientData: PatientData = {
          id: patientSnap.id,
          ...data,
        };

        // Converter dateOfBirth para formato de input date (YYYY-MM-DD)
        if (patientData.dateOfBirth) {
          const date = new Date(patientData.dateOfBirth);
          if (!isNaN(date.getTime())) {
            patientData.dateOfBirth = date.toISOString().split("T")[0];
          }
        }

        setPatient(patientData);
        setFormData(patientData);
      } catch (err) {
        console.error("Erro ao buscar paciente:", err);
        setError("Erro ao carregar dados do paciente");
        Swal.fire({
          title: "Erro",
          text: "Não foi possível carregar os dados do paciente.",
          icon: "error",
          confirmButtonText: "OK",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId, navigate]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    if (!formData) return;
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    if (patient) {
      setFormData({ ...patient });
      setIsEditing(false);
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!formData || !patientId) return;

    setError(null);
    setIsSaving(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");

      // Validações
      if (
        !formData.name.trim() ||
        !formData.cpf.trim() ||
        !formData.dateOfBirth
      ) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const cpfClean = formData.cpf.replace(/\D/g, "");
      if (cpfClean.length !== 11) {
        throw new Error("CPF inválido");
      }

      // Preparar dados para atualização
      const updateData = {
        ...formData,
        cpf: cpfClean,
        doctorId: user.uid, // Garantir que o doctorId não seja alterado
      };

      // Remover o id dos dados de atualização
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...dataToUpdate } = updateData;

      const patientDocRef = doc(db, "patients", patientId);
      await updateDoc(patientDocRef, dataToUpdate);

      // Atualizar estado local
      setPatient(updateData);
      setIsEditing(false);

      // Mostrar SweetAlert de sucesso
      await Swal.fire({
        title: "Paciente atualizado!",
        text: "Os dados do paciente foram alterados com sucesso.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar paciente";
      setError(errorMessage);
      Swal.fire({
        title: "Erro",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!patientId) return;

    const result = await Swal.fire({
      title: "Tem certeza?",
      text: "Esta ação não pode ser desfeita! O paciente será excluído permanentemente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const patientDocRef = doc(db, "patients", patientId);
        await deleteDoc(patientDocRef);

        await Swal.fire({
          title: "Paciente excluído!",
          text: "O paciente foi excluído com sucesso.",
          icon: "success",
          confirmButtonText: "OK",
        });

        navigate("/PatientList");
      } catch (err) {
        console.error("Erro ao excluir paciente:", err);
        Swal.fire({
          title: "Erro",
          text: "Não foi possível excluir o paciente.",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    }
  };

  // Formatar CPF para exibição
  const formatCPF = (cpf: string) => {
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return cpf;
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // Formatar telefone para exibição
  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (clean.length === 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    if (!dateString) return "Não informado";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Data inválida";
    return date.toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="main-content">
          <Header />
          <div className="patient-detail-container">
            <div className="loading-message">
              Carregando dados do paciente...
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!patient || !formData) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="main-content">
          <Header />
          <div className="patient-detail-container">
            <div className="error-message">Paciente não encontrado.</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="patient-detail-container">
          <div className="patient-detail-header">
            <div className="header-left">
              <h2>
                <User size={28} />
                {isEditing ? "Editar Paciente" : "Detalhes do Paciente"}
              </h2>
              <p className="patient-name">{patient.name}</p>
            </div>
            <div className="header-actions">
              {!isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="btn-edit"
                  >
                    <Edit2 size={18} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="btn-delete"
                  >
                    <Trash2 size={18} />
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/PatientList")}
                    className="btn-secondary"
                  >
                    Voltar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-secondary"
                    disabled={isSaving}
                  >
                    <X size={18} />
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="btn-save"
                    disabled={isSaving}
                  >
                    <Save size={18} />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </button>
                </>
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="patient-detail-content">
            <div className="detail-section">
              <h3 className="section-title">
                <User size={20} />
                Informações Pessoais
              </h3>
              <div className="detail-grid">
                <div className="detail-field">
                  <label>Nome Completo *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="detail-value">{patient.name}</div>
                  )}
                </div>

                <div className="detail-field">
                  <label>
                    <Calendar size={16} />
                    Data de Nascimento *
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      required
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="detail-value">
                      {formatDate(patient.dateOfBirth)}
                    </div>
                  )}
                </div>

                <div className="detail-field">
                  <label>CPF *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      required
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="detail-value">{formatCPF(patient.cpf)}</div>
                  )}
                </div>

                <div className="detail-field">
                  <label>
                    <Phone size={16} />
                    Telefone
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="detail-value">
                      {patient.phone
                        ? formatPhone(patient.phone)
                        : "Não informado"}
                    </div>
                  )}
                </div>

                <div className="detail-field">
                  <label>
                    <Mail size={16} />
                    E-mail
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="detail-value">
                      {patient.email || "Não informado"}
                    </div>
                  )}
                </div>

                <div className="detail-field">
                  <label>Sexo</label>
                  {isEditing ? (
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      disabled={isSaving}
                    >
                      <option value="">Selecione</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  ) : (
                    <div className="detail-value">
                      {patient.gender || "Não informado"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="section-title">
                <MapPin size={20} />
                Endereço
              </h3>
              <div className="detail-grid">
                <div className="detail-field">
                  <label>Bairro</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="detail-value">
                      {patient.district || "Não informado"}
                    </div>
                  )}
                </div>

                <div className="detail-field">
                  <label>Cidade</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="detail-value">
                      {patient.city || "Não informado"}
                    </div>
                  )}
                </div>

                <div className="detail-field">
                  <label>Estado</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="detail-value">
                      {patient.state || "Não informado"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="section-title">
                <Droplet size={20} />
                Informações Médicas
              </h3>
              <div className="detail-grid">
                <div className="detail-field">
                  <label>Tipo Sanguíneo</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="bloodType"
                      value={formData.bloodType}
                      onChange={handleChange}
                      placeholder="Ex: O+, A-"
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="detail-value">
                      {patient.bloodType || "Não informado"}
                    </div>
                  )}
                </div>

                <div className="detail-field full-width">
                  <label>
                    <AlertTriangle size={16} />
                    Alergias
                  </label>
                  {isEditing ? (
                    <textarea
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      rows={3}
                      disabled={isSaving}
                      placeholder="Liste as alergias do paciente..."
                    />
                  ) : (
                    <div className="detail-value">
                      {patient.allergies || "Nenhuma alergia registrada"}
                    </div>
                  )}
                </div>

                <div className="detail-field full-width">
                  <label>
                    <FileText size={16} />
                    Condições Pré-existentes
                  </label>
                  {isEditing ? (
                    <textarea
                      name="conditions"
                      value={formData.conditions}
                      onChange={handleChange}
                      rows={3}
                      disabled={isSaving}
                      placeholder="Liste as condições pré-existentes..."
                    />
                  ) : (
                    <div className="detail-value">
                      {patient.conditions || "Nenhuma condição registrada"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PacienteDetalhe;
