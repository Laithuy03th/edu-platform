"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

/**
 * Trình soạn code (CodeMirror 6) dùng chung cho playground HTML/CSS/JS, SQL, Python.
 * - TẢI LƯỜI: mọi module CodeMirror chỉ được import() khi component mount (V2 §37.7: không tăng JS trang khác).
 * - Mỗi "docKey" (vd html/css/js) có EditorState riêng → lịch sử hoàn tác riêng từng tệp.
 * - Có: đánh số dòng, tô màu, gợi ý (autocomplete), Emmet (HTML/CSS), đóng ngoặc, tìm/thay (Ctrl+F),
 *   gập code, đa con trỏ, đánh dấu lỗi cú pháp trực tiếp (JS/Python), Ctrl+Enter chạy, Ctrl+S lưu.
 * - Bàn phím: Tab thụt lề trong editor; nhấn Esc rồi Tab để rời editor (không bẫy focus).
 */
export type EditorLang = "html" | "css" | "javascript" | "sql" | "python";
export type CodeEditorHandle = { focus(): void; gotoLine(line: number): void; getSelection(): string; insertText(text: string): void };
type Props = {
  docKey: string;
  value: string;
  language: EditorLang;
  onChange(value: string): void;
  onRun?(): void;
  onSave?(): void;
  sqlSchema?: Record<string, string[]>;
  ariaLabel: string;
  className?: string;
};

type CM = {
  view: typeof import("@codemirror/view");
  state: typeof import("@codemirror/state");
  language: typeof import("@codemirror/language");
  commands: typeof import("@codemirror/commands");
  lint: typeof import("@codemirror/lint");
  basic: typeof import("codemirror");
  highlight: typeof import("@lezer/highlight");
};

let cmPromise: Promise<CM> | null = null;
function loadCM(): Promise<CM> {
  cmPromise ??= Promise.all([
    import("@codemirror/view"),
    import("@codemirror/state"),
    import("@codemirror/language"),
    import("@codemirror/commands"),
    import("@codemirror/lint"),
    import("codemirror"),
    import("@lezer/highlight"),
  ]).then(([view, state, language, commands, lint, basic, highlight]) => ({ view, state, language, commands, lint, basic, highlight }));
  return cmPromise;
}

async function languageExtension(lang: EditorLang, sqlSchema?: Record<string, string[]>) {
  switch (lang) {
    case "html": {
      const [{ html }, emmet] = await Promise.all([import("@codemirror/lang-html"), import("@emmetio/codemirror6-plugin")]);
      return { lang: html({ autoCloseTags: true }), emmet, syntax: emmet.EmmetKnownSyntax.html };
    }
    case "css": {
      const [{ css }, emmet] = await Promise.all([import("@codemirror/lang-css"), import("@emmetio/codemirror6-plugin")]);
      return { lang: css(), emmet, syntax: emmet.EmmetKnownSyntax.css };
    }
    case "javascript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      return { lang: javascript(), emmet: null, syntax: null };
    }
    case "sql": {
      const { sql, SQLite } = await import("@codemirror/lang-sql");
      return { lang: sql({ dialect: SQLite, schema: sqlSchema ?? {}, upperCaseKeywords: true }), emmet: null, syntax: null };
    }
    case "python": {
      const { python } = await import("@codemirror/lang-python");
      return { lang: python(), emmet: null, syntax: null };
    }
  }
}

