#!/usr/bin/env python3
"""
WebSocket Server for EMG Monitor
Handles WebSocket connections from ESP32 and serves static files
"""

import asyncio
import websockets
import json
import logging
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
import os
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EMGWebSocketServer:
    def __init__(self, host='0.0.0.0', websocket_port=8000, http_port=8080):
        self.host = host
        self.websocket_port = websocket_port
        self.http_port = http_port
        self.connected_clients = set()
        self.esp32_client = None
        
    async def handle_websocket(self, websocket, path=None):
        """Handle WebSocket connections"""
        client_ip = websocket.remote_address[0]
        logger.info(f"New WebSocket connection from {client_ip}")
        
        # Register client
        self.connected_clients.add(websocket)
        
        try:
            # Wait for first message to determine client type
            async for message in websocket:
                try:
                    data = json.loads(message)
                    
                    # Check if this looks like ESP32 data
                    if ('emg' in data or 'angle' in data or 'pitch' in data or 
                        data.get('sensor_id') == 'esp32_001' or 
                        data.get('type') in ['system_info', 'status_update']):
                        
                        if self.esp32_client != websocket:
                            logger.info(f"ESP32 connected from {client_ip}")
                            self.esp32_client = websocket
                            
                            # Send welcome message to ESP32
                            welcome_msg = {
                                "type": "welcome",
                                "message": "Connected to EMG Monitor Server",
                                "timestamp": datetime.now().isoformat()
                            }
                            await websocket.send(json.dumps(welcome_msg))
                        
                        # Process ESP32 data and forward to clients
                        await self.process_esp32_data(data, message)
                        
                    else:
                        # This is a web client command
                        if websocket != self.esp32_client:
                            logger.info(f"Web client command from {client_ip}: {data.get('command', 'unknown')}")
                            await self.process_client_command(data)
                        
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from {client_ip}: {message}")
                except Exception as e:
                    logger.error(f"Error processing message from {client_ip}: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket connection closed for {client_ip}")
        except Exception as e:
            logger.error(f"WebSocket error for {client_ip}: {e}")
        finally:
            # Unregister client
            self.connected_clients.discard(websocket)
            if websocket == self.esp32_client:
                self.esp32_client = None
                logger.info("ESP32 disconnected")

    async def process_esp32_data(self, data, raw_message):
        """Process data from ESP32 and forward to web clients"""
        # Log different types of messages
        if data.get('type') == 'system_info':
            logger.info(f"ESP32 System Info: {data.get('device_id', 'Unknown')}")
        elif data.get('type') == 'status_update':
            battery = data.get('battery_level', 'N/A')
            rssi = data.get('wifi_rssi', 'N/A')
            logger.info(f"ESP32 Status - Battery: {battery}%, RSSI: {rssi}dBm")
        
        # Forward data to all web clients
        await self.broadcast_to_clients(raw_message)

    async def process_client_command(self, data):
        """Process commands from web clients"""
        command = data.get('command')
        
        if command in ['calibrate', 'reset'] and self.esp32_client:
            # Forward command to ESP32
            await self.esp32_client.send(json.dumps(data))
            logger.info(f"Command '{command}' forwarded to ESP32")
        else:
            logger.warning(f"ESP32 not connected or unknown command: {command}")

    async def broadcast_to_clients(self, message):
        """Broadcast message to all connected web clients"""
        if not self.connected_clients:
            return
            
        # Send to all clients except ESP32
        web_clients = [client for client in self.connected_clients if client != self.esp32_client]
        
        if web_clients:
            # Send to all web clients, ignore errors
            results = await asyncio.gather(
                *[client.send(message) for client in web_clients],
                return_exceptions=True
            )
            
            # Log any send errors
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.warning(f"Failed to send to web client: {result}")

    def start_http_server(self):
        """Start HTTP server for static files"""
        class RequestHandler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=os.getcwd(), **kwargs)
                
            def log_message(self, format, *args):
                # Custom logging for HTTP requests
                logger.info(f"HTTP {self.address_string()} - {format % args}")

        try:
            httpd = HTTPServer(('localhost', 8001), RequestHandler)  # Changed port to avoid conflict
            logger.info(f"HTTP server starting on localhost:8001")
            httpd.serve_forever()
        except Exception as e:
            logger.error(f"HTTP server error: {e}")

    async def start_websocket_server(self):
        """Start WebSocket server"""
        try:
            logger.info(f"WebSocket server starting on {self.host}:{self.websocket_port}")
            
            # Simplified: Handle all connections as ESP32 initially
            async with websockets.serve(self.handle_websocket, self.host, self.websocket_port):
                logger.info("WebSocket server is running...")
                await asyncio.Future()  # Run forever
        except Exception as e:
            logger.error(f"WebSocket server error: {e}")

    def run(self):
        """Start both HTTP and WebSocket servers"""
        logger.info("Starting EMG Monitor WebSocket Server...")
        
        # Start HTTP server in a separate thread
        http_thread = threading.Thread(target=self.start_http_server, daemon=True)
        http_thread.start()
        
        # Start WebSocket server
        try:
            asyncio.run(self.start_websocket_server())
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
        except Exception as e:
            logger.error(f"Server error: {e}")

if __name__ == "__main__":
    # Default configuration
    HOST = '0.0.0.0'  # Listen on all interfaces
    WEBSOCKET_PORT = 8000  # WebSocket port for ESP32
    HTTP_PORT = 8080  # HTTP port for web interface
    
    print(f"""
=== EMG Monitor WebSocket Server ===
WebSocket Server: ws://{HOST}:{WEBSOCKET_PORT}
HTTP Server: http://{HOST}:{HTTP_PORT}

ESP32 should connect to: ws://YOUR_PC_IP:{WEBSOCKET_PORT}/ws/esp32
Web interface: http://YOUR_PC_IP:{HTTP_PORT}

Press Ctrl+C to stop
=====================================
    """)
    
    server = EMGWebSocketServer(HOST, WEBSOCKET_PORT, HTTP_PORT)
    server.run()
