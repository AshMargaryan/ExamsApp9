import { useState } from "react";
import * as teachingApi from "../../api/teaching";
import type { Assignment } from "../../api/teaching";
import { ConfirmModal } from "../ConfirmModal";
import { Button } from "../ui/Button";

export function AssignmentSubmitForm({
  assignment,
  onSubmitted,
}: {
  assignment: Assignment;
  onSubmitted: () => void;
}) {
  const [explanation, setExplanation] = useState(assignment.explanation);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRequestSubmit() {
    setError(null);
    if (!explanation.trim()) {
      setError("Խնդրում ենք գրել բացատրություն, թե ինչ եք սովորել։");
      return;
    }
    setConfirming(true);
  }

  async function handleConfirm() {
    setConfirming(false);
    setSubmitting(true);
    try {
      await teachingApi.submitAssignment(assignment.id, explanation.trim());
      onSubmitted();
    } catch {
      setError("Ուղարկելիս սխալ տեղի ունեցավ։ Փորձիր կրկին։");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm text-text-muted">
        Ի՞նչ սովորեցիր։ Գրիր բացատրություն և ուղարկիր ուսուցչին ստուգելու համար։
      </label>
      <textarea
        className="mb-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
        rows={3}
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
      />
      {error && <p className="mb-2 text-sm text-incorrect">{error}</p>}
      <Button size="sm" onClick={handleRequestSubmit} loading={submitting}>
        Ավարտել և ուղարկել
      </Button>

      {confirming && (
        <ConfirmModal
          message={`Կատարել ես առաջադրանքի ${assignment.progress}%-ը։ Ուղարկե՞լ ուսուցչին ստուգելու համար։`}
          confirmLabel="Ուղարկել"
          cancelLabel="Ոչ"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
