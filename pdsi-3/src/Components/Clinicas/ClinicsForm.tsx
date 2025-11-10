import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import Swal from "sweetalert2";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc, // 1. IMPORTAR updateDoc
} from "firebase/firestore";

import "./ClinicsForm.css";
import Header from "../Navegacao/Header";
import Sidebar from "../Navegacao/Sidebar";
import { FaPen, FaTrash } from "react-icons/fa";

// Interface para tipar a clínica
interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt: Date;
}

function ClinicsForm() {
  // States do formulário principal
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");

  // States da lista
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  // State do usuário
  const [userName, setUserName] = useState<string>("Doutor");
  const user = auth.currentUser;

  // --- STATES NOVOS PARA O MODAL DE EDIÇÃO ---
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Guarda a clínica que está sendo editada
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);

  // --- Funções de Leitura (Fetch) ---
  const fetchClinics = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const clinicsRef = collection(db, "doctors", user.uid, "clinics");
      const q = query(clinicsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const list = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Clinic)
      ); // Usando a interface

      setClinics(list);
    } catch (error) {
      console.error("Erro ao buscar clínicas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchClinics();
  }, [user]);

  useEffect(() => {
    if (user?.displayName) setUserName(user.displayName);
    else if (user?.email) setUserName(user.email.split("@")[0]);
  }, [user]);

  // --- Função de Criação (Create) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!clinicName.trim()) {
      Swal.fire(
        "Campo obrigatório",
        "O nome da clínica é obrigatório.",
        "warning"
      );
      return;
    }

    try {
      const clinicsRef = collection(db, "doctors", user.uid, "clinics");
      await addDoc(clinicsRef, {
        name: clinicName,
        address: clinicAddress || null,
        phone: clinicPhone || null,
        createdAt: new Date(),
      });

      setClinicName("");
      setClinicAddress("");
      setClinicPhone("");
      fetchClinics(); // Atualiza a lista

      Swal.fire("Sucesso!", "Clínica cadastrada.", "success");
    } catch (error) {
      console.error("Erro ao cadastrar clínica:", error);
      Swal.fire("Erro", "Não foi possível salvar a clínica.", "error");
    }
  };

  // --- Função de Edição (Edit) ---
  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic); // Define a clínica atual
    setIsModalOpen(true); // Abre o modal
  };

  // --- Função de Atualização (Update) ---
  const handleUpdateClinic = async (e: React.FormEvent) => {
    e.preventDefault(); // Impede o recarregamento da página do form do modal
    if (!user || !editingClinic) return;

    const docRef = doc(db, "doctors", user.uid, "clinics", editingClinic.id);

    try {
      await updateDoc(docRef, {
        name: editingClinic.name,
        address: editingClinic.address || null,
        phone: editingClinic.phone || null,
      });

      setIsModalOpen(false); // Fecha o modal
      setEditingClinic(null); // Limpa o state de edição
      fetchClinics(); // Atualiza a lista

      Swal.fire("Sucesso!", "Clínica atualizada.", "success");
    } catch (error) {
      console.error("Erro ao atualizar clínica:", error);
      Swal.fire("Erro", "Não foi possível atualizar a clínica.", "error");
    }
  };

  // Função para fechar o modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClinic(null);
  };

  // --- Função de Exclusão (Delete) ---
  const handleDelete = (clinicId: string) => {
    if (!user) return;

    Swal.fire({
      title: "Tem certeza?",
      text: "Esta ação é irreversível!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const docRef = doc(db, "doctors", user.uid, "clinics", clinicId);
          await deleteDoc(docRef);
          Swal.fire("Excluído!", "A clínica foi removida.", "success");
          fetchClinics(); // Atualiza a lista
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          Swal.fire("Erro!", "Não foi possível excluir a clínica.", "error");
        }
      }
    });
  };

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main-content">
        <Header userName={userName} />

        <div className="form-container">
          <h2>Cadastro de Clínicas</h2>
          <p>Cadastre os locais onde você realiza atendimento.</p>

          <form onSubmit={handleSubmit} className="clinic-form">
            {/* ... seus inputs ... */}
            <div className="input-group">
              <label>Nome da Clínica</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Ex: Clínica São Gabriel"
                required
              />
            </div>
            <div className="input-group">
              <label>Endereço</label>
              <input
                type="text"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                placeholder="Rua, número, bairro..."
              />
            </div>
            <div className="input-group">
              <label>Telefone</label>
              <input
                type="tel"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
              />
            </div>
            <button type="submit" className="clinic-button">
              Salvar Clínica
            </button>
          </form>

          {/* Seção da Lista de Clínicas */}
          <h3>Clínicas Cadastradas</h3>
          {loading ? (
            <p>Carregando...</p>
          ) : clinics.length === 0 ? (
            <p>Nenhuma clínica cadastrada ainda.</p>
          ) : (
            <ul className="clinic-list">
              {clinics.map((clinic) => (
                <li key={clinic.id} className="clinic-item">
                  <div className="clinic-item-content">
                    <strong>{clinic.name}</strong>
                    {clinic.address && <p>{clinic.address}</p>}
                    {clinic.phone && <p>{clinic.phone}</p>}
                  </div>

                  <div className="clinic-item-actions">
                    <button
                      className="icon-btn icon-edit"
                      title="Editar Clínica"
                      onClick={() => handleEdit(clinic)} // Passa a clínica inteira
                    >
                      <FaPen size={14} />
                    </button>
                    <button
                      className="icon-btn icon-delete"
                      title="Excluir Clínica"
                      onClick={() => handleDelete(clinic.id)}
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* --- O MODAL DE EDIÇÃO --- */}
      {isModalOpen && editingClinic && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Editar Clínica</h2>

            {/* Usamos a classe "clinic-form" que já existe */}
            <form onSubmit={handleUpdateClinic} className="clinic-form">
              <div className="input-group">
                <label>Nome da Clínica</label>
                <input
                  type="text"
                  value={editingClinic.name}
                  onChange={(e) =>
                    setEditingClinic({ ...editingClinic, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="input-group">
                <label>Endereço</label>
                <input
                  type="text"
                  value={editingClinic.address || ""}
                  onChange={(e) =>
                    setEditingClinic({
                      ...editingClinic,
                      address: e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-group">
                <label>Telefone</label>
                <input
                  type="tel"
                  value={editingClinic.phone || ""}
                  onChange={(e) =>
                    setEditingClinic({
                      ...editingClinic,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button type="submit" className="clinic-button">
                  Salvar Mudanças
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClinicsForm;
