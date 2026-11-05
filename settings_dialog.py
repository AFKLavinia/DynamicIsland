import tkinter as tk
from tkinter import ttk, messagebox
import json
import os

class ModernSettingsDialog(tk.Toplevel):
    def __init__(self, parent, weather_service, game_detector, on_saved_callback=None):
        super().__init__(parent)

        self.title("Dynamic Island Ayarları")
        self.geometry("460x520")
        self.resizable(False, False)
        self.attributes("-topmost", True)
        
        # Koyu modern tema
        self.configure(bg="#1c1c1e")
        self.weather_service = weather_service
        self.game_detector = game_detector
        self.on_saved_callback = on_saved_callback

        # Ortala
        parent_x = parent.winfo_x()
        parent_y = parent.winfo_y()
        self.geometry(f"+{max(50, parent_x - 30)}+100")

        self.setup_ui()

    def setup_ui(self):
        # Başlık Banner
        header = tk.Frame(self, bg="#2c2c2e", height=50)
        header.pack(fill=tk.X)
        header.pack_propagate(False)

        title_lbl = tk.Label(header, text="⚙️ Dynamic Island Ayarları", font=("Segoe UI", 12, "bold"), fg="#ffffff", bg="#2c2c2e")
        title_lbl.pack(side=tk.LEFT, padx=16, pady=12)

        # İçerik Alanı
        content = tk.Frame(self, bg="#1c1c1e")
        content.pack(fill=tk.BOTH, expand=True, padx=20, pady=15)

        # 1. BÖLÜM: HAVA DURUMU & KONUM
        lbl_sec1 = tk.Label(content, text="📍 HAVA DURUMU & ŞEHİR", font=("Segoe UI", 9, "bold"), fg="#0a84ff", bg="#1c1c1e")
        lbl_sec1.pack(anchor=tk.W, pady=(0, 6))

        city_frame = tk.Frame(content, bg="#2c2c2e", bd=0, padx=10, pady=8)
        city_frame.pack(fill=tk.X, pady=(0, 15))

        tk.Label(city_frame, text="Şehir / İlçe:", font=("Segoe UI", 9), fg="#e5e5ea", bg="#2c2c2e").pack(anchor=tk.W)

        self.city_entry = tk.Entry(city_frame, font=("Segoe UI", 10), bg="#3a3a3c", fg="#ffffff", insertbackground="#ffffff", relief=tk.FLAT)
        self.city_entry.insert(0, self.weather_service.city_name)
        self.city_entry.pack(fill=tk.X, pady=6, ipady=4)

        btn_city = tk.Button(city_frame, text="Konumu Güncelle ve Kaydet", font=("Segoe UI", 9, "bold"), bg="#0a84ff", fg="#ffffff",
                             activebackground="#0071e3", activeforeground="#ffffff", relief=tk.FLAT, cursor="hand2", command=self.update_city)
        btn_city.pack(anchor=tk.E, pady=(2, 0))

        # 2. BÖLÜM: OYUN MODU & MANUEL LİSTE
        lbl_sec2 = tk.Label(content, text="🎮 OYUN MODU & UYGULAMA LİSTESİ", font=("Segoe UI", 9, "bold"), fg="#30d158", bg="#1c1c1e")
        lbl_sec2.pack(anchor=tk.W, pady=(0, 6))

        game_frame = tk.Frame(content, bg="#2c2c2e", padx=10, pady=8)
        game_frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(game_frame, text="Oyun oynarken ada otomatik olarak gizlenir.", font=("Segoe UI", 8), fg="#8e8e93", bg="#2c2c2e").pack(anchor=tk.W)

        # Liste kutusu
        self.listbox = tk.Listbox(game_frame, font=("Segoe UI", 9), bg="#3a3a3c", fg="#ffffff", selectbackground="#0a84ff", relief=tk.FLAT, bd=0, height=6)
        self.listbox.pack(fill=tk.BOTH, expand=True, pady=6)
        self.populate_games()

        # Ekleme satırı
        add_row = tk.Frame(game_frame, bg="#2c2c2e")
        add_row.pack(fill=tk.X, pady=(2, 0))

        self.new_game_entry = tk.Entry(add_row, font=("Segoe UI", 9), bg="#3a3a3c", fg="#ffffff", insertbackground="#ffffff", relief=tk.FLAT)
        self.new_game_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=3)
        self.new_game_entry.bind("<Return>", lambda e: self.add_game())

        btn_add = tk.Button(add_row, text="+ Ekle", font=("Segoe UI", 9, "bold"), bg="#30d158", fg="#ffffff", relief=tk.FLAT, cursor="hand2", command=self.add_game)
        btn_add.pack(side=tk.LEFT, padx=(6, 0))

        btn_del = tk.Button(add_row, text="Sil", font=("Segoe UI", 9), bg="#ff453a", fg="#ffffff", relief=tk.FLAT, cursor="hand2", command=self.delete_selected_game)
        btn_del.pack(side=tk.LEFT, padx=(6, 0))

        # Kapat Butonu
        btn_close = tk.Button(self, text="Kapat", font=("Segoe UI", 10, "bold"), bg="#3a3a3c", fg="#ffffff", relief=tk.FLAT, cursor="hand2", command=self.destroy)
        btn_close.pack(pady=12, ipadx=20, ipady=3)

    def populate_games(self):
        self.listbox.delete(0, tk.END)
        self.game_detector.load_settings()
        for g in self.game_detector.manual_games:
            self.listbox.insert(tk.END, f"  {g}")

    def update_city(self):
        city = self.city_entry.get().strip()
        if city:
            success, name = self.weather_service.search_and_set_city(city)
            if success:
                messagebox.showinfo("Konum Güncellendi", f"Konum '{name}' olarak ayarlandı!", parent=self)
            else:
                messagebox.showwarning("Bilgi", f"'{city}' kaydedildi. Koordinatlar güncellendi.", parent=self)
            if self.on_saved_callback:
                self.on_saved_callback()

    def add_game(self):
        val = self.new_game_entry.get().strip()
        if val:
            self.game_detector.add_game(val)
            self.new_game_entry.delete(0, tk.END)
            self.populate_games()

    def delete_selected_game(self):
        sel = self.listbox.curselection()
        if sel:
            game_str = self.listbox.get(sel[0]).strip()
            self.game_detector.manual_games = [g for g in self.game_detector.manual_games if g != game_str]
            # Kaydet
            with open(self.game_detector.settings_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["manual_games"] = self.game_detector.manual_games
            with open(self.game_detector.settings_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            self.populate_games()
