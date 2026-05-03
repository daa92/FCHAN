#!/usr/bin/env python3
"""
FCHAN — Arduino USB Serial Reader
Reads sensor data from Arduino via USB and sends to FCHAN API
"""

import serial
import serial.tools.list_ports
import requests
import json
import time
import sys
from datetime import datetime

# ── CONFIGURATION ──────────────────────────────────
FCHAN_API_URL = "http://localhost:3000/api"

# Map of sensor names to their API keys
# Fill these with your actual API keys from FCHAN dashboard
SENSOR_API_KEYS = {
    "temperature":   "1082c05710d8fa8198516cc2d290b8643b55485f605965d8bb6d99b78fab2a6c",
    "humidity":      "YOUR_HUMIDITY_SENSOR_API_KEY",
    "soil_moisture": "YOUR_SOIL_MOISTURE_SENSOR_API_KEY",
    "soil_ph":       "YOUR_SOIL_PH_SENSOR_API_KEY",
    "light":         "YOUR_LIGHT_SENSOR_API_KEY",
}

BAUD_RATE    = 9600
RETRY_DELAY  = 5   # seconds between retries
READ_TIMEOUT = 2   # serial read timeout

# ── COLORS FOR TERMINAL ─────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
RESET  = "\033[0m"

def log(msg, color=RESET):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{timestamp}] {msg}{RESET}")

# ── LIST AVAILABLE PORTS ────────────────────────────
def list_ports():
    ports = serial.tools.list_ports.comports()
    if not ports:
        log("No serial ports found", RED)
        return []
    log("Available ports:", BLUE)
    for p in ports:
        print(f"  {BLUE}→ {p.device} — {p.description}{RESET}")
    return [p.device for p in ports]

# ── FIND ARDUINO PORT ───────────────────────────────
def find_arduino_port():
    ports = serial.tools.list_ports.comports()
    for p in ports:
        # Arduino usually shows as USB Serial or ttyUSB
        if any(keyword in p.description.lower()
               for keyword in ['arduino', 'usb serial',
                               'ch340', 'cp210', 'ftdi']):
            return p.device
    return None

# ── SEND READING TO FCHAN ───────────────────────────
def send_reading(api_key, value):
    try:
        response = requests.post(
            f"{FCHAN_API_URL}/sensors/readings/ingest",
            json={
                "api_key":    api_key,
                "value":      float(value),
                "recorded_at": datetime.utcnow().isoformat() + "Z"
            },
            timeout=5
        )

        data = response.json()

        if data.get("success"):
            log(f"Reading sent: {value}", GREEN)
            return True
        else:
            log(f"API error: {data.get('message')}", RED)
            return False

    except requests.exceptions.ConnectionError:
        log("Cannot connect to FCHAN API. Is the backend running?", RED)
        return False
    except Exception as e:
        log(f"Send error: {e}", RED)
        return False

# ── PARSE ARDUINO LINE ──────────────────────────────
"""def parse_line(line):
    Expected Arduino serial format:
    SENSOR_TYPE:VALUE
    Examples:
      TEMP:28.5
      HUM:65.2
      SOIL:45.0
      PH:6.8
      LIGHT:3200
    line = line.strip()
    if not line or ':' not in line:
        return None, None

    parts = line.split(':', 1)
    if len(parts) != 2:
        return None, None

    sensor_code = parts[0].upper()
    try:
        value = float(parts[1])
    except ValueError:
        return None, None

    # Map sensor codes to types
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

    sensor_type = sensor_map.get(sensor_code)
    return sensor_type, value
"""

def parse_line(line):
    """
    Handles multiple Arduino output formats:

    Our format:    TEMP:28.5
    Common format: Temperature: 28.5
    Your Arduino:  intencity : 64 / water sensor value :266
    """
    line = line.strip()
    if not line:
        return None, None

    # Remove common units and clean up
    line_clean = line.replace(' cm', '').replace(' °C', '')
    line_clean = line_clean.replace(' %', '').replace(' lux', '')
    line_clean = line_clean.replace(' ppm', '').replace(' pH', '')

    # Split by colon
    if ':' not in line_clean:
        return None, None

    # Get the last colon (handles "water sensor value :266")
    parts = line_clean.rsplit(':', 1)
    if len(parts) != 2:
        return None, None

    label = parts[0].strip().lower()
    try:
        value = float(parts[1].strip())
    except ValueError:
        return None, None

    # Map any label variation to sensor type
    sensor_map = {
        # Temperature
        'temp': 'temperature', 'temperature': 'temperature',
        'tmp': 'temperature', 't': 'temperature',

        # Humidity
        'hum': 'humidity', 'humidity': 'humidity',
        'h': 'humidity', 'rh': 'humidity',

        # Soil moisture
        'soil': 'soil_moisture', 'soil_moisture': 'soil_moisture',
        'moisture': 'soil_moisture', 'water sensor value': 'soil_moisture',
        'water': 'soil_moisture', 'sm': 'soil_moisture',

        # Soil pH
        'ph': 'soil_ph', 'soil_ph': 'soil_ph',
        'soil ph': 'soil_ph',

        # Light
        'light': 'light', 'lux': 'light',
        'intencity': 'light', 'intensity': 'light',
        'light intensity': 'light', 'ldr': 'light',
        'brightness': 'light',

        # CO2
        'co2': 'co2', 'carbon': 'co2',

        # Wind
        'wind': 'wind', 'wind speed': 'wind',

        # Rainfall
        'rain': 'rainfall', 'rainfall': 'rainfall',

        # Distance (ultrasonic sensor)
        'distance': 'distance', 'dist': 'distance',
        'e': 'distance',
    }

    sensor_type = sensor_map.get(label)
    return sensor_type, value



