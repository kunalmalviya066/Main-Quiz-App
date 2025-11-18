
#!/usr/bin/env python3
"""
Question Format Converter - Tkinter Desktop App
Saves to: question_converter.py

Usage:
- Install Python 3.8+ (if not installed)
- Run: python question_converter.py
- Paste your questions (raw text / JSON / mixed) into the left box
- Click "Convert" to produce the official format on the right
- Click "Save JSON" to export to a file

This converter uses heuristics:
- Tries to parse input as JSON
- If that fails, splits on {...} blocks and extracts fields via regex
- Attempts to normalize options, answers, and explanation
- Adds image: null if missing
- Keeps option labels as "(a) ...", "(b) ..." when possible
- If answer is numeric index, it maps to the option
"""

import json
import re
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext

# --- Helper functions ---

def normalize_options(opts):
    # Accept a list or a string of options
    if isinstance(opts, list):
        cleaned = []
        for o in opts:
            s = str(o).strip()
            # Ensure format: "(a) text"
            if re.match(r'^\(?[a-eA-E]\)?\s*[-:.)]?', s):
                # ensure "(a) text"
                m = re.match(r'^\(?([a-eA-E])\)?\s*[-:.)]?\s*(.*)$', s)
                if m:
                    label = m.group(1).lower()
                    text = m.group(2).strip()
                    cleaned.append(f'({label}) {text}' if text else f'({label})')
                else:
                    cleaned.append(s)
            else:
                cleaned.append(s)
        return cleaned
    else:
        # Try to split by commas or newlines like "a) 1, b)2"
        s = str(opts)
        parts = re.split(r'\n|,|\;|\t', s)
        parts = [p.strip() for p in parts if p.strip()]
        return normalize_options(parts)

def map_answer(ans, options):
    # If ans is like 0 or "0" treat as index
    if isinstance(ans, int):
        idx = ans
        if 0 <= idx < len(options):
            return options[idx]
    # If ans is string like "0" or "(a) 63" or "a" or "A"
    s = str(ans).strip()
    # numeric string?
    if re.fullmatch(r'\d+', s):
        idx = int(s)
        if 0 <= idx < len(options):
            return options[idx]
    # letter like a or (a)
    m = re.match(r'^\(?([a-eA-E])\)?', s)
    if m:
        letter = m.group(1).lower()
        # find option starting with that label
        for opt in options:
            if re.match(r'^\(?%s\)?' % letter, opt.lower()):
                return opt
        # map letter to index
        idx = ord(letter) - ord('a')
        if 0 <= idx < len(options):
            return options[idx]
    # full option text present
    for opt in options:
        if s.lower() == opt.lower() or s.lower() in opt.lower():
            return opt
    # fallback: if ans looks like an index within parentheses "(a) 63" return as-is
    return s

def extract_from_block(block_text):
    """
    Try to extract id, question, options, answer, explanation from a text block.
    Returns a dictionary (some fields may be None)
    """
    res = {'id': None, 'question': None, 'options': None, 'answer': None, 'explanation': None}
    # id patterns
    m = re.search(r'\"?id\"?\s*[:=]\s*["\']?([\w\-\_\.]+)["\']?', block_text, re.IGNORECASE)
    if m:
        res['id'] = m.group(1)
    else:
        # try id: 'logic-051' style without quotes
        m2 = re.search(r'\b(id|ID)\b\s*[:=]\s*([\'"]?[\w\-\_\.]+[\'"]?)', block_text)
        if m2:
            res['id'] = m2.group(2).strip(' "\'')
    # question
    m = re.search(r'\"?question\"?\s*[:=]\s*["\'](.*?)["\']\s*(,|\n|$)', block_text, re.IGNORECASE|re.DOTALL)
    if m:
        q = m.group(1).strip()
        res['question'] = ' '.join(q.split())
    else:
        # try to capture text before options or "options" keyword
        parts = re.split(r'\"?options\"?\s*[:=]', block_text, flags=re.IGNORECASE)
        if parts:
            first = parts[0].strip()
            # heuristics: if contains 'question' label inside, extract following colon
            mq = re.search(r'question\s*[:=]\s*(.*)', first, re.IGNORECASE|re.DOTALL)
            if mq:
                res['question'] = mq.group(1).strip().strip('",')
            else:
                # fallback: whole block trimmed
                if len(first) < 400:
                    res['question'] = first.strip()
    # options - look for array
    m = re.search(r'\"?options\"?\s*[:=]\s*(\[[^\]]*\])', block_text, re.IGNORECASE|re.DOTALL)
    if m:
        try:
            opts = json.loads(m.group(1).replace("'", '"'))
            res['options'] = normalize_options(opts)
        except Exception:
            # fallback parse items
            inner = m.group(1).strip('[]')
            parts = re.split(r',\s*(?=(?:[^"]*"[^"]*")*[^"]*$)', inner)
            parts = [p.strip().strip('\'" ') for p in parts if p.strip()]
            res['options'] = normalize_options(parts)
    else:
        # look for lines like (a) 63 or a) 63
        opts = re.findall(r'(\(?[a-eA-E]\)?[\.:\)\-]?\s*[^;\n\r]+)', block_text)
        if opts:
            opts = [o.strip().strip(',') for o in opts]
            res['options'] = normalize_options(opts)
    # answer
    m = re.search(r'\"?answer\"?\s*[:=]\s*(?:["\']([^"\']+)["\']|(\d+))', block_text, re.IGNORECASE)
    if m:
        ans = m.group(1) if m.group(1) is not None else m.group(2)
        res['answer'] = ans
    else:
        # sometimes answer is index number alone like "answer": 2 or answer: 2,
        m2 = re.search(r'\banswer\b\s*[:=]\s*([^\n,}]+)', block_text, re.IGNORECASE)
        if m2:
            res['answer'] = m2.group(1).strip().strip('",')
    # explanation
    m = re.search(r'\"?explanation\"?\s*[:=]\s*["\'](.*?)["\']\s*(,|\n|$)', block_text, re.IGNORECASE|re.DOTALL)
    if m:
        res['explanation'] = ' '.join(m.group(1).split())
    else:
        # try "explain" or trailing sentence
        mex = re.search(r'explanat(?:ion|ory)\s*[:=]\s*(.*)', block_text, re.IGNORECASE)
        if mex:
            res['explanation'] = mex.group(1).strip()
    return res

