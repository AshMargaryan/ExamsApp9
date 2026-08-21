import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootRoute } from "./components/RootRoute";
import { applyStoredAccent } from "./lib/accentTheme";
import { applyStoredTheme } from "./hooks/useTheme";
import { applyStoredSidebarCollapsed } from "./hooks/useSidebarCollapsed";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CompleteRegistrationPage } from "./pages/CompleteRegistrationPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

// Everything behind ProtectedRoute is lazy-loaded: these ~45 pages used to
// be imported eagerly, so every route (even /login) shipped one bundle
// containing the whole app — including heavy, rarely-visited pages like the
// Tiptap-based notes editor. Splitting them keeps the initial bundle to
// just the auth screens above.
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage").then((m) => ({ default: m.VerifyEmailPage })));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage").then((m) => ({ default: m.SubscriptionPage })));
const PracticeSubjectsPage = lazy(() => import("./pages/PracticeSubjectsPage").then((m) => ({ default: m.PracticeSubjectsPage })));
const PracticeSubjectPage = lazy(() => import("./pages/PracticeSubjectPage").then((m) => ({ default: m.PracticeSubjectPage })));
const SubtopicPage = lazy(() => import("./pages/SubtopicPage").then((m) => ({ default: m.SubtopicPage })));
const TierPage = lazy(() => import("./pages/TierPage").then((m) => ({ default: m.TierPage })));
const AssistantPage = lazy(() => import("./pages/AssistantPage").then((m) => ({ default: m.AssistantPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage").then((m) => ({ default: m.UserProfilePage })));
const TeacherDashboardPage = lazy(() => import("./pages/TeacherDashboardPage").then((m) => ({ default: m.TeacherDashboardPage })));
const StudentDashboardPage = lazy(() => import("./pages/StudentDashboardPage").then((m) => ({ default: m.StudentDashboardPage })));
const AssignmentReviewPage = lazy(() => import("./pages/AssignmentReviewPage").then((m) => ({ default: m.AssignmentReviewPage })));
const GamesPage = lazy(() => import("./pages/GamesPage").then((m) => ({ default: m.GamesPage })));
const GameRoomPage = lazy(() => import("./pages/GameRoomPage").then((m) => ({ default: m.GameRoomPage })));
const MatchmakingPage = lazy(() => import("./pages/MatchmakingPage").then((m) => ({ default: m.MatchmakingPage })));
const GameplayPage = lazy(() => import("./pages/GameplayPage").then((m) => ({ default: m.GameplayPage })));
const ResultsPage = lazy(() => import("./pages/ResultsPage").then((m) => ({ default: m.ResultsPage })));
const MockExamsPage = lazy(() => import("./pages/MockExamsPage").then((m) => ({ default: m.MockExamsPage })));
const MockExamDetailPage = lazy(() => import("./pages/MockExamDetailPage").then((m) => ({ default: m.MockExamDetailPage })));
const MockExamAttemptPage = lazy(() => import("./pages/MockExamAttemptPage").then((m) => ({ default: m.MockExamAttemptPage })));
const MockExamResultsPage = lazy(() => import("./pages/MockExamResultsPage").then((m) => ({ default: m.MockExamResultsPage })));
const MockExamHistoryPage = lazy(() => import("./pages/MockExamHistoryPage").then((m) => ({ default: m.MockExamHistoryPage })));
const FlashcardsPage = lazy(() => import("./pages/FlashcardsPage").then((m) => ({ default: m.FlashcardsPage })));
const FlashcardFavoritesPage = lazy(() => import("./pages/FlashcardFavoritesPage").then((m) => ({ default: m.FlashcardFavoritesPage })));
const FlashcardStudyPage = lazy(() => import("./pages/FlashcardStudyPage").then((m) => ({ default: m.FlashcardStudyPage })));
const FlashcardEditorPage = lazy(() => import("./pages/FlashcardEditorPage").then((m) => ({ default: m.FlashcardEditorPage })));
const FlashcardDeckManagePage = lazy(() => import("./pages/FlashcardDeckManagePage").then((m) => ({ default: m.FlashcardDeckManagePage })));
const MistakeNotebookPage = lazy(() => import("./pages/MistakeNotebookPage").then((m) => ({ default: m.MistakeNotebookPage })));
const MistakeReviewSessionPage = lazy(() => import("./pages/MistakeReviewSessionPage").then((m) => ({ default: m.MistakeReviewSessionPage })));
const NotepadPage = lazy(() => import("./pages/NotepadPage").then((m) => ({ default: m.NotepadPage })));
const StudyPlanPage = lazy(() => import("./pages/StudyPlanPage").then((m) => ({ default: m.StudyPlanPage })));
const RankingsPage = lazy(() => import("./pages/RankingsPage").then((m) => ({ default: m.RankingsPage })));
const ParentDashboardPage = lazy(() => import("./pages/ParentDashboardPage").then((m) => ({ default: m.ParentDashboardPage })));
const ChatPage = lazy(() => import("./pages/ChatPage").then((m) => ({ default: m.ChatPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const HelpCenterPage = lazy(() => import("./pages/HelpCenterPage").then((m) => ({ default: m.HelpCenterPage })));
const HelpCategoryPage = lazy(() => import("./pages/HelpCategoryPage").then((m) => ({ default: m.HelpCategoryPage })));
const HelpArticlePage = lazy(() => import("./pages/HelpArticlePage").then((m) => ({ default: m.HelpArticlePage })));
const HelpTicketsPage = lazy(() => import("./pages/HelpTicketsPage").then((m) => ({ default: m.HelpTicketsPage })));
const HelpTicketDetailPage = lazy(() => import("./pages/HelpTicketDetailPage").then((m) => ({ default: m.HelpTicketDetailPage })));
const LearningProfilePage = lazy(() => import("./pages/LearningProfilePage").then((m) => ({ default: m.LearningProfilePage })));
const GroupsPage = lazy(() => import("./pages/GroupsPage").then((m) => ({ default: m.GroupsPage })));
const GroupCreatePage = lazy(() => import("./pages/GroupCreatePage").then((m) => ({ default: m.GroupCreatePage })));
const GroupDetailPage = lazy(() => import("./pages/GroupDetailPage").then((m) => ({ default: m.GroupDetailPage })));
const TodoHomePage = lazy(() => import("./pages/TodoHomePage").then((m) => ({ default: m.TodoHomePage })));
const TodoListPage = lazy(() => import("./pages/TodoListPage").then((m) => ({ default: m.TodoListPage })));
const TodoProjectsPage = lazy(() => import("./pages/TodoProjectsPage").then((m) => ({ default: m.TodoProjectsPage })));
const TodoProjectDetailPage = lazy(() => import("./pages/TodoProjectDetailPage").then((m) => ({ default: m.TodoProjectDetailPage })));
const TodoTrashPage = lazy(() => import("./pages/TodoTrashPage").then((m) => ({ default: m.TodoTrashPage })));
const NotesHomePage = lazy(() => import("./pages/NotesHomePage").then((m) => ({ default: m.NotesHomePage })));
const NoteEditorPage = lazy(() => import("./pages/NoteEditorPage").then((m) => ({ default: m.NoteEditorPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

export default function App() {
  useEffect(() => {
    applyStoredTheme();
    applyStoredSidebarCollapsed();
    applyStoredAccent();
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center text-[var(--color-text-muted)]">
              Բեռնվում է...
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />

            <Route path="/" element={<RootRoute />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              {/* One subject picker, two names. Every "subjects" entry point
                  in the product points at /subjects, and /practice is where
                  the deeper routes live, so both render the same page rather
                  than one of them being a second, worse picker. */}
              <Route path="/subjects" element={<PracticeSubjectsPage />} />
              <Route path="/subjects/:subject" element={<Navigate to="/subjects" replace />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/practice" element={<PracticeSubjectsPage />} />
              <Route path="/practice/:subjectId" element={<PracticeSubjectPage />} />
              <Route path="/practice/subtopic/:subtopicId" element={<SubtopicPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:userId" element={<UserProfilePage />} />
              <Route path="/learning-profile" element={<LearningProfilePage />} />
              {/* The device list is a section of Settings now, not a page of
                  its own. Kept as a redirect because the link existed in the
                  wild (profile menu, native shell). */}
              <Route path="/account/sessions" element={<Navigate to="/settings#devices" replace />} />
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
              <Route path="/mistake-notebook/review" element={<MistakeReviewSessionPage />} />
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

              {/* Catch-all. Without this, react-router matched nothing for an
                  unknown URL and rendered an entirely blank document — no
                  chrome, no message, no way back. Inside ProtectedRoute so a
                  signed-in student keeps the sidebar and header (the real
                  recovery path), and a signed-out visitor is still sent to
                  /login rather than being told a page is missing. */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}
