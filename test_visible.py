import tkinter as tk

def test():
    root = tk.Tk()
    root.title("Dynamic Island Test")
    root.geometry("400x100+400+50")
    root.attributes("-topmost", True)
    
    label = tk.Label(root, text="Dynamic Island Burada! Goruyor musunuz?", font=("Arial", 14), bg="black", fg="white")
    label.pack(fill=tk.BOTH, expand=True)
    
    btn = tk.Button(root, text="Kapat", command=root.destroy, bg="red", fg="white")
    btn.pack(pady=5)
    
    root.mainloop()

if __name__ == "__main__":
    test()
