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
} from "firebase/firestore";
import Header from "../Navegacao/Header";
import Sidebar from "../Navegacao/Sidebar";
import "./PrescriptionForm.css";

import html2pdf from "html2pdf.js";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";

type Patient = {
  id: string;
  name: string;
  dateOfBirth?: string;
  cpf?: string;
};

type PrescriptionData = {
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
};

const PrescriptionForm: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorName, setDoctorName] = useState<string>("");
  const [doctorCrm, setDoctorCrm] = useState<string>("");
  const [doctorCrmUf, setDoctorCrmUf] = useState<string>("");
  const [doctorPhone, setDoctorPhone] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState<PrescriptionData>({
    patientId: "",
    patientName: "",
    medications: [
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ],
    observations: "",
  });

  // Busca a lista de pacientes do médico atual
  useEffect(() => {
    const fetchPatients = async () => {
      const user = auth.currentUser;
      if (!user) return;
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
    fetchPatients();
    // Busca o nome completo do médico para incluir no topo da prescrição
    const fetchDoctorName = async () => {
      const user = auth.currentUser;
      if (!user) return;
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
        console.error("Erro ao buscar nome do médico:", err);
      }
    };
    fetchDoctorName();
  }, []);

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

  const handleSelectPatient = (patient: Patient) => {
    setFormData((prev) => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name,
    }));
    setSearchTerm(patient.name + (patient.cpf ? ` - ${patient.cpf}` : ""));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");
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
      await addDoc(collection(db, "prescriptions"), {
        ...formData,
        doctorId: user.uid,
        createdAt: serverTimestamp(),
      });
      // Após salvar, perguntar ao usuário o que deseja fazer
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
        await handleDownloadPDF(); // <-- AGORA espera terminar
        setFormData({
          patientId: "",
          patientName: "",
          medications: [
            {
              name: "",
              dosage: "",
              frequency: "",
              duration: "",
              instructions: "",
            },
          ],
          observations: "",
        });
        setSearchTerm("");
      } else if (result.isDenied) {
        // Baixar DOCX
        await handleDownloadDOC();
        setFormData({
          patientId: "",
          patientName: "",
          medications: [
            {
              name: "",
              dosage: "",
              frequency: "",
              duration: "",
              instructions: "",
            },
          ],
          observations: "",
        });
        setSearchTerm("");
      } else {
        // Registrar nova prescrição (limpar formulário e permanecer na página)
        setFormData({
          patientId: "",
          patientName: "",
          medications: [
            {
              name: "",
              dosage: "",
              frequency: "",
              duration: "",
              instructions: "",
            },
          ],
          observations: "",
        });
        setSearchTerm("");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar prescrição"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exportar PDF
  // Exportar PDF
  const handleDownloadPDF = async () => {
    const element = document.getElementById("prescription-content");
    if (!element) return;

    await new Promise((resolve) => setTimeout(resolve, 100)); // pequena pausa

    return html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${formData.patientName}_prescricao.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 3, scrollY: -window.scrollY },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  };

  // Exportar DOCX
  const handleDownloadDOC = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${doctorName || ""}`, bold: true }),
                new TextRun({ text: "\nMédico Responsável", break: 1 }),
                new TextRun({
                  text: `${
                    doctorCrm
                      ? `CRM ${doctorCrm}${
                          doctorCrmUf ? `-${doctorCrmUf}` : ""
                        }`
                      : ""
                  }`,
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "\nAssinatura: _________________________________",
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Paciente: ${formData.patientName}`,
                  bold: true,
                }),
              ],
            }),
            ...formData.medications.map(
              (med, i) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Medicamento ${i + 1}: ${med.name}, Dosagem: ${
                        med.dosage
                      }, Frequência: ${med.frequency}, Duração: ${
                        med.duration
                      }`,
                      break: 1,
                    }),
                    new TextRun({
                      text: `Instruções: ${med.instructions}`,
                      break: 1,
                    }),
                  ],
                })
            ),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Observações: ${formData.observations}`,
                  break: 1,
                }),
              ],
            }),
            // Rodapé com assinatura do médico (espaço reservado)
            new Paragraph({
              children: [
                new TextRun({ text: "\n" }),
                new TextRun({ text: `${doctorName || ""}`, bold: true }),
                new TextRun({
                  text: `${
                    doctorCrm
                      ? `CRM ${doctorCrm}${
                          doctorCrmUf ? `-${doctorCrmUf}` : ""
                        }`
                      : ""
                  }`,
                  break: 1,
                }),
                new TextRun({
                  text: "\nAssinatura: _________________________________",
                  break: 1,
                }),
              ],
            }),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${formData.patientName}_prescricao.docx`);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="prescription-container">
          <h2>Nova Prescrição</h2>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="prescription-form">
            <div id="prescription-content">
              {/* Cabeçalho da prescrição: médico e assinatura */}
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
              {/* Autocomplete de pacientes */}
              <div className="form-group autocomplete">
                <label>Paciente*</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    setFormData((prev) => ({
                      ...prev,
                      patientId: "",
                      patientName: "",
                    }));
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
                  setFormData({
                    patientId: "",
                    patientName: "",
                    medications: [
                      {
                        name: "",
                        dosage: "",
                        frequency: "",
                        duration: "",
                        instructions: "",
                      },
                    ],
                    observations: "",
                  });
                  setSearchTerm("");

                  Swal.fire({
                    icon: "info",
                    title: "Campos limpos",
                    text: "Todos os campos foram redefinidos.",
                    confirmButtonText: "Ok",
                  });
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
              >
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadDOC}
                className="btn-secondary"
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
