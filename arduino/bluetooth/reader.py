#!/usr/bin/env python3
"""
FCHAN — Arduino Bluetooth Reader
Reads sensor data from Arduino via Bluetooth
and sends to FCHAN API
"""

import bluetooth
import requests
import time
import sys
from datetime import datetime

# ── CONFIGURATION ──────────────────────────────────
FCHAN_API_URL = "http://localhost:3000/api"

# Replace with your actual sensor API keys
SENSOR_API_KEYS = {
    "temperature":   "YOUR_TEMPERATURE_SENSOR_API_KEY",
    "humidity":      "YOUR_HUMIDITY_SENSOR_API_KEY",
    "soil_moisture": "YOUR_SOIL_MOISTURE_SENSOR_API_KEY",
    "soil_ph":       "YOUR_SOIL_PH_SENSOR_API_KEY",
    "light":         "YOUR_LIGHT_SENSOR_API_KEY",
}

# Your Arduino's Bluetooth MAC address
# Find it by running: hcitool scan
BT_MAC_ADDRESS = "XX:XX:XX:XX:XX:XX"
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
        'CO2':   'co2',
        'WIND':  'wind',
        'RAIN':  'rainfall'
    }
    sensor_type = sensor_map.get(parts[0].upper())
    try:
        value = float(parts[1])
    except ValueError:
        return None, None
    return sensor_type, value

# ── SCAN FOR BLUETOOTH DEVICES ──────────────────────
def scan_devices():
    log("Scanning for Bluetooth devices...", BLUE)
    try:
        devices = bluetooth.discover_devices(
            duration=8, lookup_names=True
        )
        if not devices:
            log("No Bluetooth devices found", RED)
            return
        log("Found devices:", GREEN)
        for addr, name in devices:
            print(f"  {BLUE}→ {addr} — {name}{RESET}")
    except Exception as e:
        log(f"Scan error: {e}", RED)

# ── MAIN ────────────────────────────────────────────
def main():
    log("FCHAN Bluetooth Reader", GREEN)
    log("=" * 40, GREEN)

    if '--scan' in sys.argv:
        scan_devices()
        return

    log(f"Connecting to {BT_MAC_ADDRESS}...", BLUE)

    while True:
        try:
            sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
            sock.connect((BT_MAC_ADDRESS, BT_PORT))
            sock.settimeout(BT_TIMEOUT)
            log("Connected!", GREEN)

            buffer = ""
            while True:
                data = sock.recv(1024).decode('utf-8')
                buffer += data

                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    if not line:
                        continue

                    log(f"{line}", BLUE)
                    sensor_type, value = parse_line(line)

                    if sensor_type is None:
                        continue

                    api_key = SENSOR_API_KEYS.get(sensor_type)
                    if not api_key or api_key.startswith("YOUR_"):
                        log(f"No API key for {sensor_type}", YELLOW)
                        continue

                    send_reading(api_key, value)

        except bluetooth.BluetoothError as e:
            log(f"Bluetooth error: {e}", RED)
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
