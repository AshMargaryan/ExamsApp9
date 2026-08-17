import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AxiosError } from "axios";
import { SearchSelect } from "../components/SearchSelect";
import { MessageModal } from "../components/MessageModal";
import { AuthScreen, AuthSubmitButton } from "../components/auth/AuthScreen";
import { OAuthButtons } from "../components/auth/OAuthButtons";
import { Button } from "../components/ui/Button";
import { MobileRegister } from "../components/mobile/auth/MobileRegister";
import { useIsNativeApp } from "../lib/platform";
import type { AccountRole, User } from "../api/auth";
import { GRADES, ROLE_CARDS, ROLE_LABELS, type Option, schoolSearch, universitySearch } from "../lib/registrationFields";

function oauthRedirectPath(user: User): string {
  return user.role === "parent" ? "/family" : "/";
}

export function RegisterPage() {
  // Native signup is a stepped flow rather than this single long form, so the
  // two are separate components sharing only the API payload shape.
  if (useIsNativeApp()) return <MobileRegister />;
  return <WebRegisterPage />;
}

function WebRegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<AccountRole | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [age, setAge] = useState("");
  const [grade, setGrade] = useState("");
  const [sex, setSex] = useState<"" | "male" | "female">("");
  const [school, setSchool] = useState<Option | null>(null);
  const [university, setUniversity] = useState<Option | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    if (!role) return;

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Գաղտնաբառը պետք է լինի առնվազն 8 նիշ և պարունակի տառեր ու թվեր։");
      return;
    }

    if (password !== confirmPassword) {
      setError("Գաղտնաբառերը չեն համընկնում։");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        username,
        email,
        password,
        confirm_password: confirmPassword,
        first_name: firstName,
        last_name: lastName,
        role,
        age: age ? Number(age) : undefined,
        grade: role === "student" && grade ? Number(grade) : undefined,
        sex: sex || undefined,
        school: role === "student" ? school?.id : undefined,
        university: role === "student" ? university?.id : undefined,
      });
      navigate("/verify-email");
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
      <AuthScreen title="Գրանցում" subtitle="Ընտրեք, թե ինչպես եք ցանկանում գրանցվել">
        {ROLE_CARDS.map((card) => (
          <button
            key={card.role}
            type="button"
            onClick={() => setRole(card.role)}
            className="mb-4 w-full rounded-md border border-border bg-bg p-4 text-left transition-colors hover:border-primary last:mb-0"
          >
            <span className="block font-medium text-text">
              {card.icon} {card.title}
            </span>
            <span className="mt-1 block text-sm text-text-muted">{card.description}</span>
          </button>
        ))}

        <OAuthButtons getRedirectPath={oauthRedirectPath} />

        <p className="mt-6 text-center text-sm text-text-muted">
          Արդեն հաշիվ ունե՞ք։{" "}
          <Link to="/login" className="text-primary hover:underline">
            Մուտք
          </Link>
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title={`Գրանցում (${ROLE_LABELS[role]})`}
      onBack={() => setRole(null)}
      headerAction={
        <Button variant="secondary" size="sm" onClick={() => setRole(null)}>
          Փոխել
        </Button>
      }
      onSubmit={handleSubmit}
      overlay={
        error ? (
          <MessageModal
            message={error}
            onClose={closeError}
            suggestions={usernameSuggestions ?? undefined}
            onSelectSuggestion={pickSuggestion}
          />
        ) : null
      }
    >
      <label className={labelClass}>Օգտանուն</label>
      <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
      <p className="-mt-3 mb-4 text-xs text-text-muted">
        Օգտանունը հետագայում կկարողանաք փոխել 14 օրը մեկ անգամ։
      </p>

      <label className={labelClass}>Անուն</label>
      <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />

      <label className={labelClass}>Ազգանուն</label>
      <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required />

      <label className={labelClass}>Էլ. փոստ</label>
      <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />

      <label className={labelClass}>Գաղտնաբառ</label>
      <input
        type="password"
        minLength={8}
        className={inputClass}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <p className="-mt-3 mb-4 text-xs text-text-muted">
        Առնվազն 8 նիշ, պետք է պարունակի տառեր և թվեր։
      </p>

      <label className={labelClass}>Կրկնել գաղտնաբառը</label>
      <input
        type="password"
        minLength={8}
        className={inputClass}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

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
            <SearchSelect placeholder="Փնտրեք դպրոց..." value={school} onChange={setSchool} search={schoolSearch} />
          </div>

          <label className={labelClass}>Բուհ, որին ցանկանում եք դիմել</label>
          <div className="mb-4">
            <SearchSelect
              placeholder="Փնտրեք բուհ..."
              value={university}
              onChange={setUniversity}
              search={universitySearch}
            />
          </div>
        </>
      )}

      <AuthSubmitButton disabled={submitting}>{submitting ? "..." : "Գրանցվել"}</AuthSubmitButton>

      <p className="mt-4 text-center text-sm text-text-muted">
        Արդեն հաշիվ ունե՞ք։{" "}
        <Link to="/login" className="text-primary hover:underline">
          Մուտք
        </Link>
      </p>
    </AuthScreen>
  );
}
