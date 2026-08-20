import { useState, type FormEvent } from "react";
import { Laptop, Smartphone } from "lucide-react";
import { changePassword } from "../../api/auth";
import * as sessionsApi from "../../api/sessions";
import type { DeviceSession } from "../../api/sessions";
import { useAuth } from "../../auth/AuthContext";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ErrorState } from "../ui/ErrorState";
import { PasswordField, FormAlert } from "../ui/Field";
import { Skeleton } from "../ui/Skeleton";

/*
  Password and devices are one section because they answer one question —
  "who can get into my account, and how" — and because splitting them is what
  put the device list on a page of its own at /account/sessions, reachable
  only from a grey text link on the profile. A student who suspects someone
  else is using their login had to already know that page existed.
*/

type PasswordErrors = { current?: string; next?: string; confirm?: string };

function ChangePassword() {
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const hasPassword = user?.has_usable_password ?? true;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Validation lands on the field that caused it. Previously all three of
    // these were toasts: a message about the password rules appeared in the
    // corner of the screen, disappeared on a timer, and left the student to
    // work out which of three identical-looking boxes it meant.
    const next: PasswordErrors = {};
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      next.next = "Առնվազն 8 նիշ, տառերով և թվերով։";
    }
    if (newPassword !== confirmNewPassword) {
      next.confirm = "Գաղտնաբառերը չեն համընկնում։";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword, confirmNewPassword);
      showSuccess(hasPassword ? "Գաղտնաբառը փոփոխվեց։" : "Գաղտնաբառը սահմանվեց։");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      // The one failure the server owns and the client cannot predict is
      // "your current password is wrong", so it lands on that field.
      const message = extractErrorMessage(err, "Չհաջողվեց փոխել գաղտնաբառը։");
      if (hasPassword) setErrors({ current: message });
      else setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h3 className="text-[length:var(--text-lg)] font-semibold leading-[var(--leading-heading)] text-text">
        {hasPassword ? "Գաղտնաբառ" : "Սահմանել գաղտնաբառ"}
      </h3>
      <p className="mt-[var(--space-1)] max-w-[var(--measure-base)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
        {hasPassword
          ? "Փոխեք գաղտնաբառը, եթե կասկածում եք, որ ուրիշը գիտի այն։"
          : "Ձեր հաշիվը մուտք է գործել Google-ով կամ Apple-ով և դեռ գաղտնաբառ չունի։ Սահմանեք մեկը՝ նաև գաղտնաբառով մուտք գործելու համար։"}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-[var(--space-4)] max-w-md">
        {formError && <FormAlert message={formError} />}

        <div className="flex flex-col gap-[var(--space-4)]">
          {hasPassword && (
            <PasswordField
              label="Ընթացիկ գաղտնաբառ"
              value={currentPassword}
              onChange={(v) => {
                setCurrentPassword(v);
                setErrors((prev) => ({ ...prev, current: undefined }));
              }}
              error={errors.current}
              autoComplete="current-password"
              name="current-password"
              required
            />
          )}
          <PasswordField
            label="Նոր գաղտնաբառ"
            hint="Առնվազն 8 նիշ, տառերով և թվերով։"
            value={newPassword}
            onChange={(v) => {
              setNewPassword(v);
              setErrors((prev) => ({ ...prev, next: undefined }));
            }}
            error={errors.next}
            autoComplete="new-password"
            name="new-password"
            required
          />
          <PasswordField
            label="Կրկնել նոր գաղտնաբառը"
            value={confirmNewPassword}
            onChange={(v) => {
              setConfirmNewPassword(v);
              setErrors((prev) => ({ ...prev, confirm: undefined }));
            }}
            error={errors.confirm}
            autoComplete="new-password"
            name="confirm-new-password"
            required
          />
        </div>

        <Button type="submit" loading={submitting} className="mt-[var(--space-5)]">
          {hasPassword ? "Պահպանել նոր գաղտնաբառը" : "Սահմանել գաղտնաբառ"}
        </Button>
      </form>
    </Card>
  );
}

function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString("hy-AM", { dateStyle: "medium", timeStyle: "short" });
}

function isPhone(session: DeviceSession): boolean {
  return /android|ios|iphone|ipad|mobile/i.test(`${session.platform} ${session.browser}`);
}

