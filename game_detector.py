import json
import os
import platform
import ctypes
from ctypes import wintypes

class GameDetector:
    def __init__(self, settings_file="settings.json"):
        self.settings_file = settings_file
        self.os_type = platform.system()
        self.manual_games = []
        self.load_settings()

    def load_settings(self):
        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.manual_games = [g.lower() for g in data.get("manual_games", [])]
            except Exception:
                pass

    def add_game(self, game_name):
        self.load_settings()
        clean_name = game_name.strip().lower()
        if clean_name and clean_name not in self.manual_games:
            self.manual_games.append(clean_name)
            try:
                with open(self.settings_file, "w", encoding="utf-8") as f:
                    json.dump({"manual_games": self.manual_games, "game_mode_enabled": True, "hover_delay_seconds": 3.5}, f, indent=2)
            except Exception:
                pass

    def is_game_active(self):
        """Ön plandaki pencerenin tam ekran bir oyun olup olmadığını veya listede olup olmadığını saptar"""
        if self.os_type != "Windows":
            return False, ""

        user32 = ctypes.windll.user32
        hwnd = user32.GetForegroundWindow()
        if not hwnd:
            return False, ""

        # 1. Başlık ve PID kontrolü
        length = user32.GetWindowTextLengthW(hwnd)
        buff = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buff, length + 1)
        window_title = buff.value.lower()

        # Manuel liste kontrolü
        for g in self.manual_games:
            base_g = g.replace(".exe", "")
            if base_g in window_title:
                return True, buff.value

        # 2. Tam Ekran (Fullscreen) algılama: Oyunlar ekran çözünürlüğünü kaplar
        rect = wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        sw = user32.GetSystemMetrics(0)
        sh = user32.GetSystemMetrics(1)

        is_fullscreen = (rect.left <= 0 and rect.top <= 0 and rect.right >= sw and rect.bottom >= sh)
        
        # Masaüstü veya Windows Gezgini tam ekran sayılmamalı
        if is_fullscreen and window_title and window_title not in ["program manager", "", "taskbar"]:
            return True, buff.value

        return False, ""
