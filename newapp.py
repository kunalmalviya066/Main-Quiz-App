# question_converter_unicode.py
# UTF-8 / Hindi + English + symbols friendly bulk converter
# Save this file and run: python question_converter_unicode.py

import tkinter as tk
from tkinter import scrolledtext, messagebox, filedialog
import json
import re
import os
import pyperclip  # optional; used by Copy All. Install with `pip install pyperclip` if you want clipboard support.

# ---------- Helper functions ----------

LABELS = ["(a) ", "(b) ", "(c) ", "(d) ", "(e) "]

def safe_json_loads(text):
    """
    Try to parse JSON. If it fails because the user pasted multiple top-level objects
    without a surrounding array, we attempt to auto-wrap or extract {...} blocks.
    """
    txt = text.strip()
    # Quick attempt: if starts with '{' but not '[' -> try wrap in [ ... ]
    try:
        return json.loads(txt)
    except Exception:
        pass

    # Attempt to extract individual JSON objects using regex (handles nested braces minimally)
    objs = re.findall(r'\{(?:[^{}]|(?R))*\}', txt, flags=re.DOTALL)
    if not objs:
        # fallback: try to replace single quotes with double quotes (common paste issue)
        try:
            return json.loads(txt.replace("'", '"'))
        except Exception:
            raise ValueError("Couldn't parse input as JSON. Please paste valid JSON or many {...} blocks.")

    parsed = []
    for o in objs:
        try:
            parsed.append(json.loads(o))
        except Exception:
            # try single-quote fallback for each block
            try:
                parsed.append(json.loads(o.replace("'", '"')))
            except Exception:
                # as last resort, attempt minimal key: value extraction to build object (simple)
                raise ValueError("Found JSON-like blocks but couldn't parse one of them. Please ensure valid JSON.")
    return parsed

def normalize_option_text(opt):
    """Return option text (string) with leading/trailing whitespace trimmed."""
    if opt is None:
        return ""
    return str(opt).strip()

def label_options(options):
    """
    Prepend labels (a), (b), ... to options while preserving original language.
    Avoid double-labeling if label already present.
    Ensure max 5 options handled.
    """
    formatted = []
    for i, opt in enumerate(options[:5]):
        opt_text = normalize_option_text(opt)
        # If it already starts with a label like "(a)" or "a)" or "A." ignore adding duplicate label
        if re.match(r'^\(\s*[a-eA-E]\s*\)', opt_text) or re.match(r'^[a-eA-E][\)\.]', opt_text):
            formatted.append(opt_text)
        else:
            formatted.append(f"{LABELS[i]}{opt_text}")
    return formatted

def map_answer_to_full(options, answer_raw):
    """
    Convert answer field (int index, numeric-string index, letter like 'a' or '(b)', or option-text)
    into the full labeled option string produced by label_options.
    If not resolvable, returns the raw answer (string).
    """
    if answer_raw is None:
        return ""

    # prepare labeled options for matching
    labeled = label_options(options)

    # If answer is integer or numeric string -> index mapping
    if isinstance(answer_raw, int):
        idx = answer_raw
        if 0 <= idx < len(labeled):
            return labeled[idx]
    # numeric string like "0" or "2"
    if isinstance(answer_raw, str) and re.fullmatch(r'\d+', answer_raw.strip()):
        idx = int(answer_raw.strip())
        if 0 <= idx < len(labeled):
            return labeled[idx]

    # If answer is a letter 'a', 'b' or '(a)' etc.
    if isinstance(answer_raw, str):
        s = answer_raw.strip()
        # patterns: "(a)", "a", "A", "option (a) ...", "(a) text"
        m = re.search(r'([a-eA-E])', s)
        if m and len(s) <= 3:
            letter = m.group(1).lower()
            idx = ord(letter) - ord('a')
            if 0 <= idx < len(labeled):
                return labeled[idx]

    # If answer matches one of the option texts (partial or full), try fuzzy match:
    if isinstance(answer_raw, str):
        s = answer_raw.strip()
        # exact match ignoring labels
        for opt in labeled:
            # compare after removing label prefix
            plain = re.sub(r'^\(\s*[a-eA-E]\s*\)\s*', '', opt).strip()
            if s == opt or s == plain:
                return opt
            # also if answer is a substring of option or vice versa:
            if s and (s in plain or plain in s):
                return opt

    # As a last resort, if answer_raw is exactly something like "Only conclusion I follows", try to find option containing that substring
    if isinstance(answer_raw, str):
        for opt in labeled:
            if answer_raw.strip() in opt:
                return opt

    # Couldn't determine — return the original string (but ensure it's readable)
    return str(answer_raw)

# ---------- Converter core ----------