# ── SIMULATE ARDUINO (for testing without hardware) ──
def simulate_arduino():
    """
    Simulates Arduino output for testing.
    Sends random realistic sensor values every 5 seconds.
    """
    import random

    log("SIMULATION MODE — No Arduino connected", YELLOW)
    log("Sending simulated sensor data every 5 seconds...", YELLOW)
    log("Press Ctrl+C to stop\n", YELLOW)

    while True:
        # Generate realistic values
        simulated_readings = [
            ("temperature",   round(random.uniform(20, 35), 1)),
            ("humidity",      round(random.uniform(40, 85), 1)),
            ("soil_moisture", round(random.uniform(30, 80), 1)),
            ("soil_ph",       round(random.uniform(5.5, 7.5), 2)),
            ("light",         round(random.uniform(1000, 8000), 0)),
        ]

        for sensor_type, value in simulated_readings:
            api_key = SENSOR_API_KEYS.get(sensor_type)
            if not api_key or api_key.startswith("YOUR_"):
                log(
                    f"No API key for {sensor_type} — skipping",
                    YELLOW
                )
                continue

            log(f"Simulating {sensor_type}: {value}", BLUE)
            send_reading(api_key, value)
            time.sleep(0.5)

        log("Waiting 5 seconds...\n", YELLOW)
        time.sleep(5)

# ── MAIN LOOP ───────────────────────────────────────
def main():
    log("FCHAN Arduino USB Reader", GREEN)
    log("=" * 40, GREEN)

    # Check for simulation mode
    if '--simulate' in sys.argv or '-s' in sys.argv:
        simulate_arduino()
        return

    # Find Arduino port
    port = None
    if len(sys.argv) > 1 and sys.argv[1] not in ['--simulate', '-s']:
        port = sys.argv[1]
        log(f"Using specified port: {port}", BLUE)
    else:
        log("Searching for Arduino...", BLUE)
        port = find_arduino_port()
        if not port:
            log("Arduino not found automatically.", YELLOW)
            available = list_ports()
            if available:
                log("Please specify port as argument:", YELLOW)
                log("  python3 reader.py /dev/ttyUSB0", YELLOW)
            else:
                log("No ports available. Use --simulate for testing:", YELLOW)
                log("  python3 reader.py --simulate", YELLOW)
            return

    log(f"Connecting to Arduino on {port}...", BLUE)

    while True:
        try:
            with serial.Serial(port, BAUD_RATE,
                               timeout=READ_TIMEOUT) as ser:
                log(f"Connected to {port}", GREEN)
                log("Listening for sensor data...", GREEN)
                log("Expected format: SENSOR_TYPE:VALUE", BLUE)
                log("Example: TEMP:28.5 or SOIL:65.0\n", BLUE)

                while True:
                    if ser.in_waiting > 0:
                        raw = ser.readline()
                        try:
                            line = raw.decode('utf-8').strip()
                        except UnicodeDecodeError:
                            continue

                        if not line:
                            continue

                        log(f"Received: {line}", BLUE)

                        sensor_type, value = parse_line(line)

                        if sensor_type is None:
                            log(
                                f"Unknown format: {line}",
                                YELLOW
                            )
                            continue

                        api_key = SENSOR_API_KEYS.get(sensor_type)
                        if not api_key or api_key.startswith("YOUR_"):
                            log(
                                f"No API key configured "
                                f"for {sensor_type}",
                                YELLOW
                            )
                            continue

                        log(
                            f"{sensor_type}: {value}",
                            GREEN
                        )
                        send_reading(api_key, value)

        except serial.SerialException as e:
            log(f"Serial error: {e}", RED)
            log(f"Retrying in {RETRY_DELAY}s...", YELLOW)
            time.sleep(RETRY_DELAY)

        except KeyboardInterrupt:
            log("\nStopped by user", YELLOW)
            break

if __name__ == "__main__":
    main()
