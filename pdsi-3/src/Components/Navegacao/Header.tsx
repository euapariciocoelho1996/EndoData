import React, { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

type HeaderProps = {
  userName?: string;
};

const Header: React.FC<HeaderProps> = ({ userName }) => {
  const [fullName, setFullName] = useState<string>("Usuário");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const doctorDoc = await getDoc(doc(db, "doctors", user.uid));
          if (doctorDoc.exists()) {
            const doctorData = doctorDoc.data();
            setFullName(doctorData.name || "Usuário");
          } else {
            setFullName(userName || user.email?.split("@")[0] || "Usuário");
          }
        } catch (error) {
          console.error("Erro ao buscar nome do usuário:", error);
          setFullName(userName || "Usuário");
        }
      }
    };

    fetchUserName();
  }, [userName]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <header className="main-header">
      <h3>
        <span style={{ color: "#2563eb" }}>Bem-vindo (a)</span> de volta,{" "}
        {fullName}!
      </h3>
      <button
        className="icon-button logout-button"
        onClick={handleLogout}
        title="Sair"
        aria-label="Sair"
      >
        <LogOut size={22} />
      </button>
    </header>
  );
};

export default Header;
