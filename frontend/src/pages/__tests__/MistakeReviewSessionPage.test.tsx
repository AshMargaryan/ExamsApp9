import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MistakeReviewSessionPage } from "../MistakeReviewSessionPage";
import { ToastProvider } from "../../context/ToastContext";
import { AssistantLaunchProvider } from "../../contexts/AssistantLaunchContext";
import * as mistakesApi from "../../api/mistakes";
import type { MistakeEntry } from "../../api/mistakes";
import { taskHref } from "../../components/study-plan/planFormat";
import type { StudyTask } from "../../api/studyPlan";

vi.mock("../../api/mistakes");

function entry(overrides: Partial<MistakeEntry> & Pick<MistakeEntry, "id">): MistakeEntry {
  return {
    source: "practice",
    mistake_type: "incorrect",
    subject_name: "Մաթեմատիկա",
    topic_label: "Հանրահաշվական նույնություններ",
    question_type: "short_answer",
    question_text: "Պարզեցրու (a+b)^2",
    render_data: {},
    your_answer_text: "a^2+b^2",
    correct_answer_text: "a^2+2ab+b^2",
    explanation: "Միջին անդամը բաց է թողնված։",
    hint: "",
    created_at: "2026-08-16T10:00:00Z",
    retry_count: 0,
    last_retried_at: null,
    last_retry_correct: null,
    retryable: true,
    error_category: "unclassified",
    error_category_display: "Դեռ չդասակարգված",
    error_explanation: "",
    classified_at: null,
    ...overrides,
  };
}

function renderAt(url: string) {
  return render(
    <ToastProvider>
      <AssistantLaunchProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/mistake-notebook/review" element={<MistakeReviewSessionPage />} />
            <Route path="/study-plan" element={<p>ՊԼԱՆ</p>} />
          </Routes>
        </MemoryRouter>
      </AssistantLaunchProvider>
    </ToastProvider>,
  );
}

const SESSION_URL =
  "/mistake-notebook/review?subject=%D5%84%D5%A1%D5%A9%D5%A5%D5%B4%D5%A1%D5%BF%D5%AB%D5%AF%D5%A1&topic=%D5%80%D5%A1%D5%B6%D6%80%D5%A1%D5%B0%D5%A1%D5%B7%D5%BE%D5%A1%D5%AF%D5%A1%D5%B6%20%D5%B6%D5%B8%D6%82%D5%B5%D5%B6%D5%B8%D6%82%D5%A9%D5%B5%D5%B8%D6%82%D5%B6%D5%B6%D5%A5%D6%80";

describe("MistakeReviewSessionPage", () => {
  beforeEach(() => {
    vi.mocked(mistakesApi.listMistakes).mockResolvedValue([
      entry({ id: 1 }),
      entry({ id: 2, question_text: "Պարզեցրու (a-b)^2" }),
    ]);
  });

  it("requests only the subject and topic named in the URL", async () => {
    renderAt(SESSION_URL);
    await screen.findByText(/Պարզեցրու \(a\+b\)\^2/);

    expect(mistakesApi.listMistakes).toHaveBeenCalledWith({
      subject: "Մաթեմատիկա",
      topic: "Հանրահաշվական նույնություններ",
      source: undefined,
    });
  });

  it("shows one mistake at a time with its position in the set", async () => {
    renderAt(SESSION_URL);

    expect(await screen.findByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText(/Պարզեցրու \(a\+b\)\^2/)).toBeInTheDocument();
    expect(screen.queryByText(/Պարզեցրու \(a-b\)\^2/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Հաջորդը/ }));

    expect(await screen.findByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByText(/Պարզեցրու \(a-b\)\^2/)).toBeInTheDocument();
  });

  it("ends on a summary that leads back to the plan", async () => {
    renderAt(SESSION_URL);
    await screen.findByText("1 / 2");

    await userEvent.click(screen.getByRole("button", { name: /Հաջորդը/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Ավարտել/ }));

    expect(await screen.findByText("Վերանայումն ավարտված է")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Վերադառնալ պլանին/ }));
    expect(await screen.findByText("ՊԼԱՆ")).toBeInTheDocument();
  });

  it("treats an empty slice as good news, not an error", async () => {
    vi.mocked(mistakesApi.listMistakes).mockResolvedValue([]);
    renderAt(SESSION_URL);

    expect(
      await screen.findByText(/«Հանրահաշվական նույնություններ» թեմայում սխալներ չկան/),
    ).toBeInTheDocument();
  });

  it("offers a retry when the slice fails to load", async () => {
    vi.mocked(mistakesApi.listMistakes).mockRejectedValue(new Error("boom"));
    renderAt(SESSION_URL);

    expect(await screen.findByText("Չհաջողվեց բեռնել այս սխալները։")).toBeInTheDocument();

    vi.mocked(mistakesApi.listMistakes).mockResolvedValue([entry({ id: 1 })]);
    await userEvent.click(screen.getByRole("button", { name: /Փորձել կրկին/ }));
    expect(await screen.findByText("1 / 1")).toBeInTheDocument();
  });
});

describe("taskHref", () => {
  const base = {
    id: 1,
    order: 0,
    subject_name: "Մաթեմատիկա",
    topic_label: "Հանրահաշվական նույնություններ",
    title: "Կրկնիր 12 սխալ",
    blurb: "",
    estimated_minutes: 5,
    done: false,
    progress: null,
    check_in_feeling: null,
  };

  it("sends a mistake task to its own review session, not the whole notebook", () => {
    // Deliberately a *stale* link_path, as stored on plans generated before
    // the server started emitting the deep link.
    const task = { ...base, task_type: "mistake_retry", link_path: "/mistake-notebook" } as StudyTask;
    const href = taskHref(task);
    const url = new URL(href, "http://x");

    expect(url.pathname).toBe("/mistake-notebook/review");
    expect(url.searchParams.get("subject")).toBe("Մաթեմատիկա");
    expect(url.searchParams.get("topic")).toBe("Հանրահաշվական նույնություններ");
  });

  it("leaves every other task type's link untouched", () => {
    const task = {
      ...base,
      task_type: "practice_weak_topic",
      link_path: "/practice/subtopic/7/medium",
    } as StudyTask;
    expect(taskHref(task)).toBe("/practice/subtopic/7/medium");
  });
});
