import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HomePage } from "./pages/HomePage";
import { PracticePage } from "./pages/PracticePage";
import { TierPage } from "./pages/TierPage";
import { IntroPage } from "./pages/IntroPage";
import { AssistantPage } from "./pages/AssistantPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/practice/subtopic/:subtopicId/:tier" element={<TierPage />} />
          <Route path="/practice/:kind/:id" element={<IntroPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}