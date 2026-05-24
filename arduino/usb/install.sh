#!/bin/bash
# FCHAN Arduino Auto-Start Installer
# Run once: bash install.sh
# After this, plug in Arduino and data flows automatically

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}  FCHAN Arduino Auto-Start Installer ${NC}"
echo -e "${GREEN}=====================================${NC}"

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
READER="$SCRIPT_DIR/reader.py"
USER_NAME=$(whoami)

echo -e "\n${YELLOW}Step 1 — Installing Python dependencies...${NC}"
pip3 install pyserial requests --break-system-packages --quiet
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo -e "\n${YELLOW}Step 2 — Adding $USER_NAME to dialout group...${NC}"
sudo usermod -a -G dialout "$USER_NAME"
echo -e "${GREEN}✓ Permission granted${NC}"

echo -e "\n${YELLOW}Step 3 — Creating systemd service...${NC}"

sudo tee /etc/systemd/system/fchan-arduino.service > /dev/null << EOF
[Unit]
Description=FCHAN Arduino Sensor Reader
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/bin/python3 $READER
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ Service created${NC}"

echo -e "\n${YELLOW}Step 4 — Enabling auto-start...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable fchan-arduino
sudo systemctl start fchan-arduino
echo -e "${GREEN}✓ Service enabled and started${NC}"

echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}  Installation complete!              ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "\nFCHAN will now read your Arduino automatically."
echo -e "Plug in your Arduino and data flows to FCHAN.\n"
echo -e "Useful commands:"
echo -e "  ${YELLOW}sudo systemctl status fchan-arduino${NC}   — check if running"
echo -e "  ${YELLOW}sudo systemctl stop fchan-arduino${NC}     — stop it"
echo -e "  ${YELLOW}sudo systemctl restart fchan-arduino${NC}  — restart it"
echo -e "  ${YELLOW}journalctl -u fchan-arduino -f${NC}        — see live logs"
