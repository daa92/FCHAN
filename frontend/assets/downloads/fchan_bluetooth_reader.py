#!/usr/bin/env python3
import socket  # Utilise le Bluetooth natif de Windows
import requests
import time
import sys
from datetime import datetime

# ── CONFIGURATION ──────────────────────────────────
FCHAN_API_URL = "https://fchan.onrender.com/api"

SENSOR_API_KEYS = {
    "temperature":   "YOUR_SOIL_TEMPERATURE_SENSOR_API_KEY",
    "humidity":      "YOUR_SOIL_HUMIDITY_SENSOR_API_KEY",
    "soil_moisture": "YOUR_SOIL_MOISTURE_SENSOR_API_KEY",
    "soil_ph":       "YOUR_SOIL_PH_SENSOR_API_KEY",
    "light":         "YOUR_SOIL_LIGHT_SENSOR_API_KEY",
}

BT_MAC_ADDRESS = "58:56:00:00:B6:63"
BT_PORT        = 1
BT_TIMEOUT     = 10

# ── COLORS ─────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
RESET  = "\033[0m"

def log(msg, color=RESET):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{ts}] {msg}{RESET}")

# ── SEND READING ────────────────────────────────────
def send_reading(api_key, value):
    try:
        response = requests.post(
            f"{FCHAN_API_URL}/sensors/readings/ingest",
            json={
                "api_key": api_key,
                "value":   float(value),
                "recorded_at": datetime.utcnow().isoformat() + "Z"
            },
            timeout=5
        )
        data = response.json()
        if data.get("success"):
            log(f"Sent: {value}", GREEN)
            return True
        else:
            log(f"API error: {data.get('message')}", RED)
            return False
    except Exception as e:
        log(f"Error: {e}", RED)
        return False

# ── PARSE LINE ──────────────────────────────────────
def parse_line(line):
    line = line.strip()
    if ':' not in line:
        return None, None
    parts = line.split(':', 1)
    
    sensor_map = {
        'TEMP':  'temperature',
        'HUM':   'humidity',
        'SOIL':  'soil_moisture',
        'PH':    'soil_ph',
        'LIGHT': 'light',
    }
    
    # .strip().upper() évite les espaces cachés envoyés par l'Arduino
    sensor_type = sensor_map.get(parts[0].strip().upper())
    try:
        value = float(parts[1].strip()) # Correction : index [1] pour la valeur
    except (ValueError, IndexError):
        return None, None
    return sensor_type, value

# ── MAIN ────────────────────────────────────────────
def main():
    log("FCHAN Bluetooth Reader (Direct MAC Mode)", GREEN)
    log("=" * 40, GREEN)

    log(f"Connecting to {BT_MAC_ADDRESS}...", BLUE)

    while True:
        try:
            # Connexion Bluetooth directe sans port COM virtuel
            sock = socket.socket(socket.AF_BLUETOOTH, socket.SOCK_STREAM, socket.BTPROTO_RFCOMM)
            sock.settimeout(BT_TIMEOUT)
            sock.connect((BT_MAC_ADDRESS, BT_PORT))
            log("Connected via MAC Address!", GREEN)

            buffer = ""
            while True:
                data = sock.recv(1024).decode('utf-8', errors='ignore')
                buffer += data

                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    if not line:
                        continue

                    log(f"Received: {line}", BLUE)
                    sensor_type, value = parse_line(line)

                    if sensor_type is None:
                        continue

                    api_key = SENSOR_API_KEYS.get(sensor_type)
                    if not api_key or api_key.startswith("YOUR_"):
                        log(f"No API key for {sensor_type}", YELLOW)
                        continue

                    send_reading(api_key, value)

        except (socket.error, OSError) as e:
            log(f"Bluetooth Error: {e}", RED)
            log("Retrying in 5 seconds...", YELLOW)
            time.sleep(5)
        except KeyboardInterrupt:
            log("\nStopped", YELLOW)
            break
        finally:
            try:
                sock.close()
            except:
                pass

if __name__ == "__main__":
    main()
