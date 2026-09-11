"use client";

/**
 * RichTextEditor.tsx
 * ------------------
 * Reusable Tiptap-based rich-text editor component.
 *
 * Features:
 * - Bold (Ctrl+B), Italic (Ctrl+I) via StarterKit shortcuts
 * - Bullet list, Ordered (numbered) list
 * - Paragraph spacing
 * - Undo (Ctrl+Z), Redo (Ctrl+Shift+Z)
 * - Formatted paste: preserves bold/italic/lists/paragraphs from
 *   ChatGPT/Google Docs/Word/websites
 * - Plain-text paste: works natively
 * - HTML paste: Tiptap parses into its own internal AST —
 *   scripts/event-handlers can NEVER execute
 * - Controlled interface: value (HTML string) + onChange
 *
 * Usage:
 *   <RichTextEditor value={html} onChange={setHtml} placeholder="Write..." />
 */

import React, { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  id?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write content here...",
  minHeight = "220px",
  id,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit includes Bold, Italic, BulletList, OrderedList,
        // Paragraph, HardBreak, History (Ctrl+Z / Ctrl+Shift+Z) by default.
        // No extra config needed — defaults are correct.
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "rte-is-empty",
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        // Unique id for Playwright/accessibility targeting
        ...(id ? { id } : {}),
        class: "rte-content",
        "data-testid": "rich-text-editor",
        spellcheck: "true",
      },
    },
    onUpdate({ editor }) {
      // Emit HTML on every change; empty document → empty string
      const html = editor.isEmpty ? "" : editor.getHTML();
      onChange(html);
    },
    // Suppress SSR mismatch: render only after hydration
    immediatelyRender: false,
  });

  // Sync external value changes into editor (e.g., when loading saved data)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.isEmpty ? "" : editor.getHTML();
    // Only reset if value actually differs to avoid cursor jump
    if (value !== currentHtml) {
      // Tiptap v3: setContent(content, options?) — emitUpdate:false prevents onChange loop
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  const execCommand = useCallback(
    (fn: () => void) => {
      fn();
      editor?.commands.focus();
    },
    [editor]
  );

  if (!editor) return null;

  const iconStyle: React.CSSProperties = {
    fontWeight: 700,
    lineHeight: 1,
    fontSize: "14px",
    fontFamily: "serif",
    userSelect: "none",
  };

  const toolbarBtnStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    padding: "0",
    border: active
      ? "1px solid var(--primary-light)"
      : "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    background: active ? "var(--primary-subtle)" : "transparent",
    color: active ? "var(--primary-light)" : "var(--text-secondary)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontSize: "13px",
    fontFamily: "inherit",
  });

  return (
    <div
      style={{
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "var(--bg-subtle)",
        transition: "border-color 0.18s ease, box-shadow 0.18s ease",
      }}
      onFocus={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--primary-light)";
        el.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.2)";
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "var(--border-color)";
          el.style.boxShadow = "none";
        }
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "8px 10px",
          borderBottom: "1px solid var(--border-color)",
          flexWrap: "wrap",
          background: "rgba(0,0,0,0.15)",
        }}
        role="toolbar"
        aria-label="Text formatting"
      >
        {/* Bold */}
        <button
          type="button"
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          aria-pressed={editor.isActive("bold")}
          style={toolbarBtnStyle(editor.isActive("bold"))}
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand(() => editor.chain().focus().toggleBold().run());
          }}
        >
          <span style={iconStyle}>B</span>
        </button>

        {/* Italic */}
        <button
          type="button"
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          aria-pressed={editor.isActive("italic")}
          style={toolbarBtnStyle(editor.isActive("italic"))}
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand(() => editor.chain().focus().toggleItalic().run());
          }}
        >
          <span style={{ ...iconStyle, fontStyle: "italic" }}>I</span>
        </button>

        {/* Divider */}
        <span
          style={{
            width: "1px",
            height: "22px",
            background: "var(--border-color)",
            margin: "0 2px",
          }}
        />

        {/* Bullet List */}
        <button
          type="button"
          title="Bullet List"
          aria-label="Bullet List"
          aria-pressed={editor.isActive("bulletList")}
          style={toolbarBtnStyle(editor.isActive("bulletList"))}
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand(() =>
              editor.chain().focus().toggleBulletList().run()
            );
          }}
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>≡</span>
        </button>

        {/* Ordered List */}
        <button
          type="button"
          title="Numbered List"
          aria-label="Numbered List"
          aria-pressed={editor.isActive("orderedList")}
          style={toolbarBtnStyle(editor.isActive("orderedList"))}
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand(() =>
              editor.chain().focus().toggleOrderedList().run()
            );
          }}
        >
          <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: 600 }}>
            1≡
          </span>
        </button>

        {/* Divider */}
        <span
          style={{
            width: "1px",
            height: "22px",
            background: "var(--border-color)",
            margin: "0 2px",
          }}
        />

        {/* Undo */}
        <button
          type="button"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          disabled={!editor.can().undo()}
          style={{
            ...toolbarBtnStyle(false),
            opacity: editor.can().undo() ? 1 : 0.35,
            cursor: editor.can().undo() ? "pointer" : "not-allowed",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand(() => editor.chain().focus().undo().run());
          }}
        >
          <span style={{ fontSize: "15px", lineHeight: 1 }}>↩</span>
        </button>

        {/* Redo */}
        <button
          type="button"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
          disabled={!editor.can().redo()}
          style={{
            ...toolbarBtnStyle(false),
            opacity: editor.can().redo() ? 1 : 0.35,
            cursor: editor.can().redo() ? "pointer" : "not-allowed",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand(() => editor.chain().focus().redo().run());
          }}
        >
          <span style={{ fontSize: "15px", lineHeight: 1 }}>↪</span>
        </button>
      </div>

      {/* Editor content area */}
      <EditorContent
        editor={editor}
        style={{ minHeight, padding: "12px 16px" }}
      />
    </div>
  );
}