def normalize_item(raw):
    """
    Given a raw dictionary or extracted block, normalize it to official format.
    """
    item = {'id': None, 'question': None, 'image': None, 'options': [], 'answer': None, 'explanation': ''}
    # If raw is dict-like
    if isinstance(raw, dict):
        # id
        item['id'] = str(raw.get('id') or raw.get('ID') or raw.get('qid') or '')

        # question
        q = raw.get('question') or raw.get('ques') or raw.get('text') or ''
        item['question'] = str(q).strip() if q is not None else ''

        # image
        image = raw.get('image', None)
        item['image'] = image if image is not None else None

        # options
        opts = raw.get('options') or raw.get('choices') or raw.get('option') or []
        item['options'] = normalize_options(opts) if opts else []

        # explanation
        expl = raw.get('explanation') or raw.get('explain') or raw.get('solution') or ''
        item['explanation'] = str(expl).strip() if expl is not None else ''

        # answer mapping
        ans = raw.get('answer') or raw.get('Answer') or raw.get('correct') or ''
        if item['options'] and ans is not None:
            item['answer'] = map_answer(ans, item['options'])
        else:
            item['answer'] = str(ans).strip() if ans is not None else ''
    else:
        # treat raw as block of text; try extracting
        ex = extract_from_block(str(raw))
        item['id'] = ex['id'] or ''
        item['question'] = ex['question'] or ''
        item['options'] = ex['options'] or []
        item['explanation'] = ex['explanation'] or ''
        if ex['answer'] is not None and item['options']:
            item['answer'] = map_answer(ex['answer'], item['options'])
        else:
            item['answer'] = ex['answer'] or ''
    # final fallbacks
    if not item['id']:
        # assign empty id; caller can reassign serially
        item['id'] = ''
    if item['image'] is None:
        item['image'] = None
    return item

def convert_text_to_items(text):
    # Try pure JSON first
    text_str = text.strip()
    items = []
    if not text_str:
        return items
    try:
        parsed = json.loads(text_str)
        # parsed could be dict of lists or list
        if isinstance(parsed, dict):
            # try several keys
            # find a list value or dicts
            candidate_lists = [v for v in parsed.values() if isinstance(v, list)]
            if candidate_lists:
                parsed_list = candidate_lists[0]
            else:
                # maybe it's a single dict representing one question
                parsed_list = [parsed]
        elif isinstance(parsed, list):
            parsed_list = parsed
        else:
            parsed_list = [parsed]
        for p in parsed_list:
            ni = normalize_item(p)
            items.append(ni)
        return items
    except Exception:
        pass

    # Not JSON: split into blocks by braces or blank lines that look like records
    # First try to split by curly blocks
    blocks = re.findall(r'\{[^}]*\}', text_str, re.DOTALL)
    if not blocks:
        # fallback: split by double newlines
        blocks = [b for b in re.split(r'\n\s*\n', text_str) if b.strip()]
    for b in blocks:
        ex = extract_from_block(b)
        ni = normalize_item(ex)
        items.append(ni)
    return items

# --- Tkinter UI ---

