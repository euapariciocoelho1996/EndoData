import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import "./AuthForm.css";

function AuthForm() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [crm, setCrm] = useState("");
  const [crmUf, setCrmUf] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Ref para rolar até o topo do formulário
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setCpf("");
    setCrm("");
  };

  // Sempre que houver um erro, rola para o topo da mensagem
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [error]);

  const translateError = (code?: string): string => {
    switch (code) {
      case "auth/wrong-password":
        return "Senha incorreta. Tente novamente.";
      case "auth/user-not-found":
        return "Nenhum usuário encontrado com este e-mail.";
      case "auth/email-already-in-use":
        return "Este e-mail já está sendo usado por outra conta.";
      case "auth/weak-password":
        return "Sua senha deve ter pelo menos 6 caracteres.";
      case "auth/invalid-email":
        return "O formato do e-mail é inválido.";
      default:
        return "Ocorreu um erro. Tente novamente.";
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (isLoginMode) {
      if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
    } else {
      const cpfDigits = cpf.replace(/\D/g, "");
      if (cpfDigits.length !== 11) {
        setError("CPF inválido. Informe 11 dígitos.");
        return;
      }

      if (!fullName || fullName.trim().split(" ").length < 2) {
        setError("Por favor, insira seu nome completo.");
        return;
      }

      if (!crm || crm.trim().length < 3) {
        setError("Informe um CRM válido (mínimo 3 caracteres).");
        return;
      }

      const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!strongPassword.test(password)) {
        setError(
          "Senha fraca. Deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo."
        );
        return;
      }

      if (password !== confirmPassword) {
        setError("As senhas não conferem. Verifique e tente novamente.");
        return;
      }

      try {
        const doctorsRef = collection(db, "doctors");

        const emailQuery = query(doctorsRef, where("email", "==", email));
        const cpfQuery = query(doctorsRef, where("cpf", "==", cpfDigits));
        const crmQuery = query(doctorsRef, where("crm", "==", crm));

        const [emailSnap, cpfSnap, crmSnap] = await Promise.all([
          getDocs(emailQuery),
          getDocs(cpfQuery),
          getDocs(crmQuery),
        ]);

        if (!emailSnap.empty) {
          setError("Este e-mail já está em uso.");
          return;
        }
        if (!cpfSnap.empty) {
          setError("Este CPF já está cadastrado.");
          return;
        }
        if (!crmSnap.empty) {
          setError("Este CRM já está em uso.");
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        setError("Erro ao verificar duplicatas. Tente novamente.");
        return;
      }
    }

    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        await setDoc(doc(db, "doctors", userCredential.user.uid), {
          name: fullName,
          email: email,
          cpf: cpf.replace(/\D/g, ""),
          phone: phone.replace(/\D/g, ""),
          crm: crm,
          crmUf: crmUf || null,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      type FirebaseErrorLike = { code?: string };
      const code = (err as FirebaseErrorLike)?.code;
      setError(translateError(code));
    }
  };

  const handlePasswordReset = async (
    e: React.MouseEvent<HTMLAnchorElement>
  ) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor, digite seu e-mail para resetar a senha.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setError(
        "E-mail de redefinição enviado! Verifique sua caixa de entrada."
      );
    } catch (err) {
      type FirebaseErrorLike = { code?: string };
      const code = (err as FirebaseErrorLike)?.code;
      setError(translateError(code));
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-panel-left">
        <div className="auth-card">
          <h2>{isLoginMode ? "Bem-vindo de volta!" : "Crie sua conta"}</h2>
          <p className="auth-subtitle">
            {isLoginMode
              ? "Acesse sua conta para continuar."
              : "Preencha os dados para começar."}
          </p>

          {error && (
            <p ref={errorRef} className="auth-error">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
              />
            </div>

            {!isLoginMode && (
              <>
                <div className="input-group">
                  <label htmlFor="fullName">Nome Completo</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="cpf">CPF</label>
                  <input
                    id="cpf"
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="Somente números (ex: 00000000000)"
                    inputMode="numeric"
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="phone">Telefone</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(XX) XXXXX-XXXX"
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="crm">CRM</label>
                  <input
                    id="crm"
                    type="text"
                    value={crm}
                    onChange={(e) => setCrm(e.target.value)}
                    placeholder="Seu CRM profissional"
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="crmUf">UF do CRM (ex: SP)</label>
                  <input
                    id="crmUf"
                    type="text"
                    list="uf-list"
                    value={crmUf}
                    onChange={(e) => setCrmUf(e.target.value.toUpperCase())}
                    placeholder="Ex: SP (ou escolha na lista)"
                  />
                  <datalist id="uf-list">
                    <option value="AC" />
                    <option value="AL" />
                    <option value="AP" />
                    <option value="AM" />
                    <option value="BA" />
                    <option value="CE" />
                    <option value="DF" />
                    <option value="ES" />
                    <option value="GO" />
                    <option value="MA" />
                    <option value="MT" />
                    <option value="MS" />
                    <option value="MG" />
                    <option value="PA" />
                    <option value="PB" />
                    <option value="PR" />
                    <option value="PE" />
                    <option value="PI" />
                    <option value="RJ" />
                    <option value="RN" />
                    <option value="RS" />
                    <option value="RO" />
                    <option value="RR" />
                    <option value="SC" />
                    <option value="SP" />
                    <option value="SE" />
                    <option value="TO" />
                  </datalist>
                </div>
              </>
            )}

            <div className="input-group">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {!isLoginMode && (
              <div className="input-group">
                <label htmlFor="confirmPassword">Confirmar Senha</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua senha"
                  required
                />
              </div>
            )}

            {isLoginMode && (
              <a
                href="#"
                onClick={handlePasswordReset}
                className="forgot-password"
              >
                Esqueceu sua senha?
              </a>
            )}

            <button type="submit" className="auth-button">
              {isLoginMode ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="auth-toggle">
            {isLoginMode ? "Não tem uma conta?" : "Já tem uma conta?"}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toggleMode();
              }}
            >
              {isLoginMode ? " Criar uma conta" : " Faça login"}
            </a>
          </p>
        </div>
      </div>

      <div className="auth-panel-right">
        <div className="carousel">
          <div className="carousel-track">
            <div className="carousel-item">
              Organize os dados dos pacientes de forma segura e eficiente.
            </div>
            <div className="carousel-item">
              Acesse históricos médicos rapidamente com poucos cliques.
            </div>
            <div className="carousel-item">
              Proteja informações sensíveis com segurança avançada.
            </div>
            <div className="carousel-item">
              Melhore a comunicação entre médicos e equipe.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthForm;
