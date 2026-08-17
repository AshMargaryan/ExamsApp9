import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { AlertCircle, AtSign, KeyRound, Mail, User } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import type { AccountRole } from "../../../api/auth";
import { GRADES, type Option, schoolSearch, universitySearch } from "../../../lib/registrationFields";
import { RolePicker } from "./RolePicker";
import { hapticError, hapticStep, hapticSuccess } from "../../../lib/haptics";
import { useUsernameAvailability } from "../../../hooks/useUsernameAvailability";
import { SearchSelect } from "../../SearchSelect";
import { AuthShell, AuthPrimaryButton } from "./AuthShell";
import { MobileTextField } from "./MobileTextField";
import { OAuthRow, hasOAuthProvider } from "./OAuthRow";
import { PasswordStrength, isPasswordValid } from "./PasswordStrength";

/*
  Signup as a sequence of small screens instead of the web form's single
  twelve-field scroll.

  The order is deliberate: identity questions anyone can answer come first, the
  password (the step most likely to bounce) sits where the user is already
  invested, and the optional statistics land last behind a visible "skip" —
  so an abandoned signup abandons at the end, with everything required already
  entered, rather than at the top of a wall of inputs.

  Each step validates on its own, so an error is shown next to the field that
  caused it while that field is still on screen.
*/

type Step = "role" | "name" | "account" | "password" | "profile";

const STEP_ORDER: Step[] = ["role", "name", "account", "password", "profile"];

/** The role picker is the entry screen, not a numbered step — the progress bar
 *  only starts counting once a role commits the user to the flow. */
const PROGRESS_STEPS = STEP_ORDER.length - 1;

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