class ConverterApp:
    def __init__(self, root):
        self.root = root
        root.title("Question Format Converter — Official JSON")
        root.geometry("1000x700")

        frm = tk.Frame(root)
        frm.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        left = tk.Frame(frm)
        right = tk.Frame(frm)
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        tk.Label(left, text="Paste raw input here (JSON / text / mixed):").pack(anchor='w')
        self.input_box = scrolledtext.ScrolledText(left, wrap=tk.WORD, width=60, height=30)
        self.input_box.pack(fill=tk.BOTH, expand=True)

        btn_frame = tk.Frame(left)
        btn_frame.pack(fill=tk.X, pady=6)
        self.convert_btn = tk.Button(btn_frame, text="Convert →", command=self.do_convert, width=12)
        self.convert_btn.pack(side=tk.LEFT, padx=4)
        self.clear_btn = tk.Button(btn_frame, text="Clear", command=lambda: self.input_box.delete('1.0', tk.END))
        self.clear_btn.pack(side=tk.LEFT, padx=4)
        self.load_btn = tk.Button(btn_frame, text="Load File", command=self.load_file)
        self.load_btn.pack(side=tk.LEFT, padx=4)

        tk.Label(right, text="Output — official JSON format:").pack(anchor='w')
        self.output_box = scrolledtext.ScrolledText(right, wrap=tk.WORD, width=60, height=30)
        self.output_box.pack(fill=tk.BOTH, expand=True)

        out_btn_frame = tk.Frame(right)
        out_btn_frame.pack(fill=tk.X, pady=6)
        self.copy_btn = tk.Button(out_btn_frame, text="Copy All", command=self.copy_all, width=12)
        self.copy_btn.pack(side=tk.LEFT, padx=4)
        self.save_btn = tk.Button(out_btn_frame, text="Save JSON", command=self.save_json, width=12)
        self.save_btn.pack(side=tk.LEFT, padx=4)
        self.reid_btn = tk.Button(out_btn_frame, text="Auto-fill IDs", command=self.autofill_ids, width=12)
        self.reid_btn.pack(side=tk.LEFT, padx=4)

        # status
        self.status = tk.Label(root, text="Ready", anchor='w')
        self.status.pack(fill=tk.X, padx=8, pady=4)

    def set_status(self, text):
        self.status.config(text=text)
        self.root.update_idletasks()

    def load_file(self):
        p = filedialog.askopenfilename(title="Open input file", filetypes=[("Text files", "*.txt *.json *.md"), ("All files","*.*")])
        if not p:
            return
        with open(p, 'r', encoding='utf-8') as f:
            data = f.read()
        self.input_box.delete('1.0', tk.END)
        self.input_box.insert('1.0', data)
        self.set_status(f"Loaded {p}")

    def do_convert(self):
        raw = self.input_box.get('1.0', tk.END)
        self.set_status("Converting...")
        items = convert_text_to_items(raw)
        # if items have empty ids fill with serial q-001 etc
        # normalize options length to at least 2
        for it in items:
            if isinstance(it['options'], list) and len(it['options'])==0:
                # try to extract options in question using (a) pattern
                found = re.findall(r'\(?[a-eA-E]\)?[\.:\)\-]?\s*([^;\n\r]+)', it['question'])
                if found:
                    it['options'] = normalize_options(found)
        # fill serial ids if missing
        for i,it in enumerate(items):
            if not it['id']:
                it['id'] = f"auto-{i+1:03d}"
        # ensure final format exact as required
        final = []
        for it in items:
            out = {
                "id": it['id'],
                "question": it['question'] or '',
                "image": None,
                "options": it['options'] or [],
                "answer": it['answer'] or '',
                "explanation": it['explanation'] or ''
            }
            final.append(out)
        out_text = json.dumps(final, ensure_ascii=False, indent=4)
        self.output_box.delete('1.0', tk.END)
        self.output_box.insert('1.0', out_text)
        self.set_status(f"Converted {len(final)} items. Use 'Save JSON' to export.")

    def copy_all(self):
        try:
            self.root.clipboard_clear()
            self.root.clipboard_append(self.output_box.get('1.0', tk.END))
            self.set_status("Copied to clipboard.")
        except Exception as e:
            messagebox.showerror("Copy Failed", str(e))

    def save_json(self):
        content = self.output_box.get('1.0', tk.END).strip()
        if not content:
            messagebox.showinfo("Nothing to save", "Please convert input first.")
            return
        p = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON files","*.json"),("All files","*.*")])
        if not p:
            return
        with open(p, 'w', encoding='utf-8') as f:
            f.write(content)
        self.set_status(f"Saved to {p}")

    def autofill_ids(self):
        content = self.output_box.get('1.0', tk.END).strip()
        if not content:
            messagebox.showinfo("No output", "Please convert input first.")
            return
        try:
            arr = json.loads(content)
            for i,a in enumerate(arr):
                if not a.get('id'):
                    a['id'] = f"auto-{i+1:03d}"
            self.output_box.delete('1.0', tk.END)
            self.output_box.insert('1.0', json.dumps(arr, ensure_ascii=False, indent=4))
            self.set_status("Auto-filled missing ids.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to autofill ids: {e}")

def main():
    root = tk.Tk()
    app = ConverterApp(root)
    root.mainloop()

if __name__ == '__main__':
    main()