import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import Header from "../Navegacao/Header";
import "./PatientForm.css";
import Sidebar from "../Navegacao/Sidebar";
import Swal from "sweetalert2";

type PatientData = {
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
};

const PatientForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Doutor");

  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user?.displayName) setUserName(user.displayName);
    else if (user?.email) setUserName(user.email.split("@")[0]);
  }, []);

  // Rolagem automática ao aparecer o erro
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [error]);

  const [formData, setFormData] = useState<PatientData>({
    name: "",
    dateOfBirth: "",
    cpf: "",
    phone: "",
    email: "",
    district: "",
    city: "",
    state: "",
    gender: "",
    bloodType: "",
    allergies: "",
    conditions: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");

      if (
        !formData.name.trim() ||
        !formData.cpf.trim() ||
        !formData.dateOfBirth
      )
        throw new Error("Preencha todos os campos obrigatórios");

      const cpfClean = formData.cpf.replace(/\D/g, "");
      if (cpfClean.length !== 11) throw new Error("CPF inválido");

      // Consultas para verificar duplicidade de CPF e e-mail
      const patientsRef = collection(db, "patients");

      const cpfQuery = query(
        patientsRef,
        where("cpf", "==", cpfClean),
        where("doctorId", "==", user.uid)
      );

      const emailQuery = formData.email
        ? query(
            patientsRef,
            where("email", "==", formData.email),
            where("doctorId", "==", user.uid)
          )
        : null;

      const [cpfSnap, emailSnap] = await Promise.all([
        getDocs(cpfQuery),
        emailQuery ? getDocs(emailQuery) : Promise.resolve(null),
      ]);

      if (!cpfSnap.empty) {
        setError("Este CPF já está cadastrado.");
        return;
      }
      if (emailSnap && !emailSnap.empty) {
        setError("Este e-mail já está cadastrado.");
        return;
      }

      await addDoc(collection(db, "patients"), {
        ...formData,
        cpf: cpfClean,
        doctorId: user.uid,
        createdAt: serverTimestamp(),
      });

      Swal.fire({
        title: "Paciente cadastrado!",
        text: "O que deseja fazer agora?",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Voltar ao início",
        cancelButtonText: "Cadastrar outro",
      }).then((result) => {
        if (result.isConfirmed) navigate("/dashboard");
        else
          setFormData({
            name: "",
            dateOfBirth: "",
            cpf: "",
            phone: "",
            email: "",
            district: "",
            city: "",
            state: "",
            gender: "",
            bloodType: "",
            allergies: "",
            conditions: "",
          });
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao cadastrar paciente"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header userName={userName} />
        <div className="form-container">
          <h2>Novo Paciente</h2>
          {error && (
            <div ref={errorRef} className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="patient-form">
            <div className="form-group">
              <label>Nome Completo*</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Data de Nascimento*</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>CPF*</label>
              <input
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
                required
              />
            </div>

            <div className="form-group">
              <label>Telefone</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>E-mail</label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Bairro</label>
              <input
                name="district"
                value={formData.district}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Cidade</label>
              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Estado</label>
              <input
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Sexo</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Selecione</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tipo Sanguíneo</label>
              <input
                name="bloodType"
                value={formData.bloodType}
                onChange={handleChange}
                placeholder="Ex: O+, A-"
              />
            </div>

            <div className="form-group">
              <label>Alergias</label>
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Condições Pré-existentes</label>
              <textarea
                name="conditions"
                value={formData.conditions}
                onChange={handleChange}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Salvando..." : "Salvar Paciente"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default PatientForm;
