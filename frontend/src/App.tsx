import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootRoute } from "./components/RootRoute";
import { applyGradient, getStoredGradient } from "./lib/buttonGradient";
import { applyBackground, getStoredBackground } from "./lib/backgroundGradient";
import { applyStoredTheme } from "./hooks/useTheme";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CompleteRegistrationPage } from "./pages/CompleteRegistrationPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { PracticeSubjectsPage } from "./pages/PracticeSubjectsPage";
import { PracticeSubjectPage } from "./pages/PracticeSubjectPage";
import { SubtopicPage } from "./pages/SubtopicPage";
import { TierPage } from "./pages/TierPage";
import { AssistantPage } from "./pages/AssistantPage";
import { ProfilePage } from "./pages/ProfilePage";
import { UserProfilePage } from "./pages/UserProfilePage";
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
import { MockExamDetailPage } from "./pages/MockExamDetailPage";
import { MockExamAttemptPage } from "./pages/MockExamAttemptPage";
import { MockExamResultsPage } from "./pages/MockExamResultsPage";
import { MockExamHistoryPage } from "./pages/MockExamHistoryPage";
import { FlashcardsPage } from "./pages/FlashcardsPage";
import { FlashcardFavoritesPage } from "./pages/FlashcardFavoritesPage";
import { FlashcardStudyPage } from "./pages/FlashcardStudyPage";
import { FlashcardEditorPage } from "./pages/FlashcardEditorPage";
import { FlashcardDeckManagePage } from "./pages/FlashcardDeckManagePage";
import { MistakeNotebookPage } from "./pages/MistakeNotebookPage";
import { NotepadPage } from "./pages/NotepadPage";
import { StudyPlanPage } from "./pages/StudyPlanPage";
import { RankingsPage } from "./pages/RankingsPage";
import { ParentDashboardPage } from "./pages/ParentDashboardPage";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HelpCenterPage } from "./pages/HelpCenterPage";
import { HelpCategoryPage } from "./pages/HelpCategoryPage";
import { HelpArticlePage } from "./pages/HelpArticlePage";
import { HelpTicketsPage } from "./pages/HelpTicketsPage";
import { HelpTicketDetailPage } from "./pages/HelpTicketDetailPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { LearningProfilePage } from "./pages/LearningProfilePage";
import { SubjectHubPage } from "./pages/SubjectHubPage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { GroupsPage } from "./pages/GroupsPage";
import { GroupCreatePage } from "./pages/GroupCreatePage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { TodoHomePage } from "./pages/TodoHomePage";
import { TodoListPage } from "./pages/TodoListPage";
import { TodoProjectsPage } from "./pages/TodoProjectsPage";
import { TodoProjectDetailPage } from "./pages/TodoProjectDetailPage";
import { TodoTrashPage } from "./pages/TodoTrashPage";
import { NotesHomePage } from "./pages/NotesHomePage";
import { NoteEditorPage } from "./pages/NoteEditorPage";

export default function App() {
  useEffect(() => {
    applyStoredTheme();
    applyGradient(getStoredGradient());
    applyBackground(getStoredBackground());
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />

          <Route path="/" element={<RootRoute />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/subjects/:subject" element={<SubjectHubPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/practice" element={<PracticeSubjectsPage />} />
            <Route path="/practice/:subjectId" element={<PracticeSubjectPage />} />
            <Route path="/practice/subtopic/:subtopicId" element={<SubtopicPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<UserProfilePage />} />
            <Route path="/learning-profile" element={<LearningProfilePage />} />
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
            <Route path="/mock-exams/:examId" element={<MockExamDetailPage />} />
            <Route path="/mock-exams/attempt/:attemptId" element={<MockExamAttemptPage />} />
            <Route path="/mock-exams/attempt/:attemptId/results" element={<MockExamResultsPage />} />
            <Route path="/mock-exams/:examId/history" element={<MockExamHistoryPage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/flashcards/favorites" element={<FlashcardFavoritesPage />} />
            <Route path="/flashcards/create" element={<FlashcardEditorPage />} />
            <Route path="/flashcards/cards/:cardId/edit" element={<FlashcardEditorPage />} />
            <Route path="/flashcards/:deckId/manage" element={<FlashcardDeckManagePage />} />
            <Route path="/flashcards/:deckId" element={<FlashcardStudyPage />} />
            <Route path="/mistake-notebook" element={<MistakeNotebookPage />} />
            <Route path="/notepad" element={<NotepadPage />} />
            <Route path="/study-plan" element={<StudyPlanPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/create" element={<GroupCreatePage />} />
            <Route path="/groups/:id" element={<GroupDetailPage />} />
            <Route path="/family" element={<ParentDashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpCenterPage />} />
            <Route path="/help/tickets" element={<HelpTicketsPage />} />
            <Route path="/help/tickets/:ticketId" element={<HelpTicketDetailPage />} />
            <Route path="/help/articles/:articleSlug" element={<HelpArticlePage />} />
            <Route path="/help/:categoryKey" element={<HelpCategoryPage />} />
            <Route path="/todo" element={<TodoHomePage />} />
            <Route path="/todo/list" element={<TodoListPage />} />
            <Route path="/todo/projects" element={<TodoProjectsPage />} />
            <Route path="/todo/projects/:id" element={<TodoProjectDetailPage />} />
            <Route path="/todo/trash" element={<TodoTrashPage />} />
            <Route path="/notes" element={<NotesHomePage />} />
            <Route path="/notes/:id" element={<NoteEditorPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
