import platform
import subprocess
import ctypes
from ctypes import wintypes
import re

class MusicService:
    def __init__(self):
        self.os_type = platform.system()
        self.is_playing = False
        self.track_name = ""
        self.artist_name = ""
        self.has_music = False

    def check_music_status(self):
        """Sistemde aktif çalan müzik / medya oynatıcıyı otonom olarak algılar"""
        if self.os_type == "Windows":
            return self._detect_windows_media()
        elif self.os_type == "Linux":
            return self._detect_linux_media()
        return False, "Algılanmadı", ""

    def _detect_windows_media(self):
        user32 = ctypes.windll.user32
        WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

        detected_title = ""
        detected_app = ""

        # Müzik/video platformları
        patterns = [
            (r"^(.*?)\s*-\s*Spotify.*$", "Spotify"),
            (r"^(.*?)\s*-\s*YouTube.*$", "YouTube"),
            (r"^(.*?)\s*-\s*VLC media player$", "VLC"),
            (r"^(.*?)\s*-\s*SoundCloud.*$", "SoundCloud"),
            (r"^(.*?)\s*-\s*Apple Music.*$", "Apple Music"),
            (r"^(.*?)\s*-\s*TIDAL.*$", "TIDAL"),
            (r"^(.*?)\s*-\s*Deezer.*$", "Deezer")
        ]

        def enum_proc(hwnd, lparam):
            nonlocal detected_title, detected_app
            if user32.IsWindowVisible(hwnd):
                length = user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buff = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd, buff, length + 1)
                    title = buff.value.strip()

                    # Spotify özel durum
                    if "Spotify" in title and title != "Spotify Free" and title != "Spotify Premium" and title != "Spotify":
                        detected_title = title.replace("Spotify - ", "").replace(" - Spotify", "")
                        detected_app = "Spotify"
                        return False

                    for pat, app_name in patterns:
                        m = re.match(pat, title, re.IGNORECASE)
                        if m:
                            song = m.group(1).strip()
                            if song and len(song) > 1:
                                detected_title = song
                                detected_app = app_name
                                return False
            return True

        try:
            user32.EnumWindows(WNDENUMPROC(enum_proc), 0)
        except Exception:
            pass

        if detected_title:
            self.has_music = True
            self.track_name = detected_title
            self.artist_name = detected_app
            return True, self.track_name, self.artist_name
        else:
            self.has_music = False
            self.track_name = "Müzik Algılanmadı"
            self.artist_name = "Çalan medya yok"
            return False, self.track_name, self.artist_name

    def _detect_linux_media(self):
        try:
            res = subprocess.run(["playerctl", "metadata", "--format", "{{artist}} - {{title}}"],
                                 stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, timeout=1)
            output = res.stdout.strip()
            if output:
                self.has_music = True
                self.track_name = output
                return True, output, "Linux Medya"
        except Exception:
            pass
        self.has_music = False
        return False, "Müzik Algılanmadı", ""

    def play_pause(self):
        if self.os_type == "Windows":
            self._send_windows_key(0xB3)
        elif self.os_type == "Linux":
            subprocess.run(["playerctl", "play-pause"], stderr=subprocess.DEVNULL)

    def next_track(self):
        if self.os_type == "Windows":
            self._send_windows_key(0xB0)
        elif self.os_type == "Linux":
            subprocess.run(["playerctl", "next"], stderr=subprocess.DEVNULL)

    def prev_track(self):
        if self.os_type == "Windows":
            self._send_windows_key(0xB1)
        elif self.os_type == "Linux":
            subprocess.run(["playerctl", "previous"], stderr=subprocess.DEVNULL)

    def _send_windows_key(self, vk_code):
        user32 = ctypes.windll.user32
        KEYEVENTF_KEYUP = 0x0002
        user32.keybd_event(vk_code, 0, 0, 0)
        user32.keybd_event(vk_code, 0, KEYEVENTF_KEYUP, 0)
