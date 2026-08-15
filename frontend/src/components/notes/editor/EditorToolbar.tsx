import type { Editor } from "@tiptap/react";
import { cn } from "../../../lib/cn";

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-surface-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 self-center bg-border" />;
}

export function EditorToolbar({
  editor,
  onInsertImage,
  onInsertAttachment,
}: {
  editor: Editor;
  onInsertImage: () => void;
  onInsertAttachment: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface px-2 py-1.5">
      <ToolbarButton label="Վերնագիր 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolbarButton>
      <ToolbarButton label="Վերնագիր 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
      <ToolbarButton label="Վերնագիր 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
      <Divider />
      <ToolbarButton label="Թավ" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><b>Բ</b></ToolbarButton>
      <ToolbarButton label="Շեղ" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><i>Թ</i></ToolbarButton>
      <ToolbarButton label="Ընդգծված" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>Ը</u></ToolbarButton>
      <ToolbarButton label="Գծված" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><s>Գ</s></ToolbarButton>
      <ToolbarButton label="Նշված" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>🖍️</ToolbarButton>
      <Divider />
      <ToolbarButton label="Ցուցակ" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>•≡</ToolbarButton>
      <ToolbarButton label="Համարակալված ցուցակ" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.≡</ToolbarButton>
      <ToolbarButton label="Ստուգացուցակ" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>☑︎</ToolbarButton>
      <Divider />
      <ToolbarButton label="Մեջբերում" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolbarButton>
      <ToolbarButton label="Կոդ" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{"</>"}</ToolbarButton>
      <ToolbarButton
        label="Աղյուսակ"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        ⊞
      </ToolbarButton>
      <ToolbarButton
        label="Հղում"
        active={editor.isActive("link")}
        onClick={() => {
          const url = window.prompt("Հղման հասցեն՝");
          if (url) editor.chain().focus().setLink({ href: url }).run();
          else if (editor.isActive("link")) editor.chain().focus().unsetLink().run();
        }}
      >
        🔗
      </ToolbarButton>
      <ToolbarButton
        label="Հավասարում"
        onClick={() => editor.chain().focus().insertContent({ type: "mathInline", attrs: { latex: "" } }).run()}
      >
        ∑
      </ToolbarButton>
      <Divider />
      <ToolbarButton label="Նկար" onClick={onInsertImage}>🖼️</ToolbarButton>
      <ToolbarButton label="Կցել ֆայլ" onClick={onInsertAttachment}>📎</ToolbarButton>
    </div>
  );
}
