import { useState } from "react";
import type { FormEvent } from "react";
// 1. Importe o 'db' do seu arquivo firebase.js
import { db } from "../firebase";
// 2. Importe 'collection' e 'addDoc'
import { collection, addDoc } from "firebase/firestore";

function AdicionarItemTeste() {
  // 3. States para guardar os valores dos inputs
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");

  /**
   * Função chamada ao enviar o formulário
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Impede o recarregamento da página

    // Validação simples
    if (nome.trim() === "" || preco.trim() === "") {
      alert("Por favor, preencha nome e preço.");
      return;
    }

    // 4. Tenta salvar no Firestore
    try {
      // 'addDoc' cria um novo documento com um ID automático
      const docRef = await addDoc(collection(db, "testes"), {
        nome: nome,
        preco: parseFloat(preco), // Converte o texto 'preco' para número
        criadoEm: new Date(), // Adiciona uma data de criação
      });

      console.log("Documento salvo com ID: ", docRef.id);
      alert("Item de teste adicionado com sucesso!");

      // 5. Limpa os campos do formulário
      setNome("");
      setPreco("");
    } catch (error) {
      console.error("Erro ao adicionar documento: ", error);
      alert("Erro ao salvar. Verifique o console.");
    }
  };

  // 6. O formulário HTML (JSX)
  return (
    <form onSubmit={handleSubmit} style={{ margin: "20px" }}>
      <h2>Adicionar Item de Teste</h2>
      <div>
        <label>Nome: </label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do item"
        />
      </div>
      <div style={{ marginTop: "10px" }}>
        <label>Preço: </label>
        <input
          type="number"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder="10.99"
        />
      </div>
      <button type="submit" style={{ marginTop: "10px" }}>
        Salvar no Firestore
      </button>
    </form>
  );
}

export default AdicionarItemTeste;
