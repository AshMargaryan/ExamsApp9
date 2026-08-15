import { useEffect, useState } from "react";
import { createProject, updateProject, type Project } from "../../api/todo";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { extractErrorMessage, useToast } from "../../context/ToastContext";

const inputClass =
  "w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function ProjectFormModal({
  open, onOpenChange, project, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSaved: (project: Project) => void;
}) {
  const { showError } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setColor(project?.color ?? "#6366f1");
    setDeadline(project?.deadline ?? "");
  }, [open, project]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), description, color, deadline: deadline || null };
      const saved = project ? await updateProject(project.id, payload) : await createProject(payload);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={project ? "Խմբագրել նախագիծը" : "Նոր նախագիծ"}
      className="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="flex-1">Չեղարկել</Button>
          <Button onClick={handleSave} loading={saving} disabled={!name.trim()} className="flex-1">Պահպանել</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Նախագծի անունը"
          autoFocus
          className={inputClass}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Նկարագրություն"
          rows={2}
          className={`${inputClass} resize-none`}
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-text-muted">Գույն</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-[var(--radius)] border border-border bg-bg"
          />
          <div className="flex-1">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
