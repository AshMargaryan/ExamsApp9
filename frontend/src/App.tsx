import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CompleteRegistrationPage } from "./pages/CompleteRegistrationPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { HomePage } from "./pages/HomePage";
import { PracticeSubjectsPage } from "./pages/PracticeSubjectsPage";
import { PracticeSubjectPage } from "./pages/PracticeSubjectPage";
import { SubtopicPage } from "./pages/SubtopicPage";
import { TierPage } from "./pages/TierPage";
import { AssistantPage } from "./pages/AssistantPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AccountSessionsPage } from "./pages/AccountSessionsPage";
import { TeacherDashboardPage } from "./pages/TeacherDashboardPage";
import { StudentDashboardPage } from "./pages/StudentDashboardPage";
import { AssignmentReviewPage } from "./pages/AssignmentReviewPage";
import { GamesPage } from "./pages/GamesPage";
import { GameRoomPage } from "./pages/GameRoomPage";
import { MatchmakingPage } from "./pages/MatchmakingPage";
import { GameplayPage } from "./pages/GameplayPage";
import { ResultsPage } from "./pages/ResultsPage";
import { MockExamsPage } from "./pages/MockExamsPage";
import { MockExamAttemptPage } from "./pages/MockExamAttemptPage";
import { MockExamResultsPage } from "./pages/MockExamResultsPage";
import { MockExamHistoryPage } from "./pages/MockExamHistoryPage";
import { FlashcardsPage } from "./pages/FlashcardsPage";
import { FlashcardStudyPage } from "./pages/FlashcardStudyPage";
import { FlashcardEditorPage } from "./pages/FlashcardEditorPage";
import { FlashcardDeckManagePage } from "./pages/FlashcardDeckManagePage";
import { RankingsPage } from "./pages/RankingsPage";
import { ParentDashboardPage } from "./pages/ParentDashboardPage";
import { ChatPage } from "./pages/ChatPage";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/practice" element={<PracticeSubjectsPage />} />
            <Route path="/practice/:subjectId" element={<PracticeSubjectPage />} />
            <Route path="/practice/subtopic/:subtopicId" element={<SubtopicPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/account/sessions" element={<AccountSessionsPage />} />
            <Route path="/teacher-dashboard" element={<TeacherDashboardPage />} />
            <Route path="/student-dashboard" element={<StudentDashboardPage />} />
            <Route path="/assignments/:id" element={<AssignmentReviewPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/find" element={<MatchmakingPage />} />
            <Route path="/games/:roomCode" element={<GameRoomPage />} />
            <Route path="/games/:roomCode/play" element={<GameplayPage />} />
            <Route path="/games/:roomCode/results" element={<ResultsPage />} />
            <Route path="/practice/subtopic/:subtopicId/:tier" element={<TierPage />} />
            <Route path="/mock-exams" element={<MockExamsPage />} />
            <Route path="/mock-exams/attempt/:attemptId" element={<MockExamAttemptPage />} />
            <Route path="/mock-exams/attempt/:attemptId/results" element={<MockExamResultsPage />} />
            <Route path="/mock-exams/:examId/history" element={<MockExamHistoryPage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/flashcards/create" element={<FlashcardEditorPage />} />
            <Route path="/flashcards/cards/:cardId/edit" element={<FlashcardEditorPage />} />
            <Route path="/flashcards/:deckId/manage" element={<FlashcardDeckManagePage />} />
            <Route path="/flashcards/:deckId" element={<FlashcardStudyPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/family" element={<ParentDashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}