import React, { useState, useRef, useEffect } from "react"; // <-- 1. Importar useRef e useEffect
import "./imc.css";
import Sidebar from "../Navegacao/Sidebar";
import Header from "../Navegacao/Header";

type Resultado = {
  imc: number;
  imcClass: string;
  tmb: number;
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

const ImcCalculator: React.FC = () => {
  const [peso, setPeso] = useState("70");
  const [altura, setAltura] = useState("175");
  const [idade, setIdade] = useState("30");
  const [sexo, setSexo] = useState("masculino");
  const [nivelAtividade, setNivelAtividade] = useState("moderado");

  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  // <-- 2. Criar uma referência para a seção de resultados -->
  const resultsRef = useRef<HTMLDivElement>(null);

  const getClassificacaoIMC = (imc: number): string => {
    if (imc < 18.5) return "Abaixo do peso";
    if (imc <= 24.9) return "Normal";
    if (imc <= 29.9) return "Sobrepeso";
    if (imc <= 34.9) return "Obesidade Grau I";
    if (imc <= 39.9) return "Obesidade Grau II";
    return "Obesidade Grau III";
  };

  const calcularTMB = (
    pesoKg: number,
    alturaCm: number,
    idadeAnos: number,
    sexo: string
  ): number =>
    sexo === "masculino"
      ? 10 * pesoKg + 6.25 * alturaCm - 5 * idadeAnos + 5
      : 10 * pesoKg + 6.25 * alturaCm - 5 * idadeAnos - 161;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pesoKg = parseFloat(peso);
    const alturaCm = parseFloat(altura);
    const idadeAnos = parseInt(idade);

    if (!pesoKg || !alturaCm || !idadeAnos) {
      setError("Por favor, preencha todos os campos com valores válidos.");
      setResultado(null);
      return;
    }

    const alturaM = alturaCm / 100;
    const imcValue = pesoKg / (alturaM * alturaM);

    setResultado({
      imc: imcValue,
      imcClass: getClassificacaoIMC(imcValue),
      tmb: calcularTMB(pesoKg, alturaCm, idadeAnos, sexo),
    });
  };

  // <-- 3. Adicionar o useEffect para rolar a tela -->
  useEffect(() => {
    // Verifica se o resultado existe (acabou de ser calculado)
    // e se a referência (resultsRef) está conectada à div
    if (resultado && resultsRef.current) {
      // Rola a tela suavemente até a div de resultados
      resultsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start", // Alinha o topo da div ao topo da tela
      });
    }
  }, [resultado]); // <-- Este efeito roda toda vez que 'resultado' mudar

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="calculator-container">
          <h2>Cálculo de IMC</h2>

          <form onSubmit={handleSubmit}>
            {/* ... (Todo o seu formulário permanece igual) ... */}
            <div className="form-group">
              <label>Peso</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                />
                <span>kg</span>
              </div>
            </div>

            <div className="form-group">
              <label>Altura</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                />
                <span>cm</span>
              </div>
            </div>

            <div className="form-group">
              <label>Idade</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                />
                <span>anos</span>
              </div>
            </div>

            <div className="form-group">
              <label>Sexo</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    value="masculino"
                    checked={sexo === "masculino"}
                    onChange={(e) => setSexo(e.target.value)}
                  />{" "}
                  Masculino
                </label>
                <label>
                  <input
                    type="radio"
                    value="feminino"
                    checked={sexo === "feminino"}
                    onChange={(e) => setSexo(e.target.value)}
                  />{" "}
                  Feminino
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Nível de Atividade</label>
              <select
                value={nivelAtividade}
                onChange={(e) => setNivelAtividade(e.target.value)}
              >
                {niveisAtividade.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-calcular">
              Calcular
            </button>
          </form>

          {error && <div className="error-message">{error}</div>}

          {/* <-- 4. Conectar a referência (ref) à sua div de resultados --> */}
          {resultado && (
            <div className="resultados-container" ref={resultsRef}>
              <h2>Resultados</h2>

              <div className="resultados-grid">
                <div
                  className={`result-box imc-box ${
                    resultado.imcClass === "Normal" ? "normal" : "fora"
                  }`}
                >
                  <span>IMC</span>
                  <strong>{resultado.imc.toFixed(1)} kg/m²</strong>
                  <span>{resultado.imcClass}</span>
                </div>

                <div className="result-box tmb-box">
                  <span>TMB Estimada</span>
                  <strong>{resultado.tmb.toFixed(0)} kcal/dia</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ImcCalculator;
