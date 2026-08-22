import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AxiosError } from "axios";
import { SearchSelect } from "../components/SearchSelect";
import { AuthScreen, AuthSubmitButton } from "../components/auth/AuthScreen";
import { Field, FormAlert, PasswordField } from "../components/ui/Field";
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
  /*
    Field-level validation, so "the password is too short" appears under the
    password rather than in a modal the person has to dismiss before they can
    reach the field it is about.
  */
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function closeError() {
    setError(null);
    setUsernameSuggestions(null);
    setPasswordError(null);
    setConfirmError(null);
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
      setPasswordError("Գաղտնաբառը պետք է լինի առնվազն 8 նիշ և պարունակի տառեր ու թվեր։");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmError("Գաղտնաբառերը չեն համընկնում։");
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

  if (!role) {
    return (
      <AuthScreen title="Գրանցում" subtitle="Ընտրիր, թե ինչպես ես ցանկանում գրանցվել">
        {ROLE_CARDS.map((card) => (
          <button
            key={card.role}
            type="button"
            onClick={() => setRole(card.role)}
            className="mb-4 w-full rounded-[var(--radius)] border border-border bg-bg p-4 text-left transition-colors hover:border-primary last:mb-0"
          >
            <span className="block font-medium text-text">{card.title}</span>
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
    >
      {error && (
        <FormAlert
          message={error}
          suggestions={usernameSuggestions ?? undefined}
          onSelectSuggestion={pickSuggestion}
        />
      )}

      <Field
        label="Օգտանուն"
        hint="Օգտանունը հետագայում կկարողանաք փոխել 14 օրը մեկ անգամ։"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        name="username"
        autoFocus
        required
      />

      <Field
        label="Անուն"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        autoComplete="given-name"
        name="given-name"
        required
      />

      <Field
        label="Ազգանուն"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        autoComplete="family-name"
        name="family-name"
        required
      />

      <Field
        label="Էլ. փոստ"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        name="email"
        required
      />

      <PasswordField
        label="Գաղտնաբառ"
        hint="Առնվազն 8 նիշ, պետք է պարունակի տառեր և թվեր։"
        error={passwordError}
        value={password}
        onChange={(v) => {
          setPassword(v);
          if (passwordError) setPasswordError(null);
        }}
        autoComplete="new-password"
        name="new-password"
        minLength={8}
        required
      />

      <PasswordField
        label="Կրկնել գաղտնաբառը"
        error={confirmError}
        value={confirmPassword}
        onChange={(v) => {
          setConfirmPassword(v);
          if (confirmError) setConfirmError(null);
        }}
        autoComplete="new-password"
        name="confirm-password"
        minLength={8}
        required
      />

      <div className="mb-[var(--space-4)] mt-[var(--space-2)] border-t border-border pt-[var(--space-4)] text-[length:var(--text-sm)] text-text-muted">
        Հետևյալ դաշտերը <span className="font-medium text-text">ընտրովի են</span> և կօգտագործվեն միայն
        վիճակագրության համար։
      </div>

      <Field
        label="Տարիք"
        type="number"
        min={1}
        max={120}
        value={age}
        onChange={(e) => setAge(e.target.value)}
        name="age"
      />

      <Field label="Սեռ">
        {(control) => (
          <select
            {...control}
            value={sex}
            onChange={(e) => setSex(e.target.value as "" | "male" | "female")}
          >
            <option value="">Չընտրված</option>
            <option value="male">Արական</option>
            <option value="female">Իգական</option>
          </select>
        )}
      </Field>

      {role === "student" && (
        <>
          <Field label="Դասարան">
            {(control) => (
              <select {...control} value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">Չընտրված</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}-րդ դասարան
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Դպրոց">
            {() => (
              <SearchSelect
                placeholder="Փնտրիր դպրոց..."
                value={school}
                onChange={setSchool}
                search={schoolSearch}
              />
            )}
          </Field>

          <Field label="Բուհ, որին ցանկանում ես դիմել">
            {() => (
              <SearchSelect
                placeholder="Փնտրիր բուհ..."
                value={university}
                onChange={setUniversity}
                search={universitySearch}
              />
            )}
          </Field>
        </>
      )}

      <AuthSubmitButton loading={submitting}>Գրանցվել</AuthSubmitButton>

      <p className="mt-4 text-center text-sm text-text-muted">
        Արդեն հաշիվ ունե՞ք։{" "}
        <Link to="/login" className="text-primary hover:underline">
          Մուտք
        </Link>
      </p>
    </AuthScreen>
  );
}
