import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LearningProfilePage } from "../LearningProfilePage";
import { ToastProvider } from "../../context/ToastContext";
import * as profileApi from "../../api/profile";
import * as knowledgeApi from "../../api/knowledge";
import * as practiceApi from "../../api/practice";
import type { LearningPreferences, StudentSubjectInterest, StudyAvailability } from "../../api/profile";
import type { MasteryScore } from "../../api/knowledge";

vi.mock("../../api/profile");
vi.mock("../../api/knowledge");
vi.mock("../../api/practice");

const MATH_INTEREST: StudentSubjectInterest = {
  id: 10,
  subject_key: "math",
  subject_label: "Մաթեմատիկա",
  is_active: true,
  priority: "high",
  target_note: "",
  exam: null,
  start_date: null,
  metadata: {},
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

const SCORES: MasteryScore[] = [
  {
    subject_key: "math",
    subject_label: "Մաթեմատիկա",
    mastery_score: 48,
    attempts_count: 40,
    correct_count: 19,
    data_sufficiency: "medium",
    last_activity_at: null,
    updated_at: "2026-08-01T00:00:00Z",
  },
];

const AVAILABILITY: StudyAvailability = {
  preferred_days: [0, 2],
  preferred_start_time: "19:00",
  typical_session_minutes: 30,
  min_daily_minutes: 20,
  max_daily_minutes: 60,
  timezone: "",
  updated_at: "2026-08-01T00:00:00Z",
};

const PREFERENCES: LearningPreferences = {
  explanation_style: "mixed",
  hints_before_answers: true,
  preferred_language: "",
  updated_at: "2026-08-01T00:00:00Z",
};

const CADENCE = {
  mock_exams_per_week: 1,
  preferred_test_days: [],
  preferred_test_time: null,
  configured_at: null,
  updated_at: "2026-08-01T00:00:00Z",
};

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <LearningProfilePage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe("LearningProfilePage", () => {
  beforeEach(() => {
    vi.mocked(profileApi.fetchSubjectInterests).mockResolvedValue([MATH_INTEREST]);
    vi.mocked(profileApi.fetchGoals).mockResolvedValue([]);
    vi.mocked(profileApi.fetchExams).mockResolvedValue([]);
    vi.mocked(profileApi.fetchStudyAvailability).mockResolvedValue(AVAILABILITY);
    vi.mocked(profileApi.fetchLearningPreferences).mockResolvedValue(PREFERENCES);
    vi.mocked(profileApi.fetchCoachPreferences).mockResolvedValue(CADENCE);
    vi.mocked(profileApi.updateStudyAvailability).mockImplementation(async (p) => ({
      ...AVAILABILITY,
      ...p,
    }));
    vi.mocked(profileApi.deleteSubjectInterest).mockResolvedValue(undefined);
    vi.mocked(knowledgeApi.fetchSubjectMasteryScores).mockResolvedValue(SCORES);
    vi.mocked(knowledgeApi.fetchTopicMasteryScores).mockResolvedValue([]);
    vi.mocked(practiceApi.getHierarchy).mockResolvedValue([]);
  });

  it("loads each shared endpoint exactly once for the whole page", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Իմ ուսումնական պրոֆիլը/ });

    // The hero used to re-fetch all four alongside the sections that own them.
    expect(profileApi.fetchSubjectInterests).toHaveBeenCalledTimes(1);
    expect(profileApi.fetchGoals).toHaveBeenCalledTimes(1);
    expect(profileApi.fetchExams).toHaveBeenCalledTimes(1);
    expect(knowledgeApi.fetchSubjectMasteryScores).toHaveBeenCalledTimes(1);
  });

  it("lets a student who accepts the default cadence record that choice", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Իմ ուսումնական պրոֆիլը/ });

    // Never configured, nothing changed — Save must still be reachable, or the
    // "choose a cadence" prompt is unsatisfiable for anyone happy as-is.
    const saveButtons = screen.getAllByRole("button", { name: "Պահպանել" });
    expect(saveButtons.some((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
  });

  it("names the next missing setup step as the page's primary action", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Իմ ուսումնական պրոֆիլը/ });

    // Subjects are set; goals are the first gap, so that's the CTA.
    expect(await screen.findByText(/Պրոֆիլդ \d+% պատրաստ է/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Սահմանիր նպատակ/ }).length).toBeGreaterThan(0);
  });

  it("opens the mastery detail on the weakest focused subject", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Իմ ուսումնական պրոֆիլը/ });

    // Maths is the only focused subject with a score, so its detail is open:
    // the headline number and the evidence behind it both belong to it.
    expect(await screen.findByText(/40 փորձ · 19 ճիշտ/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Միջին իմացություն" })).toHaveAttribute(
      "aria-valuenow",
      "48",
    );
  });

  it("expresses the daily budget as one range whose handles cannot cross", async () => {
    renderPage();
    const lowHandle = await screen.findByRole("slider", { name: "Նվազագույն" });
    const highHandle = screen.getByRole("slider", { name: "Առավելագույն" });

    expect(lowHandle).toHaveValue("20");
    expect(highHandle).toHaveValue("60");

    // Pushing the low handle past the high one carries it along, so an
    // impossible pair can never be submitted (the server rejects min > max).
    fireEvent.change(lowHandle, { target: { value: "100" } });
    await waitFor(() => expect(lowHandle).toHaveValue("100"));
    expect(highHandle).toHaveValue("100");

    // ...and the same in the other direction.
    fireEvent.change(highHandle, { target: { value: "45" } });
    await waitFor(() => expect(highHandle).toHaveValue("45"));
    expect(lowHandle).toHaveValue("45");
  });

  it("never lets the test-day chips exceed the weekly exam allowance", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Իմ ուսումնական պրոֆիլը/ });

    // Allowance is 1, so picking a second day must be impossible rather than
    // rejected on save — the server refuses days > allowance.
    await userEvent.click(screen.getByRole("button", { name: "Երկուշաբթի — թեստի օր" }));
    expect(screen.getByRole("button", { name: "Երկուշաբթի — թեստի օր" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Երեքշաբթի — թեստի օր" })).toBeDisabled();

    // Raising the allowance frees the rest up again.
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    expect(screen.getByRole("button", { name: "Երեքշաբթի — թեստի օր" })).toBeEnabled();
  });

  it("drops chosen test days when full exams are switched off entirely", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Իմ ուսումնական պրոֆիլը/ });

    await userEvent.click(screen.getByRole("button", { name: "Երկուշաբթի — թեստի օր" }));
    await userEvent.click(screen.getByRole("button", { name: "Ոչ մեկ" }));

    expect(screen.getByRole("button", { name: "Երկուշաբթի — թեստի օր" })).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByText(/Gitus-ը ընդհանրապես չի առաջարկի ամբողջական թեստեր/),
    ).toBeInTheDocument();
  });

  it("confirms before removing a subject focus, and says what is not lost", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Իմ ուսումնական պրոֆիլը/ });

    await userEvent.click(await screen.findByRole("button", { name: /Հեռացնել Մաթեմատիկա-ը ընտրվածներից/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Իմացության տվյալներդ չեն ջնջվի/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Հեռացնել" }));
    await waitFor(() => expect(profileApi.deleteSubjectInterest).toHaveBeenCalledWith(10));
  });

  it("survives one settings endpoint failing, and retries only that section", async () => {
    // A newly-shipped endpoint 404ing must not blank the six slices that
    // loaded fine — it cost the whole page once already.
    vi.mocked(profileApi.fetchCoachPreferences).mockRejectedValue(new Error("404"));
    renderPage();

    expect(await screen.findByRole("heading", { name: /Իմ ուսումնական պրոֆիլը/ })).toBeInTheDocument();
    expect(screen.getByText(/40 փորձ · 19 ճիշտ/)).toBeInTheDocument();
    expect(screen.getByText("Չհաջողվեց բեռնել թեստերի ռիթմը։")).toBeInTheDocument();
    expect(screen.queryByText(/Չհաջողվեց բեռնել քո ուսումնական պրոֆիլը/)).not.toBeInTheDocument();
  });

  it("offers a retry instead of a permanent skeleton when the load fails", async () => {
    vi.mocked(profileApi.fetchSubjectInterests).mockRejectedValue(new Error("boom"));
    renderPage();

    expect(await screen.findByText(/Չհաջողվեց բեռնել քո ուսումնական պրոֆիլը/)).toBeInTheDocument();

    vi.mocked(profileApi.fetchSubjectInterests).mockResolvedValue([MATH_INTEREST]);
    await userEvent.click(screen.getByRole("button", { name: /Փորձել կրկին/ }));

    expect(await screen.findByRole("heading", { name: /Իմ ուսումնական պրոֆիլը/ })).toBeInTheDocument();
  });
});
