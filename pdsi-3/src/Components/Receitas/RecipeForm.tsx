import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import "./RecipeForm.css";
import "./Recipe.css";

import html2pdf from "html2pdf.js";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";

type Patient = {
  id: string;
  name: string;
  dateOfBirth?: string;
  cpf?: string;
  address?: string;
};

type Medication = {
  name: string;
  concentration: string;
  quantity: string;
  dosage: string;
  frequency: string;
  duration: string;
  useInstructions: string;
};

type RecipeData = {
  patientId: string;
  patientName: string;
  patientAddress: string;
  medications: Medication[];
  specialInstructions: string;
  isControlled: boolean;
  validityDays: number;
  pharmacistName: string;
  pharmacistSignatureDate: string;
  issueDate: string;
};

const RecipeForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorName, setDoctorName] = useState<string>("");
  const [doctorCrm, setDoctorCrm] = useState<string>("");
  const [doctorCrmUf, setDoctorCrmUf] = useState<string>("");
  const [doctorPhone, setDoctorPhone] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState<RecipeData>({
    patientId: "",
    patientName: "",
    patientAddress: "",
    medications: [
      {
        name: "",
        concentration: "",
        quantity: "",
        dosage: "",
        frequency: "",
        duration: "",
        useInstructions: "",
      },
    ],
    specialInstructions: "",
    isControlled: false,
    validityDays: 30, // Default validity of 30 days
    pharmacistName: "",
    pharmacistSignatureDate: "",
    issueDate: new Date().toISOString().split("T")[0],
  });

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
        const patientsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Patient[];
        setPatients(patientsData);
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error);
      }
    };

    const fetchDoctorInfo = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const doctorDoc = await getDoc(firestoreDoc(db, "doctors", user.uid));
        if (doctorDoc.exists()) {
          const data = doctorDoc.data();
          setDoctorName(data.name || "");
          setDoctorCrm(data.crm || "");
          setDoctorCrmUf(data.crmUf || "");
          setDoctorPhone(data.phone || "");
        }
      } catch (error) {
        console.error("Erro ao buscar informações do médico:", error);
      }
    };

    fetchPatients();
    fetchDoctorInfo();
  }, []);

  const handleSelectPatient = (patient: Patient) => {
    setFormData((prev) => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name,
      patientAddress: patient.address || "",
    }));
    setSearchTerm(patient.name + (patient.cpf ? ` - ${patient.cpf}` : ""));
  };

  const handleAddMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          name: "",
          concentration: "",
          quantity: "",
          dosage: "",
          frequency: "",
          duration: "",
          useInstructions: "",
        },
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
    field: keyof Medication,
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
        if (!med.name || !med.concentration || !med.quantity || !med.dosage)
          throw new Error(
            `Preencha os campos obrigatórios do medicamento ${i + 1}`
          );
      });

      const recipeData = {
        ...formData,
        doctorId: user.uid,
        doctorName,
        doctorCrm,
        doctorCrmUf,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "recipes"), recipeData);

      // SweetAlert com opções
      Swal.fire({
        title: "Receita criada com sucesso!",
        icon: "success",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Voltar ao início",
        denyButtonText: "Cadastrar nova receita",
        cancelButtonText: "Salvar como PDF / DOCX",
        allowOutsideClick: false,
      }).then((result) => {
        if (result.isConfirmed) {
          // Voltar para página inicial
          navigate("/");
        } else if (result.isDenied) {
          // Limpar formulário para nova receita
          setFormData({
            patientId: "",
            patientName: "",
            patientAddress: "",
            medications: [
              {
                name: "",
                concentration: "",
                quantity: "",
                dosage: "",
                frequency: "",
                duration: "",
                useInstructions: "",
              },
            ],
            specialInstructions: "",
            isControlled: false,
            validityDays: 30,
            pharmacistName: "",
            pharmacistSignatureDate: "",
            issueDate: new Date().toISOString().split("T")[0],
          });
          setSearchTerm("");
        } else if (result.isDismissed) {
          // Salvar PDF / DOCX
          Swal.fire({
            title: "Escolha o formato",
            showCancelButton: true,
            confirmButtonText: "PDF",
            cancelButtonText: "DOCX",
          }).then((choice) => {
            if (choice.isConfirmed) {
              handleDownloadPDF();
            } else {
              handleDownloadDOC();
            }
          });
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar receita");
      console.error("Erro ao salvar receita:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById("recipe-content");
    if (!element) return;

    html2pdf()
      .set({
        margin: 10, // mm
        filename: `${formData.patientName}_receita.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 3, scrollY: -window.scrollY },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  };

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
                new TextRun({
                  text: doctorPhone
                    ? `Tel: ${doctorPhone.replace(
                        /(\d{2})(\d{5})(\d{4})/,
                        "($1) $2-$3"
                      )}`
                    : "",
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun({ text: "\nRECEITA MÉDICA", bold: true })],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `\nPaciente: ${formData.patientName}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `\nEndereço: ${formData.patientAddress}`,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `\nData de Emissão: ${new Date(
                    formData.issueDate
                  ).toLocaleDateString()}`,
                }),
              ],
            }),
            ...formData.medications.map(
              (med, i) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `\nMedicamento ${i + 1}:`,
                      bold: true,
                      break: 1,
                    }),
                    new TextRun({
                      text: `\nNome: ${med.name}`,
                      break: 1,
                    }),
                    new TextRun({
                      text: `Concentração: ${med.concentration}`,
                      break: 1,
                    }),
                    new TextRun({
                      text: `Quantidade: ${med.quantity}`,
                      break: 1,
                    }),
                    new TextRun({
                      text: `Posologia: ${med.dosage}`,
                      break: 1,
                    }),
                    new TextRun({
                      text: `Frequência: ${med.frequency}`,
                      break: 1,
                    }),
                    new TextRun({
                      text: `Duração: ${med.duration}`,
                      break: 1,
                    }),
                    new TextRun({
                      text: `Instruções de uso: ${med.useInstructions}`,
                      break: 1,
                    }),
                  ],
                })
            ),
            new Paragraph({
              children: [
                new TextRun({
                  text: `\nInstruções Especiais: ${formData.specialInstructions}`,
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `\nValidade: ${formData.validityDays} dias`,
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "\n\n_________________________________" }),
                new TextRun({ text: `\n${doctorName}`, bold: true }),
                new TextRun({
                  text: `\nCRM ${doctorCrm}${
                    doctorCrmUf ? `-${doctorCrmUf}` : ""
                  }`,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "\n\nInformações de Dispensação:",
                  bold: true,
                }),
                new TextRun({
                  text: formData.pharmacistName
                    ? `\nFarmacêutico: ${formData.pharmacistName}`
                    : "",
                  break: 1,
                }),
                new TextRun({
                  text: "\nData da Dispensação: _____/_____/_____",
                  break: 1,
                }),
                new TextRun({ text: "\n_________________________________" }),
                new TextRun({ text: "\nAssinatura e Carimbo do Farmacêutico" }),
              ],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${formData.patientName}_receita.docx`);
  };

  const filteredPatients = searchTerm
    ? patients
        .filter(
          (patient) =>
            patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (patient.cpf &&
              patient.cpf.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => b.name.localeCompare(a.name))
    : [];

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="recipe-container">
          <h2>Nova Receita Médica</h2>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="recipe-form">
            <div id="recipe-content">
              {/* Cabeçalho da receita */}
              <div className="recipe-header">
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

              {/* Seleção de paciente */}
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

              {/* Tipo de Receita */}
              <div className="form-group">
                <label>Tipo de Receita</label>
                <div className="recipe-type">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isControlled}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isControlled: e.target.checked,
                        }))
                      }
                    />
                    <span>Medicamento Controlado</span>
                  </label>
                </div>
              </div>

              {/* Validade da Receita */}
              <div className="form-group">
                <label>Validade da Receita (dias)</label>
                <input
                  type="number"
                  value={formData.validityDays}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      validityDays: parseInt(e.target.value) || 30,
                    }))
                  }
                  min="1"
                  max="180"
                />
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
                        <label>Concentração*</label>
                        <input
                          type="text"
                          value={med.concentration}
                          onChange={(e) =>
                            handleMedicationChange(
                              index,
                              "concentration",
                              e.target.value
                            )
                          }
                          placeholder="Ex: 500mg, 10mg/mL"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Quantidade*</label>
                        <input
                          type="text"
                          value={med.quantity}
                          onChange={(e) =>
                            handleMedicationChange(
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                          placeholder="Ex: 1 caixa, 30 comprimidos"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Posologia*</label>
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
                          placeholder="Ex: 1 comprimido"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Frequência</label>
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
                        />
                      </div>
                      <div className="form-group">
                        <label>Duração do Tratamento</label>
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
                        <label>Instruções de Uso</label>
                        <textarea
                          value={med.useInstructions}
                          onChange={(e) =>
                            handleMedicationChange(
                              index,
                              "useInstructions",
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

              {/* Instruções Especiais */}
              <div className="form-group">
                <label>Instruções Especiais</label>
                <textarea
                  value={formData.specialInstructions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      specialInstructions: e.target.value,
                    }))
                  }
                  placeholder="Instruções especiais ou recomendações adicionais"
                />
              </div>

              {/* Endereço do Paciente */}
              <div className="form-group">
                <label>Endereço do Paciente</label>
                <textarea
                  value={formData.patientAddress}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      patientAddress: e.target.value,
                    }))
                  }
                  placeholder="Endereço completo do paciente"
                />
              </div>

              {/* Data de Emissão */}
              <div className="form-group">
                <label>Data de Emissão</label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      issueDate: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Informações do Farmacêutico */}
              <div className="pharmacist-section">
                <h3>Dispensação do Medicamento</h3>
                <div className="form-group">
                  <label>Nome do Farmacêutico</label>
                  <input
                    type="text"
                    value={formData.pharmacistName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pharmacistName: e.target.value,
                      }))
                    }
                    placeholder="Nome do farmacêutico responsável"
                  />
                </div>
                <div className="form-group">
                  <label>Data da Dispensação</label>
                  <div className="date-field">_____/_____/_____</div>
                </div>
                <div className="signature-area">
                  <div className="signature-label">
                    Assinatura/Carimbo do Farmacêutico
                  </div>
                  <div className="signature-box pharmacist-signature" />
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate("/recipes")}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Salvando..." : "Salvar Receita"}
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

export default RecipeForm;
