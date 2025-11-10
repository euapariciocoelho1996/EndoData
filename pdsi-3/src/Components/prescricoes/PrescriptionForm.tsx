import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc as firestoreDoc,
  getDoc,
  // Se quiser ordenar as clínicas, descomente e use no query
  // orderBy,
} from "firebase/firestore";
import Header from "../Navegacao/Header";
import Sidebar from "../Navegacao/Sidebar";
import "./PrescriptionForm.css";

// Utilitários de exportação
import html2pdf from "html2pdf.js";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";

// --- 1. INTERFACE PARA CLÍNICAS ---
type Clinic = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
};

// --- INTERFACE PARA PACIENTE ---
type Patient = {
  id: string;
  name: string;
  dateOfBirth?: string;
  cpf?: string;
};

// --- 2. TIPO DE DADOS DA PRESCRIÇÃO ATUALIZADO ---
type PrescriptionData = {
  patientId: string;
  patientName: string;

  // Novos campos para o local
  clinicId: string;
  clinicInfo?: {
    name: string;
    address: string;
    phone: string;
  };

  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
  observations: string;
};

const PrescriptionForm: React.FC = () => {
  // States de controle
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States de dados
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]); // <-- NOVO STATE

  // States do Doutor
  const [doctorName, setDoctorName] = useState<string>("");
  const [doctorCrm, setDoctorCrm] = useState<string>("");
  const [doctorCrmUf, setDoctorCrmUf] = useState<string>("");
  const [doctorPhone, setDoctorPhone] = useState<string>("");

  // States do formulário
  const [searchTerm, setSearchTerm] = useState("");

  // --- 4. ESTADO INICIAL DO FORM ATUALIZADO ---
  const getInitialFormData = (): PrescriptionData => ({
    patientId: "",
    patientName: "",
    clinicId: "", // Resetado
    clinicInfo: undefined, // Resetado
    medications: [
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ],
    observations: "",
  });

  const [formData, setFormData] = useState<PrescriptionData>(
    getInitialFormData()
  );

  // --- 5. FUNÇÕES DE BUSCA (HOOKS) ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Função para buscar pacientes
    const fetchPatients = async () => {
      try {
        const q = query(
          collection(db, "patients"),
          where("doctorId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const patientsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Patient[];
        setPatients(patientsList);
      } catch (err) {
        console.error("Erro ao buscar pacientes:", err);
        setError("Erro ao carregar lista de pacientes");
      }
    };

    // Função para buscar dados do médico
    const fetchDoctorData = async () => {
      try {
        const d = await getDoc(firestoreDoc(db, "doctors", user.uid));
        if (d.exists()) {
          const data = d.data() as {
            phone: string;
            name?: string;
            crm?: string;
            crmUf?: string;
          };
          setDoctorName(data.name || user.displayName || "");
          setDoctorCrm((data.crm || "").toString());
          setDoctorCrmUf((data.crmUf || "").toString());
          setDoctorPhone((data.phone || "").toString());
        } else {
          setDoctorName(user.displayName || "");
        }
      } catch (err) {
        console.error("Erro ao buscar dados do médico:", err);
      }
    };

    // --- NOVA FUNÇÃO PARA BUSCAR AS CLÍNICAS ---
    const fetchClinics = async () => {
      try {
        const clinicsRef = collection(db, "doctors", user.uid, "clinics");
        // Se quiser ordenar: const q = query(clinicsRef, orderBy("name", "asc"));
        const querySnapshot = await getDocs(clinicsRef);
        const clinicsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Clinic[];
        setClinics(clinicsList);
      } catch (err) {
        console.error("Erro ao buscar clínicas:", err);
        // Não é um erro crítico, não precisa mostrar ao usuário
      }
    };

    // Chama todas as funções de busca
    fetchPatients();
    fetchDoctorData();
    fetchClinics();
  }, []); // Executa apenas uma vez na montagem

  // --- FUNÇÕES DE FILTRO E SELEÇÃO ---

  // Filtra pacientes por similaridade
  const filteredPatients = patients
    .map((p) => {
      const name = p.name.toLowerCase();
      const term = searchTerm.toLowerCase();
      const cpf = p.cpf?.replace(/\D/g, "") || "";
      const numericTerm = term.replace(/\D/g, "");

      let score = 0;
      if (name.startsWith(term)) score += 100;
      else if (name.includes(term)) score += 50;
      if (cpf.startsWith(numericTerm)) score += 80;

      return { ...p, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);

  // Seleciona o paciente da lista
  const handleSelectPatient = (patient: Patient) => {
    setFormData((prev) => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name,
    }));
    setSearchTerm(patient.name + (patient.cpf ? ` - ${patient.cpf}` : ""));
  };

  // --- FUNÇÕES DE MANIPULAÇÃO DO FORM ---

  const handleAddMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [
        ...prev.medications,
        { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
      ],
    }));
  };

  const handleRemoveMedication = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const handleMedicationChange = (
    index: number,
    field: keyof PrescriptionData["medications"][0],
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      ),
    }));
  };

  // Limpa o formulário
  const resetForm = () => {
    setFormData(getInitialFormData());
    setSearchTerm("");
  };

  // --- SUBMISSÃO PRINCIPAL ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");

      // --- VALIDAÇÕES ---
      if (!formData.clinicId)
        throw new Error("Selecione um local de atendimento");

      if (!formData.patientId || !formData.patientName.trim())
        throw new Error("Selecione um paciente");

      if (formData.medications.length === 0)
        throw new Error("Adicione pelo menos um medicamento");

      formData.medications.forEach((med, i) => {
        if (!med.name || !med.dosage || !med.frequency)
          throw new Error(
            `Preencha os campos obrigatórios do medicamento ${i + 1}`
          );
      });

      // --- SALVA NO FIRESTORE ---
      await addDoc(collection(db, "prescriptions"), {
        ...formData, // O formData JÁ TEM clinicId e clinicInfo
        doctorId: user.uid,
        createdAt: serverTimestamp(),
      });

      // --- PERGUNTA O PRÓXIMO PASSO ---
      const result = await Swal.fire({
        title: "Prescrição salva",
        text: "Deseja baixar a prescrição ou registrar uma nova?",
        icon: "success",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Baixar PDF",
        denyButtonText: "Baixar DOCX",
        cancelButtonText: "Registrar nova prescrição",
      });

      if (result.isConfirmed) {
        await handleDownloadPDF();
        resetForm(); // Limpa o form após baixar
      } else if (result.isDenied) {
        await handleDownloadDOC();
        resetForm(); // Limpa o form após baixar
      } else {
        // (result.isDismissed) -> Clicou em "Registrar nova"
        resetForm();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar prescrição"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FUNÇÕES DE EXPORTAÇÃO ---
  // (Elas ainda usam o clinicInfo que está salvo no state,
  // por isso os downloads ainda funcionarão com os dados da clínica)

  const handleDownloadPDF = async () => {
    const element = document.getElementById("prescription-content");
    if (!element) return;

    // --- ESTA É A MUDANÇA: Adiciona/Remove a classe ANTES de gerar o PDF ---
    element.classList.add("exporting-pdf"); // Adiciona classe para mostrar a clínica

    await new Promise((resolve) => setTimeout(resolve, 100)); // pausa para renderizar

    const pdfPromise = html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${formData.patientName}_prescricao.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 3, scrollY: -window.scrollY },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();

    await pdfPromise; // Espera o PDF salvar

    element.classList.remove("exporting-pdf"); // Remove a classe depois
    return pdfPromise;
  };

  // Copie e cole esta função inteira sobre a sua versão antiga
  const handleDownloadDOC = async () => {
    const { patientName, observations, clinicInfo } = formData;
    const medications = formData.medications ?? [];

    // --- 1. CORREÇÃO DA FUNÇÃO formatPhone ---
    // A sua função estava retornando literais "$1", "$2"
    const formatPhone = (phone: string) => {
      if (!phone) return "";
      // Remove non-digits and try to match
      const match = phone.replace(/\D/g, "").match(/^(\d{2})(\d{5})(\d{4})$/);
      // Use os grupos capturados (match[1], match[2], match[3])
      return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
    };

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // --- 2. CORREÇÃO DO CABEÇALHO COM QUEBRAS DE LINHA (break: 1) ---
            new Paragraph({
              alignment: "center",
              spacing: { after: 200 },
              children: [
                // Info da Clínica (se existir)
                ...(clinicInfo
                  ? [
                      new TextRun({
                        text: clinicInfo.name,
                        bold: true,
                        size: 28,
                      }),
                      ...(clinicInfo.address
                        ? [
                            new TextRun({ break: 1 }), // Quebra de linha
                            new TextRun({
                              text: clinicInfo.address,
                              size: 22,
                            }),
                          ]
                        : []),
                      ...(clinicInfo.phone
                        ? [
                            new TextRun({ break: 1 }), // Quebra de linha
                            new TextRun({
                              text: formatPhone(clinicInfo.phone),
                              size: 22,
                            }),
                          ]
                        : []),
                      new TextRun({ break: 1 }), // Espaçamento (\n\n)
                      new TextRun({ break: 1 }), // Espaçamento (\n\n)
                    ]
                  : []),

                // Info do Doutor
                new TextRun({
                  // A quebra de linha já foi tratada acima
                  text: doctorName || "",
                  bold: true,
                  size: 26,
                }),
                new TextRun({ break: 1 }), // Quebra de linha
                new TextRun({
                  text: `CRM ${doctorCrm || ""}${
                    doctorCrmUf ? `-${doctorCrmUf}` : ""
                  }`,
                  size: 22,
                }),
                ...(doctorPhone
                  ? [
                      new TextRun({ break: 1 }), // Quebra de linha
                      new TextRun({
                        text: `Tel: ${formatPhone(doctorPhone)}`,
                        size: 22,
                      }),
                    ]
                  : []),
              ],
            }),

            // --- O RESTO DO DOCUMENTO (também corrigido) ---

            new Paragraph({ text: "", spacing: { after: 300 } }),

            // Paciente
            new Paragraph({
              children: [
                new TextRun({ text: `Paciente: `, bold: true }),
                new TextRun(patientName || ""),
              ],
            }),

            new Paragraph({ text: "", spacing: { after: 200 } }),

            // Lista de medicamentos (corrigido com breaks)
            ...medications.flatMap((med, i) => [
              new Paragraph({
                spacing: { after: 150 },
                children: [
                  new TextRun({
                    text: `${i + 1}. ${med.name || ""} - ${med.dosage || ""}`,
                    bold: true,
                  }),
                  new TextRun({ break: 1 }), // Quebra de linha
                  new TextRun({
                    text: `Frequência: ${med.frequency || ""}${
                      med.duration ? ` | Duração: ${med.duration}` : ""
                    }`,
                  }),
                  ...(med.instructions
                    ? [
                        new TextRun({ break: 1 }), // Quebra de linha
                        new TextRun({
                          text: `Instruções: ${med.instructions}`,
                        }),
                      ]
                    : []),
                ],
              }),
            ]),

            // Observações (corrigido com breaks)
            ...(observations
              ? [
                  new Paragraph({
                    spacing: { before: 300 },
                    children: [
                      new TextRun({ text: "Observações:", bold: true }),
                      new TextRun({ break: 1 }), // Quebra de linha
                      new TextRun(observations),
                    ],
                  }),
                ]
              : []),

            // Assinatura (corrigido com breaks)
            new Paragraph({ text: "", spacing: { before: 800 } }),
            new Paragraph({
              alignment: "center",
              children: [
                new TextRun("____________________________________________"),
                new TextRun({ break: 1 }), // Quebra de linha
                new TextRun({ break: 1 }), // Quebra de linha
                new TextRun({
                  text: `${doctorName || ""} - CRM ${doctorCrm || ""}${
                    doctorCrmUf ? `-${doctorCrmUf}` : ""
                  }`,
                }),
              ],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${patientName || "prescricao"}_prescricao.docx`);
  };

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />{" "}
        {/* userName é pego automaticamente pelo Header agora? Se não, passe a prop */}
        <div className="prescription-container">
          <h2>Nova Prescrição</h2>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="prescription-form">
            {/* Div que será usada para o PDF */}
            <div id="prescription-content">
              <div className="prescription-header">
                <div className="doctor-info">
                  <strong>{doctorName || ""}</strong>
                  <div className="doctor-crm">
                    {doctorCrm
                      ? `CRM ${doctorCrm}${
                          doctorCrmUf ? `-${doctorCrmUf}` : ""
                        }`
                      : ""}
                  </div>
                  <div className="doctor-phone">
                    {doctorPhone
                      ? `Tel: ${doctorPhone.replace(
                          /(\d{2})(\d{5})(\d{4})/,
                          "($1) $2-$3"
                        )}`
                      : ""}
                  </div>
                  <div className="doctor-title">Médico Responsável</div>
                </div>

                <div className="signature-area">
                  <div className="signature-label">Assinatura do Médico</div>
                  <div className="signature-box" />
                </div>
              </div>

              {/* --- CAMPO NOVO: SELETOR DE CLÍNICA --- */}
              <div className="form-group">
                <label>Local de Atendimento*</label>
                <select
                  value={formData.clinicId}
                  onChange={(e) => {
                    const clinicId = e.target.value;
                    const selectedClinic = clinics.find(
                      (c) => c.id === clinicId
                    );

                    setFormData((prev) => ({
                      ...prev,
                      clinicId: clinicId,
                      // Armazena a info para o PDF/DOCX
                      clinicInfo: selectedClinic
                        ? {
                            name: selectedClinic.name,
                            address: selectedClinic.address || "",
                            phone: selectedClinic.phone || "",
                          }
                        : undefined,
                    }));
                  }}
                  required
                >
                  <option value="">Selecione um local</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}{" "}
                      {clinic.address ? `(${clinic.address})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Autocomplete de pacientes */}
              <div className="form-group autocomplete">
                <label>Paciente*</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    // Limpa o paciente selecionado se o usuário digitar
                    if (formData.patientId) {
                      setFormData((prev) => ({
                        ...prev,
                        patientId: "",
                        patientName: "",
                      }));
                    }
                  }}
                  placeholder="Digite o nome ou CPF"
                  autoComplete="off"
                  required
                />
                {searchTerm &&
                  filteredPatients.length > 0 &&
                  !formData.patientId && (
                    <ul className="autocomplete-list">
                      {filteredPatients.map((patient) => (
                        <li
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className="autocomplete-item"
                        >
                          {patient.name}{" "}
                          {patient.cpf ? ` - ${patient.cpf}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>

              {/* Medicamentos */}
              <div className="medications-section">
                <h3>Medicamentos</h3>
                {formData.medications.map((med, index) => (
                  <div key={index} className="medication-card">
                    <div className="medication-header">
                      <h4>Medicamento {index + 1}</h4>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(index)}
                          className="btn-remove"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <div className="medication-grid">
                      {/* Nome */}
                      <div className="form-group">
                        <label>Nome do Medicamento*</label>
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) =>
                            handleMedicationChange(
                              index,
                              "name",
                              e.target.value
                            )
                          }
                          required
                        />
                      </div>
                      {/* Dosagem */}
                      <div className="form-group">
                        <label>Dosagem*</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) =>
                            handleMedicationChange(
                              index,
                              "dosage",
                              e.target.value
                            )
                          }
                          placeholder="Ex: 500mg"
                          required
                        />
                      </div>
                      {/* Frequência */}
                      <div className="form-group">
                        <label>Frequência*</label>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) =>
                            handleMedicationChange(
                              index,
                              "frequency",
                              e.target.value
                            )
                          }
                          placeholder="Ex: 8 em 8 horas"
                          required
                        />
                      </div>
                      {/* Duração */}
                      <div className="form-group">
                        <label>Duração</label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) =>
                            handleMedicationChange(
                              index,
                              "duration",
                              e.target.value
                            )
                          }
                          placeholder="Ex: 7 dias"
                        />
                      </div>
                      {/* Instruções */}
                      <div className="form-group full-width">
                        <label>Instruções</label>
                        <textarea
                          value={med.instructions}
                          onChange={(e) =>
                            handleMedicationChange(
                              index,
                              "instructions",
                              e.target.value
                            )
                          }
                          placeholder="Ex: Tomar após as refeições"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="btn-add"
                >
                  + Adicionar Medicamento
                </button>
              </div>

              {/* Observações */}
              <div className="form-group">
                <label>Observações</label>
                <textarea
                  value={formData.observations}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      observations: e.target.value,
                    }))
                  }
                  placeholder="Observações adicionais sobre a prescrição"
                />
              </div>
            </div>

            {/* Botões de ação */}
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  Swal.fire(
                    "Campos limpos",
                    "Todos os campos foram redefinidos.",
                    "info"
                  );
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Salvando..." : "Salvar Prescrição"}
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="btn-secondary"
                disabled={!formData.patientId} // Desabilita se não houver paciente
              >
                Baixar PDF
              </button>

              <button
                type="button"
                onClick={handleDownloadDOC}
                className="btn-secondary"
                disabled={!formData.patientId} // Desabilita se não houver paciente
              >
                Baixar DOCX
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default PrescriptionForm;
