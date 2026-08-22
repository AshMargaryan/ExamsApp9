import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import * as teachingApi from "../../api/teaching";
import type { StudentSearchResult, TeacherStudentConnection } from "../../api/teaching";
import type { AccountRole } from "../../api/auth";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { SearchField } from "../ui/SearchField";
import { SkeletonRows } from "../ui/Skeleton";
import { Tabs, TabPanel } from "../ui/Tabs";

type Tab = "invitations" | "search";

function displayName(u: { username: string; first_name: string; last_name: string }) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.username;
}

function PersonRow({
  person,
  onOpenProfile,
  action,
}: {
  person: { id: number; username: string; first_name: string; last_name: string; avatar: string | null };
  onOpenProfile: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenProfile}
          title="Տեսնել պրոֆիլը"
          className="shrink-0 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Avatar src={person.avatar} name={displayName(person)} size="sm" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-text">{displayName(person)}</p>
          <p className="truncate text-xs text-text-muted">@{person.username}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

/** Rendered by parents as `{teachingOpen && <TeachingModal onClose={...} />}` — mounted
 *  only while open, so its invitation fetch and search-debounce effect don't run on
 *  every dashboard load. Modal itself always gets `open`, since Radix's close animation
 *  needs a render where `open` flips to false before the parent unmounts it. */
export function TeachingModal({
  role,
  onClose,
  onChange,
}: {
  role: AccountRole;
  onClose: () => void;
  onChange: () => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("invitations");
  const [invitations, setInvitations] = useState<TeacherStudentConnection[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadInvitations() {
    teachingApi.fetchInvitations().then(setInvitations);
  }

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    if (tab !== "search" || role !== "teacher") return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await teachingApi.searchStudents(query));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, tab, role]);

  async function handleSend(studentId: number) {
    setError(null);
    try {
      await teachingApi.sendInvitation(studentId);
      setResults(await teachingApi.searchStudents(query));
      loadInvitations();
    } catch (err) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(detail ?? "Հրավերն ուղարկելիս սխալ տեղի ունեցավ։");
    }
  }

  async function handleRespond(id: number, action: "accept" | "decline") {
    await teachingApi.respondToInvitation(id, action);
    loadInvitations();
    onChange();
  }

  async function handleCancel(id: number) {
    await teachingApi.cancelInvitation(id);
    loadInvitations();
  }

  const invitationsPanel = (
    <>
      {invitations === null && <SkeletonRows count={3} />}
      {invitations?.length === 0 && (
        <EmptyState size="sm" title={role === "teacher" ? "Ուղարկված հրավերներ չկան։" : "Հրավերներ չկան։"} />
      )}
      {invitations?.map((inv) => {
        const person = role === "teacher" ? inv.student : inv.teacher;
        return (
          <PersonRow
            key={inv.id}
            person={person}
            onOpenProfile={() => navigate(`/profile/${person.id}`)}
            action={
              role === "teacher" ? (
                <Button variant="ghost" size="sm" onClick={() => handleCancel(inv.id)} className="h-7 px-2 text-xs">
                  Չեղարկել
                </Button>
              ) : (
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleRespond(inv.id, "accept")} className="h-7 px-2 text-xs">
                    Ընդունել
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRespond(inv.id, "decline")} className="h-7 px-2 text-xs">
                    Մերժել
                  </Button>
                </div>
              )
            }
          />
        );
      })}
    </>
  );

  const searchPanel = (
    <>
      <SearchField
        autoFocus
        containerClassName="mb-3"
        label="Փնտրել օգտանունով"
        placeholder="Փնտրել օգտանունով…"
        value={query}
        onChange={setQuery}
      />
      {searching && <SkeletonRows count={2} />}
      {!searching && query && results?.length === 0 && <EmptyState size="sm" title="Ոչինչ չի գտնվել։" />}
      {!searching &&
        results?.map((u) => (
          <PersonRow
            key={u.id}
            person={u}
            onOpenProfile={() => navigate(`/profile/${u.id}`)}
            action={
              u.connection_status === "none" ? (
                <Button variant="secondary" size="sm" onClick={() => handleSend(u.id)} className="h-7 px-2 text-xs">
                  Հրավիրել
                </Button>
              ) : (
                <span className="shrink-0 text-sm text-text-muted">
                  {u.connection_status === "pending" ? "Ուղարկված է" : "Կապակցված է"}
                </span>
              )
            }
          />
        ))}
    </>
  );

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={role === "teacher" ? "Աշակերտների հրավերներ" : "Ուսուցիչների հրավերներ"}
      className="max-w-lg"
    >
      {role === "teacher" ? (
        <Tabs
          label="Հրավերների բաժիններ"
          value={tab}
          onChange={setTab}
          items={[
            { value: "invitations", label: `Ուղարկված${invitations ? ` (${invitations.length})` : ""}` },
            { value: "search", label: "Հրավիրել աշակերտի" },
          ]}
        >
          <div className="mt-4 max-h-[55vh] overflow-y-auto">
            <TabPanel value="invitations">{invitationsPanel}</TabPanel>
            <TabPanel value="search">{searchPanel}</TabPanel>
          </div>
        </Tabs>
      ) : (
        <div className="max-h-[55vh] overflow-y-auto">{invitationsPanel}</div>
      )}

      {error && <p className="mt-3 text-sm text-incorrect">{error}</p>}
    </Modal>
  );
}