def convert_raw_to_official(raw_text):
    parsed = safe_json_loads(raw_text)
    if not isinstance(parsed, list):
        parsed = [parsed]

    final_list = []
    auto_count = 1

    for item in parsed:
        # allow strings that are simple key:value lines? Expect dicts -- otherwise skip
        if not isinstance(item, dict):
            continue

        qid = item.get("id") or item.get("ID") or item.get("qid") or f"auto-{auto_count:03d}"
        auto_count += 1

        question = item.get("question", "")
        explanation = item.get("explanation", "") or item.get("hint", "") or ""

        # Options: might be array or object or single string with newline bullets.
        options_raw = item.get("options", None)
        if options_raw is None:
            # Attempt to pull from item if keys like 'option1' exist:
            options_candidates = []
            for k in sorted(item.keys()):
                if re.match(r'option[\s_-]*\d+', k, re.IGNORECASE) or re.match(r'opt[\s_-]*\d+', k, re.IGNORECASE):
                    options_candidates.append(item[k])
            if options_candidates:
                options_raw = options_candidates
            else:
                # try to extract options from answer-like field or question body (very last-resort)
                options_raw = []

        # If options are provided as a single string with " (a) ... \n (b) ..." split them
        if isinstance(options_raw, str):
            # split on line breaks and common separators
            parts = re.split(r'[\r\n]+', options_raw)
            parts = [p.strip() for p in parts if p.strip()]
            if len(parts) > 1:
                options_list = parts
            else:
                # try comma split if single-line
                options_list = [p.strip() for p in re.split(r'\s*,\s*', options_raw) if p.strip()]
        elif isinstance(options_raw, list):
            options_list = [normalize_option_text(x) for x in options_raw]
        else:
            # unknown structure: make empty list
            options_list = []

        # Normalize and label options
        labeled_options = label_options(options_list)

        # Answer mapping
        raw_answer = item.get("answer", item.get("ans", item.get("correct", None)))
        mapped_answer = map_answer_to_full(options_list, raw_answer)

        # If mapped_answer is still numeric index string like "(a) ..." didn't resolve, try if original numeric index in item['answer'] used zero-based
        if isinstance(mapped_answer, str) and mapped_answer.isdigit():
            idx = int(mapped_answer)
            if 0 <= idx < len(labeled_options):
                mapped_answer = labeled_options[idx]

        # Build official structure
        final_q = {
            "id": str(qid),
            "question": question,
            "image": None,
            "options": labeled_options,
            "answer": mapped_answer,
            "explanation": explanation
        }
        final_list.append(final_q)

    return final_list

# ---------- GUI ----------

root = tk.Tk()
root.title("Universal Question Formatter — Hindi/English/Unicode (Bulk)")
root.geometry("1200x760")

# Try to pick a font that renders Hindi well; fallback to default
preferred_fonts = ["Nirmala UI", "Mangal", "Segoe UI", "Arial Unicode MS", "Consolas"]
font_family = None
for f in preferred_fonts:
    try:
        tk.font = tk.font if hasattr(tk, "font") else None
        font_family = f
        break
    except Exception:
        continue
if font_family is None:
    font_family = "Consolas"

tk.Label(root, text="Paste RAW input (JSON or multiple { } blocks):", font=(font_family, 12, "bold")).pack(pady=(8,0))

input_box = scrolledtext.ScrolledText(root, width=140, height=16, font=(font_family, 11))
input_box.pack(padx=8, pady=6)

btn_frame = tk.Frame(root)
btn_frame.pack(pady=6)

def on_convert():
    raw = input_box.get("1.0", tk.END).strip()
    if not raw:
        messagebox.showinfo("No input", "Please paste your raw data in the input box.")
        return
    try:
        converted = convert_raw_to_official(raw)
    except Exception as e:
        messagebox.showerror("Parsing error", f"Could not parse input:\n{e}")
        return

    # display pretty JSON with ensure_ascii=False to preserve Hindi
    out_text = json.dumps(converted, ensure_ascii=False, indent=4)
    output_box.delete("1.0", tk.END)
    output_box.insert(tk.END, out_text)

def on_copy():
    txt = output_box.get("1.0", tk.END).strip()
    if not txt:
        messagebox.showinfo("Nothing to copy", "Convert something first.")
        return
    try:
        pyperclip.copy(txt)
        messagebox.showinfo("Copied", "Converted JSON copied to clipboard.")
    except Exception:
        # fallback to tkinter clipboard
        root.clipboard_clear()
        root.clipboard_append(txt)
        messagebox.showinfo("Copied", "Converted JSON copied to clipboard (tkinter).")

def on_save():
    txt = output_box.get("1.0", tk.END).strip()
    if not txt:
        messagebox.showinfo("Nothing to save", "Convert something first.")
        return
    path = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON files","*.json"), ("All files","*.*")])
    if not path:
        return
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(txt)
        messagebox.showinfo("Saved", f"Saved to {path}")
    except Exception as e:
        messagebox.showerror("Save error", str(e))

def on_load_file():
    path = filedialog.askopenfilename(filetypes=[("Text/JSON","*.json;*.txt"), ("All files","*.*")])
    if not path:
        return
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = f.read()
        input_box.delete("1.0", tk.END)
        input_box.insert(tk.END, data)
        messagebox.showinfo("Loaded", f"Loaded {os.path.basename(path)} into input box.")
    except Exception as e:
        messagebox.showerror("Load error", str(e))

tk.Button(btn_frame, text="Convert → Official Format", bg="#1976D2", fg="white", command=on_convert, width=28).grid(row=0, column=0, padx=6)
tk.Button(btn_frame, text="Copy All", command=on_copy, width=12).grid(row=0, column=1, padx=6)
tk.Button(btn_frame, text="Save JSON", command=on_save, width=12).grid(row=0, column=2, padx=6)
tk.Button(btn_frame, text="Load File", command=on_load_file, width=12).grid(row=0, column=3, padx=6)

tk.Label(root, text="Converted JSON Output (UTF-8, Hindi preserved):", font=(font_family, 12, "bold")).pack(pady=(8,0))

output_box = scrolledtext.ScrolledText(root, width=140, height=18, font=(font_family, 11))
output_box.pack(padx=8, pady=6)

# Footer
tk.Label(root, text="Supports Hindi + English + symbols. Exports JSON with ensure_ascii=False.", font=(font_family, 9, "italic")).pack(pady=(2,10))

root.mainloop()
