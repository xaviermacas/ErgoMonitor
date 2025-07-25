# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a real-time data visualization web application for EMG, pitch angle, and fatigue monitoring. The project receives data via WiFi from an ESP32 microcontroller and displays three separate real-time visualizations.

## Key Requirements
- **Real-time EMG visualization**: 2000 Hz sampling rate with 20-450 Hz bandpass filter
- **Pitch angle animation**: 50 Hz data with 9 PNG images (Angulo0, Angulo10, Angulo20...Angulo90, except Angulo40)
- **Fatigue percentage bar**: 0-100% using MDF formula with 5-second analysis window
- **No titles or labels** on graphics (for clean WebViewer integration)
- **Separate data processing** for each visualization to avoid conflicts
- **WiFi ESP32 integration** for real-time data streaming
- **GitHub Pages deployment** ready

## Technical Stack
- Vanilla JavaScript for real-time data processing
- Chart.js or similar for EMG visualization
- Canvas API for smooth animations
- WebSocket or HTTP polling for ESP32 communication
- Responsive design for mobile WebViewer integration

## Data Processing Notes
- EMG: Implement digital bandpass filter 20-450 Hz
- Fatigue: Calculate MDF using 5-second sliding window
- Pitch: Map angle values to corresponding PNG images
- Each data stream processed independently to prevent timing conflicts
