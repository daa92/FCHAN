/*
 * FCHAN — ESP32 WiFi Sensor Node
 * Reads sensors and sends data to FCHAN API over WiFi
 *
 * Hardware:
 *   - ESP32 development board
 *   - DHT22 (temperature + humidity)
 *   - Soil moisture sensor (analog)
 *   - LDR/BH1750 (light sensor)
 *   - pH sensor module (analog)
 *
 * Libraries needed (install via Arduino Library Manager):
 *   - ArduinoJson
 *   - DHT sensor library by Adafruit
 *   - HTTPClient (built-in for ESP32)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ── CONFIGURATION ──────────────────────────────────

// WiFi credentials
// Replace with your actual WiFi network name and password
const char* WIFI_SSID     = "FAMILLE_WOYANG";
const char* WIFI_PASSWORD = "6881wdf";

// FCHAN API
// Replace with your computer's local IP address
//const char* FCHAN_API_URL =
//  "http://192.168.100.40:3000/api/sensors/readings/ingest";
const char* FCHAN_API_URL = "https://fchan.onrender.com/api/sensors/readings/ingest";

// Sensor API keys — get these from FCHAN dashboard
// Go to: Zone → Add Sensor → copy the API key shown
const char* API_KEY_TEMPERATURE   = "YOUR_TEMPERATURE_API_KEY";
const char* API_KEY_HUMIDITY      = "YOUR_HUMIDITY_API_KEY";
const char* API_KEY_SOIL_MOISTURE = "YOUR_SOIL_MOISTURE_API_KEY";
const char* API_KEY_LIGHT         = "YOUR_LIGHT_API_KEY";
const char* API_KEY_SOIL_PH       = "YOUR_SOIL_PH_API_KEY";

// Pin definitions
#define DHT_PIN         4     // DHT22 data pin
#define DHT_TYPE        DHT22
#define SOIL_MOISTURE_PIN 34  // Analog pin for soil moisture
#define LIGHT_PIN         35  // Analog pin for LDR
#define PH_PIN            32  // Analog pin for pH sensor

// Reading interval (milliseconds)
// 30000 = every 30 seconds
#define READ_INTERVAL 30000

// ── GLOBALS ────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastReadTime = 0;

// ── SETUP ──────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  Serial.println("\nFCHAN Sensor Node Starting...");

  // Initialize DHT sensor
  dht.begin();

  // Connect to WiFi
  connectWiFi();
}

// ── CONNECT TO WIFI ────────────────────────────────
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed!");
    Serial.println("Check SSID and password.");
  }
}

// ── SEND READING TO FCHAN ──────────────────────────
bool sendReading(const char* apiKey, float value) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
    return false;
  }

  HTTPClient http;
  http.begin(FCHAN_API_URL);
  http.addHeader("Content-Type", "application/json");

  // Build JSON body
  StaticJsonDocument<200> doc;
  doc["api_key"] = apiKey;
  doc["value"]   = value;

  String body;
  serializeJson(doc, body);

  Serial.print("Sending: ");
  Serial.println(body);

  int responseCode = http.POST(body);

  if (responseCode > 0) {
    String response = http.getString();
    Serial.print("Response: ");
    Serial.println(response);

    if (responseCode == 201) {
      Serial.println("Reading sent successfully!");
      http.end();
      return true;
    }
  } else {
    Serial.print("HTTP error: ");
    Serial.println(responseCode);
  }

  http.end();
  return false;
}

// ── READ SOIL MOISTURE ─────────────────────────────
float readSoilMoisture() {
  // Read analog value (0-4095 on ESP32)
  int raw = analogRead(SOIL_MOISTURE_PIN);
  // Convert to percentage (0% = dry, 100% = wet)
  // Calibrate these values for your specific sensor
  int dry = 3500;  // value when completely dry
  int wet = 1500;  // value when completely wet
  float percentage = map(raw, dry, wet, 0, 100);
  percentage = constrain(percentage, 0, 100);
  return percentage;
}

// ── READ LIGHT ─────────────────────────────────────
float readLight() {
  // Read LDR analog value
  int raw = analogRead(LIGHT_PIN);
  // Convert to lux (approximate)
  // Adjust formula for your specific LDR
  float voltage = raw * (3.3 / 4095.0);
  float resistance = (3.3 - voltage) / voltage * 10000;
  float lux = 500 / (resistance / 1000);
  return constrain(lux, 0, 100000);
}

// ── READ SOIL pH ────────────────────────────────────
float readSoilPH() {
  // Read pH sensor analog value
  // This requires calibration with pH buffer solutions
  int raw = analogRead(PH_PIN);
  float voltage = raw * (3.3 / 4095.0);
  // Linear calibration formula
  // Adjust these values after calibrating with pH 4 and pH 7 buffers
  float ph = 7.0 + ((2.5 - voltage) * 3.5);
  return constrain(ph, 0, 14);
}

// ── MAIN LOOP ──────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // Read and send every READ_INTERVAL milliseconds
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;

    Serial.println("\nReading sensors...");

    // ── Read Temperature ──────────────────────────
    float temperature = dht.readTemperature();
    if (!isnan(temperature)) {
      Serial.print("Temperature: ");
      Serial.print(temperature);
      Serial.println(" °C");
      sendReading(API_KEY_TEMPERATURE, temperature);
      delay(500);
    } else {
      Serial.println("Failed to read temperature");
    }

    // ── Read Humidity ─────────────────────────────
    float humidity = dht.readHumidity();
    if (!isnan(humidity)) {
      Serial.print("Humidity: ");
      Serial.print(humidity);
      Serial.println(" %");
      sendReading(API_KEY_HUMIDITY, humidity);
      delay(500);
    } else {
      Serial.println("Failed to read humidity");
    }

    // ── Read Soil Moisture ────────────────────────
    float soilMoisture = readSoilMoisture();
    Serial.print("Soil Moisture: ");
    Serial.print(soilMoisture);
    Serial.println(" %");
    sendReading(API_KEY_SOIL_MOISTURE, soilMoisture);
    delay(500);

    // ── Read Light ────────────────────────────────
    float light = readLight();
    Serial.print("Light: ");
    Serial.print(light);
    Serial.println(" lux");
    sendReading(API_KEY_LIGHT, light);
    delay(500);

    // ── Read Soil pH ──────────────────────────────
    float ph = readSoilPH();
    Serial.print("⚗️  Soil pH: ");
    Serial.println(ph);
    sendReading(API_KEY_SOIL_PH, ph);

    Serial.println("All readings sent!");
    Serial.print("Next reading in ");
    Serial.print(READ_INTERVAL / 1000);
    Serial.println(" seconds...");
  }

  // Reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost. Reconnecting...");
    connectWiFi();
  }
}
