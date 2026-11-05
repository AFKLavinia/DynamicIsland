import tkinter as tk
from tkinter import simpledialog, messagebox
import threading
import time
from weather_service import WeatherService
from music_service import MusicService
from game_detector import GameDetector
from settings_dialog import ModernSettingsDialog

class DynamicIsland(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title("Dynamic Island")

        # Servisler
        self.weather_service = WeatherService()
        self.music_service = MusicService()
        self.game_detector = GameDetector()

        self.weather_data = {"city": "Yükleniyor...", "temp": "--", "desc": ""}
        self.music_status = {"has_music": False, "title": "Müzik Algılanmadı", "app": "Çalan medya yok"}

        # Pencere Özellikleri
        self.overrideredirect(True)
        self.attributes("-topmost", True)

        # Şeffaflık Rengi
        self.BG_KEY = "#020202"
        self.configure(bg=self.BG_KEY)
        try:
            self.wm_attributes("-transparentcolor", self.BG_KEY)
        except Exception:
            pass

        self.screen_width = self.winfo_screenwidth()

        # Boyutlar: Dikdörtgen & Yumuşak Hatlar (Apple tarzı modern Rounded Rect)
        self.bar_w = 120
        self.bar_h = 5

        self.compact_w = 280
        self.compact_h = 36

        self.expanded_w = 440
        self.expanded_h = 175

        # Başlangıç durumu
        self.mode = "bar" # "bar", "compact", "expanded", "game_hidden"
        self.current_w = float(self.bar_w)
        self.current_h = float(self.bar_h)
        self.target_w = float(self.bar_w)
        self.target_h = float(self.bar_h)

        self.animating = False
        self.current_tab = "music"
        self.in_game = False
        self.hover_start_time = None
        self.leave_job = None

        # Canvas
        self.canvas = tk.Canvas(
            self,
            bg=self.BG_KEY,
            highlightthickness=0,
            bd=0
        )
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # Fare Etkinlikleri
        self.canvas.bind("<Enter>", self.on_mouse_enter)
        self.canvas.bind("<Leave>", self.on_mouse_leave)
        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<Button-3>", lambda e: self.open_settings())

        # İlk Konum & Çizim
        self.pos_x = (self.screen_width - self.current_w) / 2
        self.pos_y = 0
        self.update_geometry()
        self.draw_ui()

        # Arka Plan Otonom Servisler
        threading.Thread(target=self.auto_music_loop, daemon=True).start()
        threading.Thread(target=self.auto_weather_loop, daemon=True).start()
        threading.Thread(target=self.auto_game_loop, daemon=True).start()

    def update_geometry(self):
        self.geometry(f"{int(self.current_w)}x{int(self.current_h)}+{int(self.pos_x)}+{self.pos_y}")

    def draw_ui(self):
        """Hafif yuvarlatılmış dikdörtgen (modern squircle) ada çizer"""
        self.canvas.delete("all")
        w = int(self.current_w)
        h = int(self.current_h)

        if self.mode == "game_hidden" or h <= 2:
            return

        if self.mode == "bar":
            # Ekranın üstünde ince zarif çizgi
            self.draw_rounded_rect(0, 0, w, h, radius=2, fill="#3c3c3e")
            return

        # Kompakt veya Geniş Ada: Modern Dikdörtgen Yapı (Radius: 10-14px)
        r = 10 if self.mode == "compact" else 14
        # Dış ince sınır
        self.draw_rounded_rect(0, 0, w, h, radius=r, fill="#2c2c2e")
        # İç derin mat gövde
        pad = 1
        if w > 2*pad and h > 2*pad:
            self.draw_rounded_rect(pad, 0, w - pad, h - pad, radius=r - 1, fill="#121214")

        if self.mode == "compact":
            self.render_compact_content(w, h)
        elif self.mode == "expanded":
            self.render_expanded_content(w, h)

    def draw_rounded_rect(self, x1, y1, x2, y2, radius=12, fill="#121214"):
        """Üst kenarı düz (ekranla bütünleşik), alt köşeleri yumuşak yuvarlatılmış dikdörtgen"""
        r = min(radius, (x2 - x1) // 2, (y2 - y1))
        # Köşe yayları (sadece alt köşeler)
        self.canvas.create_arc((x1, y2 - 2*r, x1 + 2*r, y2), start=180, extent=90, fill=fill, outline="")
        self.canvas.create_arc((x2 - 2*r, y2 - 2*r, x2, y2), start=270, extent=90, fill=fill, outline="")
        # Ana dikdörtgenler
        self.canvas.create_rectangle((x1 + r, y1, x2 - r, y2), fill=fill, outline="")
        self.canvas.create_rectangle((x1, y1, x2, y2 - r), fill=fill, outline="")

    def render_compact_content(self, w, h):
        if h < 25: return
        has_music = self.music_status["has_music"]
        music_icon = "🎵" if has_music else "⚪"
        icon_color = "#30d158" if has_music else "#636366"
        self.canvas.create_text(24, h / 2, text=music_icon, fill=icon_color, font=("Segoe UI Emoji", 10))

        title = self.music_status["title"]
        if len(title) > 23:
            title = title[:21] + "..."
        title_color = "#ffffff" if has_music else "#8e8e93"
        self.canvas.create_text(w / 2, h / 2, text=title, fill=title_color, font=("Segoe UI", 9, "bold" if has_music else "normal"))

        temp = self.weather_data.get("temp", "--")
        self.canvas.create_text(w - 28, h / 2, text=temp, fill="#64d2ff", font=("Segoe UI", 9, "bold"))

    def render_expanded_content(self, w, h):
        if h < 100: return
        # Üst Sekmeler ve Sağda Ayarlar Butonu
        tabs = [("🎵 Müzik", "music", w * 0.28), ("⛅ Hava Durumu", "weather", w * 0.60)]
        for title, key, tx in tabs:
            is_active = (self.current_tab == key)
            color = "#ffffff" if is_active else "#8e8e93"
            t_id = self.canvas.create_text(tx, 22, text=title, fill=color, font=("Segoe UI", 10, "bold" if is_active else "normal"))
            self.canvas.tag_bind(t_id, "<Button-1>", lambda e, k=key: self.switch_tab(k))

        # Sağ üst köşede modern Ayarlar butonu
        settings_btn = self.canvas.create_text(w - 32, 22, text="⚙️", fill="#8e8e93", font=("Segoe UI Emoji", 12))
        self.canvas.tag_bind(settings_btn, "<Button-1>", lambda e: self.open_settings())

        # Ayırıcı
        self.canvas.create_line(18, 38, w - 18, 38, fill="#2c2c2e", width=1)

        if self.current_tab == "music":
            self.render_music_tab(w, h)
        elif self.current_tab == "weather":
            self.render_weather_tab(w, h)

    def render_music_tab(self, w, h):
        has_music = self.music_status["has_music"]
        title = self.music_status["title"]
        app_name = self.music_status["app"]

        # Şarkı Bilgisi Alanı
        if has_music:
            self.canvas.create_text(w/2, 60, text=title[:38], fill="#ffffff", font=("Segoe UI", 10, "bold"))
            self.canvas.create_text(w/2, 80, text=f"Medya Kaynağı: {app_name}", fill="#30d158", font=("Segoe UI", 9))
        else:
            self.canvas.create_text(w/2, 60, text="Müzik Algılanmadı", fill="#ff453a", font=("Segoe UI", 11, "bold"))
            self.canvas.create_text(w/2, 80, text="Spotify / Tarayıcıda bir şarkı başlatın", fill="#8e8e93", font=("Segoe UI", 9))

        # Modern Yuvarlak Buton Arka Planları
        btn_y = 126
        # Önceki
        self.draw_button_bubble(w/2 - 70, btn_y, "⏮️", 16, lambda: self.music_service.prev_track())
        # Oynat / Durdur (Vurgulu Buton)
        self.draw_button_bubble(w/2, btn_y, "⏯️", 20, lambda: self.music_service.play_pause(), is_accent=True)
        # Sonraki
        self.draw_button_bubble(w/2 + 70, btn_y, "⏭️", 16, lambda: self.music_service.next_track())

    def draw_button_bubble(self, x, y, icon, size, command, is_accent=False):
        """Müzik kontrolleri için yumuşak hap şeklinde buton arka planı"""
        r = 18 if is_accent else 16
        bg_col = "#242426" if not is_accent else "#1c3829"
        icon_col = "#ffffff" if not is_accent else "#30d158"

        # Dairesel arka plan
        circ = self.canvas.create_oval(x - r, y - r, x + r, y + r, fill=bg_col, outline="")
        txt = self.canvas.create_text(x, y, text=icon, fill=icon_col, font=("Segoe UI Emoji", size))

        self.canvas.tag_bind(circ, "<Button-1>", lambda e: command())
        self.canvas.tag_bind(txt, "<Button-1>", lambda e: command())

    def render_weather_tab(self, w, h):
        city = self.weather_data.get("city", "İstanbul")
        temp = self.weather_data.get("temp", "--")
        desc = self.weather_data.get("desc", "Yükleniyor...")

        self.canvas.create_text(w/2, 62, text=f"📍 {city}", fill="#ffffff", font=("Segoe UI", 12, "bold"))
        self.canvas.create_text(w/2, 94, text=f"{temp}  {desc}", fill="#64d2ff", font=("Segoe UI", 16, "bold"))
        
        btn = self.canvas.create_text(w/2, 134, text="[Şehri Değiştirmek İçin Tıklayın ⚙️]", fill="#0a84ff", font=("Segoe UI", 9, "underline"))
        self.canvas.tag_bind(btn, "<Button-1>", lambda e: self.open_settings())

    def open_settings(self):
        ModernSettingsDialog(self, self.weather_service, self.game_detector, on_saved_callback=self.on_settings_saved)

    def on_settings_saved(self):
        threading.Thread(target=self.refresh_weather_now, daemon=True).start()

    def refresh_weather_now(self):
        data = self.weather_service.get_weather()
        if data.get("success"):
            self.weather_data = data
            self.after(0, self.draw_ui)

    def switch_tab(self, key):
        self.current_tab = key
        self.draw_ui()

    def on_click(self, event):
        if self.mode == "bar":
            self.set_target_mode("compact")
        elif self.mode == "compact":
            self.set_target_mode("expanded")

    def on_mouse_enter(self, event):
        if self.leave_job:
            self.after_cancel(self.leave_job)
            self.leave_job = None

        self.hover_start_time = time.time()
        if self.in_game:
            self.after(4000, self.check_game_hover_open)
        else:
            if self.mode != "expanded":
                self.set_target_mode("compact")

    def check_game_hover_open(self):
        if self.in_game and self.hover_start_time:
            if time.time() - self.hover_start_time >= 3.8:
                self.set_target_mode("compact")

    def on_mouse_leave(self, event):
        self.hover_start_time = None
        if self.leave_job:
            self.after_cancel(self.leave_job)
        self.leave_job = self.after(160, self.check_mouse_really_left)

    def check_mouse_really_left(self):
        px, py = self.winfo_pointerxy()
        if not (self.pos_x <= px <= self.pos_x + self.current_w and self.pos_y <= py <= self.pos_y + self.current_h):
            if self.in_game:
                self.set_target_mode("game_hidden")
            else:
                self.set_target_mode("bar")

    def set_target_mode(self, new_mode):
        self.mode = new_mode

        if new_mode == "game_hidden":
            self.target_w, self.target_h = 40.0, 2.0
        elif new_mode == "bar":
            self.target_w, self.target_h = float(self.bar_w), float(self.bar_h)
        elif new_mode == "compact":
            self.target_w, self.target_h = float(self.compact_w), float(self.compact_h)
        elif new_mode == "expanded":
            self.target_w, self.target_h = float(self.expanded_w), float(self.expanded_h)

        if not self.animating:
            self.animating = True
            self.animation_step()

    def animation_step(self):
        diff_w = self.target_w - self.current_w
        diff_h = self.target_h - self.current_h

        if abs(diff_w) > 0.8 or abs(diff_h) > 0.8:
            self.current_w += diff_w * 0.35
            self.current_h += diff_h * 0.35
            self.pos_x = (self.screen_width - self.current_w) / 2
            self.update_geometry()
            self.draw_ui()
            self.after(16, self.animation_step)
        else:
            self.current_w = self.target_w
            self.current_h = self.target_h
            self.pos_x = (self.screen_width - self.current_w) / 2
            self.update_geometry()
            self.draw_ui()
            self.animating = False

    def auto_music_loop(self):
        while True:
            has_music, title, app_name = self.music_service.check_music_status()
            changed = (self.music_status["has_music"] != has_music or self.music_status["title"] != title)
            self.music_status = {"has_music": has_music, "title": title, "app": app_name}
            if changed and not self.animating and self.mode in ["compact", "expanded"]:
                self.after(0, self.draw_ui)
            time.sleep(1.5)

    def auto_weather_loop(self):
        while True:
            data = self.weather_service.get_weather()
            if data.get("success"):
                self.weather_data = data
                if not self.animating and self.mode in ["compact", "expanded"]:
                    self.after(0, self.draw_ui)
            time.sleep(300)

    def auto_game_loop(self):
        while True:
            is_game, _ = self.game_detector.is_game_active()
            if is_game and not self.in_game:
                self.in_game = True
                self.after(0, lambda: self.set_target_mode("game_hidden"))
            elif not is_game and self.in_game:
                self.in_game = False
                self.after(0, lambda: self.set_target_mode("bar"))
            time.sleep(1.5)

if __name__ == "__main__":
    app = DynamicIsland()
    app.mainloop()
