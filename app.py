import tkinter as tk
from tkinter import scrolledtext, messagebox
import json

def convert_questions():
    raw_text = input_box.get("1.0", tk.END).strip()

    if not raw_text:
        messagebox.showwarning("Error", "Please paste raw data.")
        return

    # Ensure raw text becomes a valid JSON array
    raw_text = raw_text.strip().rstrip(',')
    if not raw_text.startswith("["):
        raw_text = "[" + raw_text + "]"

    try:
        data = json.loads(raw_text)
    except Exception as e:
        messagebox.showerror("JSON Error", f"Invalid JSON Format:\n{e}")
        return

    final_output = []

    # Function to convert index answer → full option string
    def get_answer_text(options, answer):
        if isinstance(answer, int):
            return f"(a) {options[0]}" if answer == 0 else \
                   f"(b) {options[1]}" if answer == 1 else \
                   f"(c) {options[2]}" if answer == 2 else \
                   f"(d) {options[3]}"
        elif isinstance(answer, str) and answer.isdigit():
            idx = int(answer)
            return f"(a) {options[0]}" if idx == 0 else \
                   f"(b) {options[1]}" if idx == 1 else \
                   f"(c) {options[2]}" if idx == 2 else \
                   f"(d) {options[3]}"
        else:
            # If answer already text → return as is
            return answer

    for item in data:
        qid = item.get("id", "")

        question = item.get("question", "").strip()
        explanation = item.get("explanation", "").strip()

        # Convert options into proper "(a) text"
        options = item.get("options", [])
        formatted_options = []

        labels = ["(a) ", "(b) ", "(c) ", "(d) ", "(e) "]

        for i, opt in enumerate(options):
            formatted_options.append(f"{labels[i]}{opt}")

        # Convert answer
        answer = get_answer_text(options, item.get("answer"))

        formatted_block = {
            "id": qid,
            "question": question,
            "image": None,
            "options": formatted_options,
            "answer": answer,
            "explanation": explanation
        }

        final_output.append(formatted_block)

    # Pretty output
    output_box.delete("1.0", tk.END)
    output_box.insert(tk.END, json.dumps(final_output, indent=4))


# ------------------- GUI ---------------------
root = tk.Tk()
root.title("Logic Question Formatter (Perfect Version)")
root.geometry("1100x700")

tk.Label(root, text="Paste RAW Data Below:", font=("Arial", 12, "bold")).pack()

input_box = scrolledtext.ScrolledText(root, width=130, height=20, font=("Consolas", 10))
input_box.pack(pady=5)

tk.Button(root, text="CONVERT → OFFICIAL FORMAT", font=("Arial", 12, "bold"),
          bg="green", fg="white", command=convert_questions).pack(pady=10)

tk.Label(root, text="Converted Output:", font=("Arial", 12, "bold")).pack()

output_box = scrolledtext.ScrolledText(root, width=130, height=20, font=("Consolas", 10))
output_box.pack(pady=5)

root.mainloop()