/** Màu theo GitHub Dark để khớp khối code trong bài học (shiki github-dark-default). */
function buildTheme(cm: CM) {
  const { EditorView } = cm.view;
  const { HighlightStyle, syntaxHighlighting } = cm.language;
  const t = cm.highlight.tags;
  const theme = EditorView.theme(
    {
      "&": { color: "#e6edf3", backgroundColor: "#0d1117", height: "100%", fontSize: "13.5px" },
      ".cm-scroller": { fontFamily: "ui-monospace, 'Cascadia Code', Consolas, monospace", lineHeight: "1.65" },
      ".cm-content": { caretColor: "#fca5a5", padding: "10px 0" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#fca5a5", borderLeftWidth: "2px" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "#7f1d1d99" },
      ".cm-gutters": { backgroundColor: "#0d1117", color: "#6e7681", border: "none", paddingRight: "4px" },
      ".cm-activeLineGutter": { backgroundColor: "#161b22", color: "#e6edf3" },
      ".cm-activeLine": { backgroundColor: "#161b2299" },
      ".cm-foldPlaceholder": { backgroundColor: "#21262d", border: "none", color: "#8b949e" },
      ".cm-tooltip": { backgroundColor: "#161b22", border: "1px solid #30363d", color: "#e6edf3" },
      ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "#7f1d1d", color: "#fff" },
      ".cm-panels": { backgroundColor: "#161b22", color: "#e6edf3" },
      ".cm-panel.cm-search input, .cm-panel.cm-search button": { fontSize: "12px" },
      ".cm-searchMatch": { backgroundColor: "#bb800966", outline: "1px solid #bb8009" },
      ".cm-matchingBracket": { backgroundColor: "#3fb95033", outline: "1px solid #3fb95088" },
      ".cm-lintRange-error": { backgroundImage: "none", textDecoration: "underline wavy #ff7b72" },
      ".cm-emmet-preview": { backgroundColor: "#161b22", border: "1px solid #30363d", padding: "4px 8px", fontSize: "12px" },
    },
    { dark: true },
  );
  const style = HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword], color: "#ff7b72" },
    { tag: [t.string, t.special(t.string), t.regexp], color: "#a5d6ff" },
    { tag: [t.number, t.bool, t.null, t.atom], color: "#79c0ff" },
    { tag: [t.comment, t.lineComment, t.blockComment], color: "#8b949e", fontStyle: "italic" },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#d2a8ff" },
    { tag: [t.typeName, t.className, t.namespace], color: "#ffa657" },
    { tag: [t.tagName], color: "#7ee787" },
    { tag: [t.attributeName, t.propertyName], color: "#79c0ff" },
    { tag: [t.attributeValue], color: "#a5d6ff" },
    { tag: [t.definition(t.variableName)], color: "#ffa657" },
    { tag: [t.operator, t.punctuation, t.bracket], color: "#e6edf3" },
    { tag: t.invalid, color: "#ff7b72", textDecoration: "underline" },
  ]);
  return [theme, syntaxHighlighting(style)];
}

