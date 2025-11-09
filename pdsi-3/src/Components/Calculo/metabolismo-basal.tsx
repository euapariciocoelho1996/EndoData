import React, { useState, useRef, useEffect } from "react"; // <-- 1. Importar useRef e useEffect
import "./imc.css";
import Header from "../Navegacao/Header";
import Sidebar from "../Navegacao/Sidebar";

// --- Níveis de Atividade e seus Multiplicadores (Harris-Benedict) ---
const multiplicadores = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  ativo: 1.725,
  extremo: 1.9,
};

const niveisAtividade = [
  { value: "sedentario", label: "Sedentário (pouco ou nenhum exercício)" },
  { value: "leve", label: "Levemente Ativo (exercício leve 1-3 dias/semana)" },
  {
    value: "moderado",
    label: "Moderadamente Ativo (exercício moderado 3-5 dias/semana)",
  },
  { value: "ativo", label: "Muito Ativo (exercício intenso 6-7 dias/semana)" },
  {
    value: "extremo",
    label: "Extremamente Ativo (exercício muito intenso e/ou trabalho físico)",
  },
];

const MetabolismoCalculator: React.FC = () => {
  // --- Estados para os Inputs ---
  const [peso, setPeso] = useState("70");
  const [altura, setAltura] = useState("175");
  const [idade, setIdade] = useState("30");
  const [sexo, setSexo] = useState("masculino");
  const [nivelAtividade, setNivelAtividade] = useState("moderado");

  // --- Estados para os Resultados ---
  const [resultadoTMB, setResultadoTMB] = useState<number | null>(null);
  const [resultadoGET, setResultadoGET] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // <-- 2. Criar uma referência para a seção de resultados -->
  const resultsRef = useRef<HTMLDivElement>(null);

  /**
   * Calcula a TMB (Taxa Metabólica Basal) usando a fórmula
   * de Mifflin-St Jeor.
   */
  const calcularTMB = (
    pesoKg: number,
    alturaCm: number,
    idadeAnos: number,
    sexo: string
  ): number => {
    if (sexo === "masculino") {
      // (10 * peso) + (6.25 * altura) - (5 * idade) + 5
      return 10 * pesoKg + 6.25 * alturaCm - 5 * idadeAnos + 5;
    } else {
      // (10 * peso) + (6.25 * altura) - (5 * idade) - 161
      return 10 * pesoKg + 6.25 * alturaCm - 5 * idadeAnos - 161;
    }
  };

  // --- Handler do Formulário ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pesoKg = parseFloat(peso);
    const alturaCm = parseFloat(altura);
    const idadeAnos = parseInt(idade);

    // Validação
    if (
      isNaN(pesoKg) ||
      isNaN(alturaCm) ||
      isNaN(idadeAnos) ||
      pesoKg <= 0 ||
      alturaCm <= 0 ||
      idadeAnos <= 0
    ) {
      setError("Por favor, preencha todos os campos com valores válidos.");
      setResultadoTMB(null);
      setResultadoGET(null);
      return;
    }

    // 1. Cálculo do TMB
    const tmbValor = calcularTMB(pesoKg, alturaCm, idadeAnos, sexo);

    // 2. Cálculo do GET (Gasto Energético Total)
    const multiplicador =
      multiplicadores[nivelAtividade as keyof typeof multiplicadores];
    const getValor = tmbValor * multiplicador;

    // 3. Define os resultados
    setResultadoTMB(tmbValor);
    setResultadoGET(getValor);
  };

  // <-- 3. Adicionar o useEffect para rolar a tela -->
  useEffect(() => {
    // Verifica se os resultados existem e se a ref está conectada
    if (resultadoTMB && resultadoGET && resultsRef.current) {
      resultsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [resultadoTMB, resultadoGET]); // <-- Roda quando os resultados mudarem

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="calculator-container">
          <h2>Cálculo de Metabolismo</h2>

          <form onSubmit={handleSubmit}>
            {/* --- Peso --- */}
            <div className="form-group">
              <label htmlFor="peso">Peso</label>
              <div className="input-with-suffix">
                <input
                  id="peso"
                  type="number"
                  step="0.1"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                />
                <span>kg</span>
              </div>
            </div>

            {/* --- Altura --- */}
            <div className="form-group">
              <label htmlFor="altura">Altura</label>
              <div className="input-with-suffix">
                <input
                  id="altura"
                  type="number"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                />
                <span>cm</span>
              </div>
            </div>

            {/* --- Idade --- */}
            <div className="form-group">
              <label htmlFor="idade">Idade</label>
              <div className="input-with-suffix">
                <input
                  id="idade"
                  type="number"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                />
                <span>anos</span>
              </div>
            </div>

            {/* --- Sexo --- */}
            <div className="form-group">
              <label>Sexo</label>
              <div className="radio-group">
                <label htmlFor="masculino">
                  <input
                    id="masculino"
                    type="radio"
                    name="sexo"
                    value="masculino"
                    checked={sexo === "masculino"}
                    onChange={(e) => setSexo(e.target.value)}
                  />
                  Masculino
                </label>
                <label htmlFor="feminino">
                  <input
                    id="feminino"
                    type="radio"
                    name="sexo"
                    value="feminino"
                    checked={sexo === "feminino"}
                    onChange={(e) => setSexo(e.target.value)}
                  />
                  Feminino
                </label>
              </div>
            </div>

            {/* --- Nível de Atividade --- */}
            <div className="form-group">
              <label htmlFor="atividade">Nível de Atividade</label>
              <select
                id="atividade"
                value={nivelAtividade}
                onChange={(e) => setNivelAtividade(e.target.value)}
              >
                {niveisAtividade.map((nivel) => (
                  <option key={nivel.value} value={nivel.value}>
                    {nivel.label}
                  </option>
                ))}
              </select>
            </div>

            {/* --- Botão --- */}
            <button type="submit" className="btn-calcular">
              Calcular
            </button>
          </form>

          {/* --- Mensagem de Erro --- */}
          {error && <div className="error-message">{error}</div>}

          {/* --- Seção de Resultados --- */}
          {/* <-- 4. Conectar a referência (ref) à div --> */}
          {resultadoTMB && resultadoGET && (
            <div className="resultados-container" ref={resultsRef}>
              <h2>Resultados</h2>

              <div className="resultados-grid">
                {/* --- Card TMB --- */}
                <div className="result-box tmb-box">
                  <span>Metabolismo Basal (TMB)</span>
                  <strong>{resultadoTMB.toFixed(0)} kcal/dia</strong>
                  <span>(Gasto em repouso)</span>
                </div>

                {/* --- Card GET --- */}
                <div className="result-box get-box">
                  <span>Gasto Energético Total (GET)</span>
                  <strong>{resultadoGET.toFixed(0)} kcal/dia</strong>
                  <span>(TMB + Atividades)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MetabolismoCalculator;