export function MobileRegister() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<AccountRole | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [age, setAge] = useState("");
  const [grade, setGrade] = useState("");
  const [sex, setSex] = useState<"" | "male" | "female">("");
  const [school, setSchool] = useState<Option | null>(null);
  const [university, setUniversity] = useState<Option | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Asks the server whether the typed username is free, debounced and cached
  // so a whole name costs about one request. Advisory: submit still decides.
  const usernameCheck = useUsernameAvailability(username);

  const stepIndex = STEP_ORDER.indexOf(step);

  function goTo(next: Step) {
    setFormError(null);
    setStep(next);
  }

  function goBack() {
    if (stepIndex === 0) {
      navigate("/");
      return;
    }
    // Stepping back to the role picker clears the role, so the picker doesn't
    // render with a stale selection the user can't see.
    if (STEP_ORDER[stepIndex - 1] === "role") setRole(null);
    goTo(STEP_ORDER[stepIndex - 1]);
  }

  function advance(next: Step) {
    hapticStep();
    goTo(next);
  }

  function pickRole(picked: AccountRole) {
    setRole(picked);
    advance("name");
  }

  function submitName() {
    const errors: FieldErrors = {};
    if (!firstName.trim()) errors.firstName = "Լրացրու անունդ։";
    if (!lastName.trim()) errors.lastName = "Լրացրու ազգանունդ։";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      hapticError();
      return;
    }
    advance("account");
  }

  function submitAccount() {
    const errors: FieldErrors = {};
    if (username.trim().length < 3) errors.username = "Օգտանունը պետք է լինի առնվազն 3 նիշ։";
    else if (usernameCheck.status === "taken" || usernameCheck.status === "invalid") {
      errors.username = usernameCheck.detail;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Մուտքագրիր վավեր էլ. փոստ։";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      hapticError();
      return;
    }
    advance("password");
  }

  function submitPassword() {
    const errors: FieldErrors = {};
    if (!isPasswordValid(password)) errors.password = "Գաղտնաբառը չի բավարարում պահանջներին։";
    else if (password !== confirmPassword) errors.confirmPassword = "Գաղտնաբառերը չեն համընկնում։";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      hapticError();
      return;
    }
    advance("profile");
  }

  /** Maps a DRF field-error payload back onto the step that owns the field, so
   *  a server rejection reopens the right screen instead of dead-ending here. */
  function applyServerError(data: Record<string, unknown>) {
    const usernameErr = data.username;
    if (usernameErr && typeof usernameErr === "object" && !Array.isArray(usernameErr) && "suggestions" in usernameErr) {
      const { message, suggestions } = usernameErr as { message: string; suggestions: string[] };
      setFieldErrors({ username: message });
      setUsernameSuggestions(suggestions);
      goTo("account");
      return;
    }
    if (data.username || data.email) {
      setFieldErrors({
        username: data.username ? String([data.username].flat()[0]) : undefined,
        email: data.email ? String([data.email].flat()[0]) : undefined,
      });
      goTo("account");
      return;
    }
    if (data.password) {
      setFieldErrors({ password: String([data.password].flat()[0]) });
      goTo("password");
      return;
    }
    const firstError = Object.values(data).flat()[0];
    setFormError((firstError as string) ?? "Գրանցումը ձախողվեց։");
  }

  async function finish() {
    if (!role) return;
    setSubmitting(true);
    setFormError(null);
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
      hapticSuccess();
      navigate("/verify-email");
    } catch (err) {
      hapticError();
      if (err instanceof AxiosError && err.response?.data) {
        applyServerError(err.response.data as Record<string, unknown>);
      } else {
        setFormError("Գրանցումը ձախողվեց։");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const errorBanner = formError && (
    <div
      role="alert"
      className="mb-5 flex items-start gap-2.5 rounded-2xl border border-incorrect/40 bg-incorrect/10 px-4 py-3 text-[14px] text-incorrect"
    >
      <AlertCircle size={17} strokeWidth={2} className="mt-px flex-none" />
      {formError}
    </div>
  );

  const progress = step === "role" ? undefined : { step: stepIndex, total: PROGRESS_STEPS };

  if (step === "role") {
    return (
      <AuthShell
        onBack={() => navigate("/")}
        showLogo
        title="Եկ սկսենք"
        subtitle="Ընտրիր, թե ով ես դու — մնացածը կհարմարեցնենք քեզ։"
        footer={
          <p className="text-center text-[14px] text-text-muted">
            Արդեն հաշիվ ունե՞ս{" "}
            <Link to="/login" className="font-semibold text-primary">
              Մուտք
            </Link>
          </p>
        }
      >
        <RolePicker onPick={pickRole} />

        {hasOAuthProvider && <OAuthRow getRedirectPath={(user) => (user.role === "parent" ? "/family" : "/")} />}
      </AuthShell>
    );
  }

  if (step === "name") {
    return (
      <AuthShell
        onBack={goBack}
        progress={progress}
        title="Ինչպե՞ս քեզ դիմենք"
        subtitle="Այս անունը կերևա քո պրոֆիլում և դասակարգման աղյուսակում։"
        footer={
          <AuthPrimaryButton onClick={submitName} disabled={!firstName.trim() || !lastName.trim()}>
            Շարունակել
          </AuthPrimaryButton>
        }
      >
        {errorBanner}
        <MobileTextField
          label="Անուն"
          value={firstName}
          onValueChange={(v) => {
            setFirstName(v);
            setFieldErrors((e) => ({ ...e, firstName: undefined }));
          }}
          error={fieldErrors.firstName}
          icon={<User size={18} strokeWidth={1.75} />}
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="next"
          showValid
        />
        <MobileTextField
          label="Ազգանուն"
          value={lastName}
          onValueChange={(v) => {
            setLastName(v);
            setFieldErrors((e) => ({ ...e, lastName: undefined }));
          }}
          error={fieldErrors.lastName}
          icon={<User size={18} strokeWidth={1.75} />}
          autoComplete="family-name"
          autoCapitalize="words"
          enterKeyHint="next"
          showValid
        />
      </AuthShell>
    );
  }

  // Suggestions come from the live check while typing, and from the register
  // endpoint when a name is taken between the check and submit.
  const suggestions = usernameSuggestions ?? usernameCheck.suggestions;
  const usernameTakenMessage =
    usernameCheck.status === "taken" || usernameCheck.status === "invalid" ? usernameCheck.detail : undefined;
  const usernameHint =
    usernameCheck.status === "available" ? "Ազատ է 🎉" : "Կարող ես փոխել 14 օրը մեկ անգամ։";

  if (step === "account") {
    return (
      <AuthShell
        onBack={goBack}
        progress={progress}
        title="Քո հաշիվը"
        subtitle="Օգտանունով կմտնես համակարգ, էլ. փոստը պետք է հաստատման համար։"
        footer={
          <AuthPrimaryButton
            onClick={submitAccount}
            // Blocked while a verdict is pending or negative, so nobody gets to
            // the password step on a username that's already gone.
            disabled={
              !username.trim() ||
              !email.trim() ||
              usernameCheck.status === "checking" ||
              usernameCheck.status === "taken" ||
              usernameCheck.status === "invalid"
            }
          >
            Շարունակել
          </AuthPrimaryButton>
        }
      >
        {errorBanner}
        <MobileTextField
          label="Օգտանուն"
          value={username}
          onValueChange={(v) => {
            setUsername(v);
            setFieldErrors((e) => ({ ...e, username: undefined }));
            setUsernameSuggestions(null);
          }}
          error={fieldErrors.username ?? usernameTakenMessage}
          hint={usernameHint}
          icon={<AtSign size={18} strokeWidth={1.75} />}
          busy={usernameCheck.status === "checking"}
          showValid={usernameCheck.status === "available"}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
        />

        {suggestions.length > 0 && (
          <div className="mb-5 -mt-1">
            <p className="mb-2 text-[13px] text-text-muted">Ազատ տարբերակներ․</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setUsername(suggestion);
                    setFieldErrors((e) => ({ ...e, username: undefined }));
                    setUsernameSuggestions(null);
                    hapticStep();
                  }}
                  className="rounded-full border border-primary/40 bg-primary/10 px-3.5 py-2 text-[13px] font-medium text-primary active:scale-95"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <MobileTextField
          label="Էլ. փոստ"
          value={email}
          onValueChange={(v) => {
            setEmail(v);
            setFieldErrors((e) => ({ ...e, email: undefined }));
          }}
          error={fieldErrors.email}
          icon={<Mail size={18} strokeWidth={1.75} />}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          showValid
        />
      </AuthShell>
    );
  }

  if (step === "password") {
    return (
      <AuthShell
        onBack={goBack}
        progress={progress}
        title="Ապահովիր հաշիվդ"
        subtitle="Ընտրիր գաղտնաբառ, որը հեշտ կհիշես, բայց ուրիշները չեն գուշակի։"
        footer={
          <AuthPrimaryButton
            onClick={submitPassword}
            disabled={!isPasswordValid(password) || confirmPassword.length === 0}
          >
            Շարունակել
          </AuthPrimaryButton>
        }
      >
        {errorBanner}
        <MobileTextField
          label="Գաղտնաբառ"
          value={password}
          onValueChange={(v) => {
            setPassword(v);
            setFieldErrors((e) => ({ ...e, password: undefined }));
          }}
          error={fieldErrors.password}
          icon={<KeyRound size={18} strokeWidth={1.75} />}
          revealable
          // "new-password" is what makes iOS offer to generate and save a
          // strong password instead of autofilling the existing one.
          autoComplete="new-password"
          enterKeyHint="next"
        />
        <PasswordStrength password={password} />
        <MobileTextField
          label="Կրկնիր գաղտնաբառը"
          value={confirmPassword}
          onValueChange={(v) => {
            setConfirmPassword(v);
            setFieldErrors((e) => ({ ...e, confirmPassword: undefined }));
          }}
          error={fieldErrors.confirmPassword}
          icon={<KeyRound size={18} strokeWidth={1.75} />}
          revealable
          autoComplete="new-password"
          enterKeyHint="done"
          showValid={password.length > 0 && confirmPassword === password}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      onBack={goBack}
      progress={progress}
      title="Վերջին քայլը"
      subtitle="Այս դաշտերն ընտրովի են և օգտագործվում են միայն վիճակագրության համար։"
      footer={
        <div className="flex flex-col gap-3">
          <AuthPrimaryButton onClick={finish} loading={submitting}>
            Ստեղծել հաշիվ
          </AuthPrimaryButton>
          <button
            type="button"
            onClick={finish}
            disabled={submitting}
            className="py-1 text-center text-[14px] font-medium text-text-muted disabled:opacity-40"
          >
            Բաց թողնել
          </button>
        </div>
      }
    >
      {errorBanner}

      <MobileTextField
        label="Տարիք"
        value={age}
        onValueChange={setAge}
        type="number"
        inputMode="numeric"
        min={1}
        max={120}
        enterKeyHint="next"
      />

      <p className="mb-2 px-1 text-[13px] font-medium text-text-muted">Սեռ</p>
      <div className="mb-5 flex gap-2">
        {[
          { value: "", label: "Չընտրված" },
          { value: "male", label: "Արական" },
          { value: "female", label: "Իգական" },
        ].map((option) => (
          <button
            key={option.value || "none"}
            type="button"
            onClick={() => {
              setSex(option.value as "" | "male" | "female");
              hapticStep();
            }}
            aria-pressed={sex === option.value}
            className={`flex-1 rounded-xl border py-3 text-[14px] font-medium transition-colors active:scale-95 ${
              sex === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {role === "student" && (
        <>
          <p className="mb-2 px-1 text-[13px] font-medium text-text-muted">Դասարան</p>
          <div className="mb-5 flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGrade(grade === String(g) ? "" : String(g));
                  hapticStep();
                }}
                aria-pressed={grade === String(g)}
                className={`h-11 w-11 rounded-xl border text-[14px] font-semibold transition-colors active:scale-90 ${
                  grade === String(g)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-text-muted"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <p className="mb-2 px-1 text-[13px] font-medium text-text-muted">Դպրոց</p>
          <div className="mb-5">
            <SearchSelect placeholder="Փնտրիր դպրոց..." value={school} onChange={setSchool} search={schoolSearch} />
          </div>

          <p className="mb-2 px-1 text-[13px] font-medium text-text-muted">Բուհ, որին ուզում ես դիմել</p>
          <div className="mb-5">
            <SearchSelect
              placeholder="Փնտրիր բուհ..."
              value={university}
              onChange={setUniversity}
              search={universitySearch}
            />
          </div>
        </>
      )}
    </AuthShell>
  );
}
