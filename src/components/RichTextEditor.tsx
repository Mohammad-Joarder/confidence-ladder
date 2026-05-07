"use client";

import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";

function Toolbar({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  if (!editor) return null;

  const btn =
    "rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700";
  const btnActive = "bg-slate-200 dark:bg-slate-700";

  const addLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…)", prev ?? "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  return (
    <div
      className={`flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900 ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
      role="toolbar"
      aria-label="Formatting"
    >
      <button
        type="button"
        className={`${btn} ${editor.isActive("bold") ? btnActive : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Bold
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive("italic") ? btnActive : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Italic
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive("underline") ? btnActive : ""}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        Underline
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive("strike") ? btnActive : ""}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        Strike
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive("code") ? btnActive : ""}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        Code
      </button>
      <span className="mx-1 w-px self-stretch bg-slate-300 dark:bg-slate-600" aria-hidden />
      <button
        type="button"
        className={`${btn} ${editor.isActive("heading", { level: 2 }) ? btnActive : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive("heading", { level: 3 }) ? btnActive : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </button>
      <span className="mx-1 w-px self-stretch bg-slate-300 dark:bg-slate-600" aria-hidden />
      <button
        type="button"
        className={`${btn} ${editor.isActive({ textAlign: "left" }) ? btnActive : ""}`}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        Left
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive({ textAlign: "center" }) ? btnActive : ""}`}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        Center
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive({ textAlign: "right" }) ? btnActive : ""}`}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        Right
      </button>
      <span className="mx-1 w-px self-stretch bg-slate-300 dark:bg-slate-600" aria-hidden />
      <button
        type="button"
        className={`${btn} ${editor.isActive("bulletList") ? btnActive : ""}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive("orderedList") ? btnActive : ""}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive("blockquote") ? btnActive : ""}`}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Quote
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        ``` Block
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        HR
      </button>
      <button type="button" className={btn} onClick={addLink}>
        Link
      </button>
      <span className="mx-1 w-px self-stretch bg-slate-300 dark:bg-slate-600" aria-hidden />
      <button type="button" className={btn} onClick={() => editor.chain().focus().undo().run()}>
        Undo
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().redo().run()}>
        Redo
      </button>
      <span className="sr-only">Paste images from clipboard into the editor.</span>
    </div>
  );
}

export type RichTextEditorProps = {
  /** Increment to destroy/recreate the editor (e.g. clear after submit). */
  editorKey?: number;
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
};

export function RichTextEditor({
  editorKey = 0,
  initialHtml,
  onChange,
  placeholder = "Where did you get stuck? You can paste screenshots here.",
  disabled,
  id,
}: RichTextEditorProps) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: !disabled,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        Underline,
        TiptapLink.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-emerald-700 underline underline-offset-2 dark:text-emerald-400",
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        }),
        TiptapImage.configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: {
            class:
              "max-h-[min(480px,70vh)] max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-600",
          },
        }),
        Placeholder.configure({ placeholder }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
      ],
      content: initialHtml || "",
      editorProps: {
        attributes: {
          ...(id ? { id } : {}),
          class:
            "tiptap-editor-root max-w-none px-3 py-2 text-base text-slate-900 focus:outline-none dark:text-slate-100 min-h-[160px]",
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      },
    },
    [editorKey],
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
      <Toolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} className="tiptap-editor-shell max-h-[min(520px,60vh)] overflow-y-auto" />
    </div>
  );
}