function DeviceRow({
  session,
  onRevoke,
  revoking,
}: {
  session: DeviceSession;
  onRevoke: () => void;
  revoking: boolean;
}) {
  const Icon = isPhone(session) ? Smartphone : Laptop;

  return (
    <li className="flex flex-wrap items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)] border border-border bg-bg p-[var(--space-4)]">
      <div className="flex min-w-0 flex-1 items-start gap-[var(--space-3)]">
        <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-text-muted" aria-hidden />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-medium text-text">
            {session.platform || "Անհայտ սարք"}
            {session.browser && <span className="text-text-muted">· {session.browser}</span>}
            {session.is_current && (
              <span className="rounded-full border border-primary-line bg-primary-bg px-[var(--space-2)] py-0.5 text-[length:var(--text-xs)] font-medium text-primary">
                Այս սարքը
              </span>
            )}
          </p>
          <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] leading-[var(--leading-body)] text-text-muted">
            Վերջին ակտիվությունը՝ {formatMoment(session.last_activity_at)}
            <span className="block">Մուտք՝ {formatMoment(session.created_at)}</span>
          </p>
        </div>
      </div>
      {!session.is_current && (
        <Button variant="ghost" size="sm" onClick={onRevoke} loading={revoking} className="shrink-0">
          Անջատել
        </Button>
      )}
    </li>
  );
}

function Devices() {
  const { showError, showSuccess } = useToast();
  const sessions = useAsyncResource(() => sessionsApi.fetchSessions(), []);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<DeviceSession | null>(null);

  async function revoke(session: DeviceSession) {
    setRevokingId(session.id);
    try {
      await sessionsApi.revokeSession(session.id);
      sessions.setData((sessions.data ?? []).filter((s) => s.id !== session.id));
      setConfirmTarget(null);
      showSuccess("Սարքն անջատվեց։");
    } catch {
      // Previously this surfaced in a MessageModal at page level, which meant
      // a failure to disconnect one device covered the whole list.
      setConfirmTarget(null);
      showError("Չհաջողվեց անջատել սարքը։ Փորձեք նորից։");
    } finally {
      setRevokingId(null);
    }
  }

  const list = sessions.data;

  return (
    <Card className="mt-[var(--space-5)]">
      <h3 className="text-[length:var(--text-lg)] font-semibold leading-[var(--leading-heading)] text-text">
        Ակտիվ սարքեր
      </h3>
      <p className="mt-[var(--space-1)] max-w-[var(--measure-base)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
        Միաժամանակ կարող են մուտք գործած լինել առավելագույնը 2 սարք։ Անջատեք այն սարքը, որն այլևս ձերը չէ։
      </p>

      <div className="mt-[var(--space-4)]">
        {sessions.error !== null && !sessions.isLoading ? (
          <ErrorState title="Չհաջողվեց բեռնել սարքերի ցանկը։" onRetry={sessions.retry} />
        ) : sessions.isLoading ? (
          <div className="flex flex-col gap-[var(--space-3)]" aria-busy="true">
            <Skeleton className="h-[86px] rounded-[var(--radius-md)]" />
            <Skeleton className="h-[86px] rounded-[var(--radius-md)]" />
          </div>
        ) : !list || list.length === 0 ? (
          <p className="text-[length:var(--text-sm)] text-text-muted">Ակտիվ սարքեր չկան։</p>
        ) : (
          <ul className="flex flex-col gap-[var(--space-3)]">
            {list.map((session) => (
              <DeviceRow
                key={session.id}
                session={session}
                revoking={revokingId === session.id}
                onRevoke={() => setConfirmTarget(session)}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmTarget(null);
        }}
        title="Անջատե՞լ այս սարքը"
        description={
          confirmTarget
            ? `${confirmTarget.platform || "Անհայտ սարք"}${
                confirmTarget.browser ? ` · ${confirmTarget.browser}` : ""
              } — այդ սարքից հաշիվը դուրս կգա, իսկ ձեր ուսումնական տվյալները մնում են անփոփոխ։`
            : undefined
        }
        confirmLabel="Անջատել"
        busy={revokingId !== null}
        onConfirm={() => confirmTarget && revoke(confirmTarget)}
      />
    </Card>
  );
}

export function SecuritySection() {
  return (
    <>
      <ChangePassword />
      <Devices />
    </>
  );
}
