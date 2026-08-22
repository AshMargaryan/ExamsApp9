import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StudyPlanPage } from "../StudyPlanPage";
import * as studyPlanApi from "../../api/studyPlan";
import * as profileApi from "../../api/profile";
import * as knowledgeApi from "../../api/knowledge";
import type { DailyStudyPlan, StudyTask } from "../../api/studyPlan";
import type { HomeInsight, Profile } from "../../api/profile";

vi.mock("../../api/studyPlan");
vi.mock("../../api/profile");
vi.mock("../../api/knowledge");

function task(overrides: Partial<StudyTask> & Pick<StudyTask, "id" | "title">): StudyTask {
  return {
    order: 0,
    task_type: "practice_weak_topic",
    subject_name: "Մաթեմատիկա",
    topic_label: "Երկրաչափություն",
    blurb: "",
    link_path: "/practice/subtopic/1/medium",
    estimated_minutes: 10,
    done: false,
    progress: null,
    check_in_feeling: null,
    ...overrides,
  };
}

const PLAN: DailyStudyPlan = {
  id: 1,
  date: "2026-08-17",
  headline: "Այսօր փակում ենք երկրաչափությունը։",
  coach_message: "",
  tasks: [
    task({ id: 1, title: "Կրկնիր 4 սխալ", done: true, task_type: "mistake_retry" }),
    task({ id: 2, title: "Լուծիր վարժություններ", blurb: "Իմացության մակարդակդ՝ 48%։" }),
    task({ id: 3, title: "Կրկնիր 15 բառաքարտ", task_type: "flashcard_review", progress: "3/15" }),
  ],
  coach: {
    today: {
      minutes_done: 5,
      minutes_total: 25,
      done_count: 1,
      total_count: 3,
      questions: 12,
      correct: 9,
      mistakes: 3,
      accuracy: 75,
      priority: "high",
      expected_result: "Բարձրացնել երկրաչափության մակարդակը",
    },
    weakness: [],
    review: null,
    strategy: null,
    week: { days_studied: 4, minutes: 260, questions: 126, accuracy: 78, narrative: "Լավ շաբաթ էր։" },
    weekly_report: null,
  },
};

const PROFILE = {
  username: "daniel",
  first_name: "Դանիել",
  streak: { current_streak: 7 },
  days_until_exam: 23,
  university: null,
  target_major: null,
  target_exam_date: null,
} as unknown as Profile;

const INSIGHT = {
  coach: { available: false, reason: "" },
  next_mission: { available: false },
  checklist: { items: [], completed_count: 0, total_count: 0, all_complete: false, estimated_minutes: null },
} as unknown as HomeInsight;

function renderPage() {
  return render(
    <MemoryRouter>
      <StudyPlanPage />
    </MemoryRouter>,
  );
}

describe("StudyPlanPage", () => {
  beforeEach(() => {
    vi.mocked(studyPlanApi.getTodayPlan).mockResolvedValue(PLAN);
    vi.mocked(studyPlanApi.submitTaskCheckIn).mockResolvedValue(undefined);
    vi.mocked(profileApi.fetchProfile).mockResolvedValue(PROFILE);
    vi.mocked(profileApi.fetchHomeInsight).mockResolvedValue(INSIGHT);
    vi.mocked(knowledgeApi.fetchSubjectMasteryScores).mockResolvedValue([]);
  });

  it("leads with the active task as the page's primary action", async () => {
    renderPage();

    // The page is titled after itself, not after the student — the
    // dashboard owns the greeting.
    expect(await screen.findByRole("heading", { level: 1, name: "Ուսումնական պլան" })).toBeInTheDocument();
    // The first not-done task is the one promoted into the hero CTA.
    expect(screen.getByRole("button", { name: /Սկսել՝ Լուծիր վարժություններ/ })).toBeInTheDocument();
    // Its reasoning is shown inline, not hidden behind a tooltip.
    expect(screen.getByText("ԻՆՉՈ՞Ւ ՀԵՆՑ ՍԱ")).toBeInTheDocument();
    expect(screen.getByText("Իմացության մակարդակդ՝ 48%։")).toBeInTheDocument();
  });

  it("offers a check-in only on the completed task", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Ուսումնական պլան" });

    expect(screen.getByText("Ինչպե՞ս անցավ")).toBeInTheDocument();
    // A completed card must not be a button wrapping these buttons.
    expect(screen.queryByRole("button", { name: /Կրկնիր 4 սխալ/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Հեշտ էր/ })).toHaveLength(1);
  });

  it("records a check-in and confirms it back to the student", async () => {
    renderPage();
    await screen.findByText("Ինչպե՞ս անցավ");

    await userEvent.click(screen.getByRole("button", { name: /Դժվար էր/ }));

    await waitFor(() => expect(studyPlanApi.submitTaskCheckIn).toHaveBeenCalledWith(1, "struggled"));
    expect(await screen.findByText(/Նշեցիր՝ դժվար էր/)).toBeInTheDocument();
  });

  it("rolls the check-in back when the request fails", async () => {
    vi.mocked(studyPlanApi.submitTaskCheckIn).mockRejectedValue(new Error("offline"));
    renderPage();
    await screen.findByText("Ինչպե՞ս անցավ");

    await userEvent.click(screen.getByRole("button", { name: /Հեշտ էր/ }));

    // The optimistic label disappears again and the buttons come back.
    await waitFor(() => expect(screen.getByText("Ինչպե՞ս անցավ")).toBeInTheDocument());
  });

  it("shows a retry instead of an endless skeleton when loading fails", async () => {
    vi.mocked(studyPlanApi.getTodayPlan).mockRejectedValue(new Error("boom"));
    renderPage();

    expect(await screen.findByText("Չկարողացանք բեռնել այսօրվա պլանը։")).toBeInTheDocument();

    vi.mocked(studyPlanApi.getTodayPlan).mockResolvedValue(PLAN);
    await userEvent.click(screen.getByRole("button", { name: /Փորձել կրկին/ }));

    expect(await screen.findByRole("heading", { level: 1, name: "Ուսումնական պլան" })).toBeInTheDocument();
  });

  it("explains what to do when there is not enough data for a plan", async () => {
    vi.mocked(studyPlanApi.getTodayPlan).mockResolvedValue({
      ...PLAN,
      tasks: [],
      coach: { ...PLAN.coach, today: { ...PLAN.coach.today, done_count: 0, total_count: 0 } },
    });
    renderPage();

    expect(
      await screen.findByText(/Դեռ բավարար տվյալներ չկան անհատական պլան կազմելու համար/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Սկսել վարժություններից/ })).toBeInTheDocument();
  });
});
