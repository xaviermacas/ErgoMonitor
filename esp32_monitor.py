#!/usr/bin/env python3
"""
ESP32 Data Logger - Monitor what the ESP32 is sending
"""

import asyncio
import websockets
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

async def monitor_esp32():
    """Monitor ESP32 WebSocket connection"""
    try:
        logger.info("Connecting to ESP32 WebSocket server...")
        async with websockets.connect("ws://localhost:8000") as websocket:
            logger.info("Connected! Monitoring ESP32 data...")
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
                    
                    if 'emg' in data:
                        print(f"[{timestamp}] EMG: {data['emg']:.2f} | Raw ADC: {data.get('raw_adc', 'N/A')} | Voltage: {data.get('voltage', 'N/A'):.3f}V")
                    
                    elif 'angle' in data or 'pitch' in data:
                        angle = data.get('angle', data.get('pitch', 0))
                        print(f"[{timestamp}] ANGLE: {angle:.1f}° | Pitch: {data.get('pitch', 'N/A')} | Roll: {data.get('roll', 'N/A')}")
                    
                    elif data.get('type') == 'system_info':
                        print(f"[{timestamp}] SYSTEM INFO:")
                        print(f"  Device: {data.get('device_id', 'Unknown')}")
                        print(f"  Firmware: {data.get('firmware_version', 'Unknown')}")
                        print(f"  EMG Rate: {data.get('emg_sample_rate', 'Unknown')} Hz")
                        print(f"  Angle Rate: {data.get('angle_sample_rate', 'Unknown')} Hz")
                        print(f"  IP: {data.get('ip_address', 'Unknown')}")
                    
                    elif data.get('type') == 'status_update':
                        print(f"[{timestamp}] STATUS: Battery: {data.get('battery_level', 'N/A')}% | RSSI: {data.get('wifi_rssi', 'N/A')}dBm | Heap: {data.get('free_heap', 'N/A')} bytes")
                    
                    elif data.get('type') == 'calibration_result':
                        print(f"[{timestamp}] CALIBRATION COMPLETE:")
                        print(f"  EMG Baseline: {data.get('emg_baseline', 'N/A'):.4f}V")
                        print(f"  Pitch Offset: {data.get('pitch_offset', 'N/A'):.2f}°")
                        print(f"  Calibrated: {data.get('calibrated', False)}")
                    
                    else:
                        print(f"[{timestamp}] OTHER: {data}")
                        
                except json.JSONDecodeError:
                    print(f"[{timestamp}] NON-JSON: {message}")
                except Exception as e:
                    print(f"[{timestamp}] ERROR: {e}")
                    
    except websockets.exceptions.ConnectionClosed:
        logger.error("Connection closed")
    except Exception as e:
        logger.error(f"Connection error: {e}")

async def send_calibrate_command():
    """Send calibration command to ESP32"""
    try:
        async with websockets.connect("ws://localhost:8000") as websocket:
            command = {"command": "calibrate"}
            await websocket.send(json.dumps(command))
            logger.info("Calibration command sent!")
            
            # Wait for response
            await asyncio.sleep(1)
            
    except Exception as e:
        logger.error(f"Failed to send calibration command: {e}")

if __name__ == "__main__":
    print("""
=== ESP32 Data Monitor ===
Monitoring ESP32 data stream...

Commands:
- Press Ctrl+C to stop
- To calibrate ESP32, run: python esp32_monitor.py calibrate

Waiting for data...
========================
    """)
    
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'calibrate':
        asyncio.run(send_calibrate_command())
    else:
        try:
            asyncio.run(monitor_esp32())
        except KeyboardInterrupt:
            print("\nMonitoring stopped.")
