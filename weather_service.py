import json
import urllib.request
import os

class WeatherService:
    def __init__(self, settings_file="settings.json"):
        self.settings_file = settings_file
        self.city_name = "İstanbul"
        self.lat = 41.0082
        self.lon = 28.9784
        self.auto_location = True
        self.load_from_settings()

    def load_from_settings(self):
        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.city_name = data.get("city", "İstanbul")
                    self.lat = float(data.get("lat", 41.0082))
                    self.lon = float(data.get("lon", 28.9784))
                    self.auto_location = data.get("auto_location", True)
            except Exception:
                pass

    def save_settings(self, city, lat, lon):
        self.city_name = city
        self.lat = lat
        self.lon = lon
        try:
            data = {}
            if os.path.exists(self.settings_file):
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
            data["city"] = city
            data["lat"] = lat
            data["lon"] = lon
            with open(self.settings_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    def search_and_set_city(self, city_query):
        """Kullanıcının girdiği şehri Open-Meteo Geocoding üzerinden bulup kaydeder"""
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(city_query)}&count=1&language=tr&format=json"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'DynamicIsland/1.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                d = json.loads(r.read().decode('utf-8'))
                results = d.get("results", [])
                if results:
                    first = results[0]
                    name = first.get("name", city_query)
                    admin = first.get("admin1", "")
                    display_city = f"{name}, {admin}" if admin and admin != name else name
                    lat = first.get("latitude", self.lat)
                    lon = first.get("longitude", self.lon)
                    self.save_settings(display_city, lat, lon)
                    return True, display_city
        except Exception:
            pass
        # Basit yerel fallback
        known = {
            "istanbul": ("İstanbul", 41.0082, 28.9784),
            "ankara": ("Ankara", 39.9334, 32.8597),
            "izmir": ("İzmir", 38.4192, 27.1287),
            "bursa": ("Bursa", 40.1885, 29.0610),
            "antalya": ("Antalya", 36.8969, 30.7133),
            "adana": ("Adana", 37.0000, 35.3213),
            "konya": ("Konya", 37.8667, 32.4833)
        }
        low = city_query.strip().lower()
        if low in known:
            c, lt, ln = known[low]
            self.save_settings(c, lt, ln)
            return True, c

        self.save_settings(city_query, self.lat, self.lon)
        return False, "Bulunamadı (Varsayılan koordinat kullanılıyor)"

    def get_weather(self):
        self.load_from_settings()
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={self.lat}&longitude={self.lon}&current_weather=true"
        )
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'DynamicIsland/1.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                current = data.get("current_weather", {})
                temp = current.get("temperature", "--")
                wcode = current.get("weathercode", 0)
                desc = self._code_to_desc(wcode)
                return {
                    "city": self.city_name,
                    "temp": f"{temp}°C",
                    "desc": desc,
                    "success": True
                }
        except Exception as e:
            return {
                "city": self.city_name,
                "temp": "--°C",
                "desc": "Bağlantı Yok",
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def _code_to_desc(code):
        if code == 0:
            return "Açık ☀️"
        elif code in (1, 2, 3):
            return "Parçalı Bulutlu ⛅"
        elif code in (45, 48):
            return "Sisli 🌫️"
        elif code in (51, 53, 55, 61, 63, 65):
            return "Yağmurlu 🌧️"
        elif code in (71, 73, 75):
            return "Karlı ❄️"
        elif code in (95, 96, 99):
            return "Fırtına ⛈️"
        return "Bulutlu ☁️"
