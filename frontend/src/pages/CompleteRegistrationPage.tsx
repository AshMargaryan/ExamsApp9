import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../auth/AuthContext";
import { SearchSelect } from "../components/SearchSelect";
import { MessageModal } from "../components/MessageModal";
import { Button } from "../components/ui/Button";
import type { AccountRole } from "../api/auth";
import { GRADES, ROLE_CARDS, ROLE_LABELS, type Option, schoolSearch, universitySearch } from "../lib/registrationFields";

interface LocationState {
  ticket: string;
  email: string;
  first_name: string;
  last_name: string;
}

export function CompleteRegistrationPage() {
  const { completeOAuthRegistration } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [role, setRole] = useState<AccountRole | null>(null);

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState(state?.first_name ?? "");
  const [lastName, setLastName] = useState(state?.last_name ?? "");

  const [age, setAge] = useState("");
  const [grade, setGrade] = useState("");
  const [sex, setSex] = useState<"" | "male" | "female">("");
  const [school, setSchool] = useState<Option | null>(null);
  const [university, setUniversity] = useState<Option | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A hard refresh or direct visit has no ticket in router state — the OAuth
  // flow has to be restarted from the login/register page.
  if (!state?.ticket) {
    return <Navigate to="/register" replace />;
  }

  function closeError() {
    setError(null);
    setUsernameSuggestions(null);
  }

  function pickSuggestion(suggestion: string) {
    setUsername(suggestion);
    closeError();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    closeError();
    if (!role || !state) return;

    setSubmitting(true);
    try {
      const user = await completeOAuthRegistration({
        ticket: state.ticket,
        username,
        first_name: firstName,
        last_name: lastName,
        role,
        age: age ? Number(age) : undefined,
        grade: role === "student" && grade ? Number(grade) : undefined,
        sex: sex || undefined,
        school: role === "student" ? school?.id : undefined,
        university: role === "student" ? university?.id : undefined,
      });
      navigate(user.role === "parent" ? "/family" : "/");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as Record<string, unknown>;
        const usernameErr = data.username;
        if (usernameErr && typeof usernameErr === "object" && !Array.isArray(usernameErr) && "suggestions" in usernameErr) {
          const { message, suggestions } = usernameErr as { message: string; suggestions: string[] };
          setError(message);
          setUsernameSuggestions(suggestions);
        } else {
          const firstError = Object.values(data).flat()[0];
          setError((firstError as string) ?? "Գրանցումը ձախողվեց։");
        }
      } else {
        setError("Գրանցումը ձախողվեց։");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary";
  const labelClass = "mb-1 block text-sm text-text-muted";

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
        <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-semibold text-text">Ավարտել գրանցումը</h1>
          <p className="mb-6 text-sm text-text-muted">Ընտրիր, թե ինչպես ես ցանկանում գրանցվել</p>

          {ROLE_CARDS.map((card) => (
            <button
              key={card.role}
              type="button"
              onClick={() => setRole(card.role)}
              className="mb-4 w-full rounded-md border border-border bg-bg p-4 text-left transition-colors hover:border-primary last:mb-0"
            >
              <span className="block font-medium text-text">{card.title}</span>
              <span className="mt-1 block text-sm text-text-muted">{card.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-sm"
      >
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Ավարտել գրանցումը ({ROLE_LABELS[role]})</h1>
          <Button variant="secondary" size="sm" onClick={() => setRole(null)}>
            Փոխել
          </Button>
        </div>

        <label className={labelClass}>Էլ. փոստ</label>
        <input className={inputClass} value={state.email} disabled />

        <label className={labelClass}>Օգտանուն</label>
        <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
        <p className="-mt-3 mb-4 text-xs text-text-muted">
          Օգտանունը հետագայում կկարողանաք փոխել 14 օրը մեկ անգամ։
        </p>

        <label className={labelClass}>Անուն</label>
        <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />

        <label className={labelClass}>Ազգանուն</label>
        <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required />

        <div className="mb-4 mt-2 border-t border-border pt-4 text-sm text-text-muted">
          Հետևյալ դաշտերը <span className="font-medium text-text">ընտրովի են</span> և կօգտագործվեն միայն
          վիճակագրության համար։
        </div>

        <label className={labelClass}>Տարիք</label>
        <input
          type="number"
          min={1}
          max={120}
          className={inputClass}
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />

        <label className={labelClass}>Սեռ</label>
        <select className={inputClass} value={sex} onChange={(e) => setSex(e.target.value as "" | "male" | "female")}>
          <option value="">Չընտրված</option>
          <option value="male">Արական</option>
          <option value="female">Իգական</option>
        </select>

        {role === "student" && (
          <>
            <label className={labelClass}>Դասարան</label>
            <select className={inputClass} value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">Չընտրված</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}-րդ դասարան
                </option>
              ))}
            </select>

            <label className={labelClass}>Դպրոց</label>
            <div className="mb-4">
              <SearchSelect placeholder="Փնտրիր դպրոց..." value={school} onChange={setSchool} search={schoolSearch} />
            </div>

            <label className={labelClass}>Բուհ, որին ցանկանում ես դիմել</label>
            <div className="mb-4">
              <SearchSelect
                placeholder="Փնտրիր բուհ..."
                value={university}
                onChange={setUniversity}
                search={universitySearch}
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? "..." : "Ավարտել գրանցումը"}
        </button>
      </form>
      {error && (
        <MessageModal
          message={error}
          onClose={closeError}
          suggestions={usernameSuggestions ?? undefined}
          onSelectSuggestion={pickSuggestion}
        />
      )}
    </div>
  );
}
