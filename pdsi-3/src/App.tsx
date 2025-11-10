import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthForm from "./Components/Autenticacao/AuthForm";
import Dashboard from "./Components/Tela-Principal/Dashboard";
import PatientForm from "./Components/Pacientes/PatientForm";
import PatientList from "./Components/Pacientes/PatientList";
import PacienteDetalhe from "./Components/Pacientes/PacienteDetalhe";
import IMC from "./Components/Calculo/imc";
import MetabolismoBasal from "./Components/Calculo/metabolismo-basal";
import PrescriptionForm from "./Components/prescricoes/PrescriptionForm";
import PrescriptionsAndRecipesList from "./Components/prescricoes/PrescriptionsAndRecipesList";
import RecipeForm from "./Components/Receitas/RecipeForm";
import Reports from "./Components/Relatorios/Reports";
import Agenda from "./Components/Agenda/Agenda";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Clinics from "./Components/Clinicas/ClinicsForm";
// Componente para proteger rotas que precisam de autenticação
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userLogged, setUserLogged] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserLogged(!!user);
    });
    return () => unsub();
  }, []);

  if (userLogged === null) {
    return <div>Carregando...</div>;
  }

  return userLogged ? <>{children}</> : <Navigate to="/" />;
};

function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<unknown>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setInitializing(false);
    });
    return () => unsub();
  }, []);

  if (initializing) {
    return <div>Carregando...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" /> : <AuthForm />}
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/new-patient"
          element={
            <PrivateRoute>
              <PatientForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/PatientList"
          element={
            <PrivateRoute>
              <PatientList />
            </PrivateRoute>
          }
        />
        <Route
          path="/paciente/:patientId"
          element={
            <PrivateRoute>
              <PacienteDetalhe />
            </PrivateRoute>
          }
        />
        <Route
          path="/imc"
          element={
            <PrivateRoute>
              <IMC />
            </PrivateRoute>
          }
        />
        <Route
          path="/metabolismo-basal"
          element={
            <PrivateRoute>
              <MetabolismoBasal />
            </PrivateRoute>
          }
        />
        <Route
          path="/new-prescription"
          element={
            <PrivateRoute>
              <PrescriptionForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/new-recipe"
          element={
            <PrivateRoute>
              <RecipeForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/prescriptions-recipes"
          element={
            <PrivateRoute>
              <PrescriptionsAndRecipesList />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <Reports />
            </PrivateRoute>
          }
        />
        <Route
          path="/agenda"
          element={
            <PrivateRoute>
              <Agenda />
            </PrivateRoute>
          }
        />
        <Route path="/clinics" element={<Clinics />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