/** Lỗi cú pháp trực tiếp từ cây cú pháp Lezer (không cần thư viện lint nặng). */
function syntaxLinter(cm: CM) {
  const { linter } = cm.lint;
  const { syntaxTree } = cm.language;
  return linter(
    (view) => {
      const out: import("@codemirror/lint").Diagnostic[] = [];
      syntaxTree(view.state).iterate({
        enter: (n) => {
          if (n.type.isError && out.length < 20) {
            const from = Math.min(n.from, view.state.doc.length);
            out.push({ from, to: Math.min(Math.max(n.to, from + 1), view.state.doc.length), severity: "error", message: "Lỗi cú pháp ở đây (thiếu dấu ngoặc, dấu phẩy, hoặc từ khóa viết sai?)" });
          }
        },
      });
      return out;
    },
    { delay: 600 },
  );
}

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor({ docKey, value, language, onChange, onRun, onSave, sqlSchema, ariaLabel, className }, ref) {
  const host = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<import("@codemirror/view").EditorView | null>(null);
  const states = useRef(new Map<string, import("@codemirror/state").EditorState>());
  const cmRef = useRef<CM | null>(null);
  const keyRef = useRef(docKey);
  const cb = useRef({ onChange, onRun, onSave });
  cb.current = { onChange, onRun, onSave };
  const [ready, setReady] = useState(false);
  const schemaKey = JSON.stringify(sqlSchema ?? {});

  useImperativeHandle(ref, () => ({
    focus: () => viewRef.current?.focus(),
    /** Đoạn đang bôi đen (rỗng nếu không chọn) — SQL: chạy riêng đoạn chọn. */
    getSelection: () => {
      const v = viewRef.current;
      if (!v) return "";
      return v.state.selection.ranges.map((r) => v.state.sliceDoc(r.from, r.to)).join("\n");
    },
    /** Chèn tại con trỏ (thay đoạn đang chọn) — vd bấm tên bảng/cột trong sơ đồ dữ liệu. */
    insertText: (text: string) => {
      const v = viewRef.current;
      if (!v) return;
      v.dispatch(v.state.replaceSelection(text));
      v.focus();
    },
    gotoLine: (line: number) => {
      const v = viewRef.current;
      if (!v) return;
      const l = v.state.doc.line(Math.min(Math.max(1, line), v.state.doc.lines));
      v.dispatch({ selection: { anchor: l.from, head: l.to }, scrollIntoView: true });
      v.focus();
    },
  }));

  /** Tạo EditorState cho một tệp (ngôn ngữ, phím tắt, theme, lint, emmet). */
  async function makeState(cm: CM, doc: string) {
    const { EditorState, Prec } = cm.state;
    const { keymap, EditorView } = cm.view;
    const { indentWithTab } = cm.commands;
    const le = await languageExtension(language, sqlSchema);
    const emmetExt = le.emmet && le.syntax ? [le.emmet.abbreviationTracker({ syntax: le.syntax }), Prec.high(keymap.of([{ key: "Tab", run: le.emmet.expandAbbreviation }]))] : [];
    return EditorState.create({
      doc,
      extensions: [
        cm.basic.basicSetup,
        Prec.highest(
          keymap.of([
            { key: "Mod-Enter", run: () => (cb.current.onRun?.(), true) },
            { key: "Mod-s", run: () => (cb.current.onSave?.(), true), preventDefault: true },
          ]),
        ),
        ...emmetExt,
        keymap.of([indentWithTab]),
        le.lang,
        ...buildTheme(cm),
        ...(language === "javascript" || language === "python" ? [syntaxLinter(cm)] : []),
        // Python: thụt lề 4 dấu cách theo PEP 8; các ngôn ngữ khác 2
        ...(language === "python" ? [EditorState.tabSize.of(4), cm.language.indentUnit.of("    ")] : [EditorState.tabSize.of(2)]),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": ariaLabel, spellcheck: "false", autocapitalize: "off", autocorrect: "off" }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) cb.current.onChange(u.state.doc.toString());
        }),
      ],
    });
  }

  // Khởi tạo một lần
  useEffect(() => {
    let destroyed = false;
    void loadCM().then(async (cm) => {
      if (destroyed || !host.current) return;
      cmRef.current = cm;
      const st = await makeState(cm, value);
      if (destroyed || !host.current) return;
      states.current.set(docKey, st);
      viewRef.current = new cm.view.EditorView({ state: st, parent: host.current });
      setReady(true);
    });
    return () => {
      destroyed = true;
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // chỉ chạy khi mount; đổi tệp/giá trị xử lý ở effect dưới
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đổi tệp (docKey): lưu state hiện tại, nạp state tệp mới (giữ lịch sử hoàn tác riêng)
  useEffect(() => {
    const v = viewRef.current;
    const cm = cmRef.current;
    if (!v || !cm || keyRef.current === docKey) return;
    states.current.set(keyRef.current, v.state);
    keyRef.current = docKey;
    const saved = states.current.get(docKey);
    if (saved && saved.doc.toString() === value) v.setState(saved);
    else void makeState(cm, value).then((st) => viewRef.current?.setState(st));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, ready]);

  // Giá trị đổi từ bên ngoài (mở ví dụ, định dạng, tải bản lưu) → thay nội dung, vẫn hoàn tác được
  useEffect(() => {
    const v = viewRef.current;
    if (!v || keyRef.current !== docKey) return;
    const cur = v.state.doc.toString();
    if (cur !== value) v.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
  }, [value, docKey, ready]);

  // Schema SQL đổi (đổi bộ dữ liệu) → dựng lại state để gợi ý đúng bảng/cột
  useEffect(() => {
    const v = viewRef.current;
    const cm = cmRef.current;
    if (!v || !cm || language !== "sql") return;
    void makeState(cm, v.state.doc.toString()).then((st) => viewRef.current?.setState(st));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaKey]);

  return (
    <div className={`relative min-h-0 overflow-hidden bg-[#0d1117] ${className ?? ""}`}>
      <div ref={host} className="h-full [&_.cm-editor]:h-full [&_.cm-editor.cm-focused]:outline-none" />
      {!ready ? (
        // Trước khi CodeMirror tải xong: hiện code dạng chữ (không nhảy layout, không JS vẫn đọc được)
        <pre aria-hidden className="absolute inset-0 overflow-auto p-3 pl-12 font-mono text-[13.5px] leading-[1.65] text-[#e6edf3]/70">
          {value}
        </pre>
      ) : null}
    </div>
  );
});
