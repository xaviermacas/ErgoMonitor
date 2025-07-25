class DataReceiver {
    constructor() {
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // 2 seconds
        
        // WebSocket connection for real-time data
        this.ws = null;
        this.esp32IP = null; // Will be set when connecting
        
        // Separate data queues for different frequencies
        this.emgQueue = [];
        this.pitchQueue = [];
        this.fatigueQueue = [];
        
        // Data processing intervals
        this.emgInterval = null;
        this.pitchInterval = null;
        this.fatigueInterval = null;
        
        // Callbacks for data processing
        this.onEMGData = null;
        this.onPitchData = null;
        this.onFatigueData = null;
        
        this.setupConnectionUI();
    }

    setupConnectionUI() {
        // Add connection UI to the page
        const connectionDiv = document.createElement('div');
        connectionDiv.id = 'connectionStatus';
        connectionDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
        `;
        connectionDiv.innerHTML = `
            <div>Status: <span id="status">Disconnected</span></div>
            <input type="text" id="esp32IP" placeholder="Server IP (localhost for local)" value="localhost" style="margin: 5px 0; padding: 3px;">
            <button id="connectBtn" onclick="dataReceiver.connect()">Connect</button>
            <button id="disconnectBtn" onclick="dataReceiver.disconnect()" style="display: none;">Disconnect</button>
            <button id="calibrateBtn" onclick="dataReceiver.calibrateESP32()" style="display: none; margin-left: 5px;">Calibrate</button>
        `;
        document.body.appendChild(connectionDiv);
    }

    connect(ip = null) {
        const ipInput = document.getElementById('esp32IP');
        this.esp32IP = ip || ipInput.value || 'localhost';
        
        if (!this.esp32IP) {
            alert('Please enter ESP32 IP address');
            return;
        }

        try {
            // Try WebSocket connection first
            this.connectWebSocket();
        } catch (error) {
            console.error('WebSocket connection failed, trying HTTP polling:', error);
            this.connectHTTP();
        }
    }

    connectWebSocket() {
        const wsUrl = `ws://${this.esp32IP}:8000`; // Connect directly to WebSocket server
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('Connected (WebSocket)');
            console.log('WebSocket connected to EMG Monitor Server');
        };
        
        this.ws.onmessage = (event) => {
            this.processIncomingData(event.data);
        };
        
        this.ws.onclose = () => {
            this.isConnected = false;
            this.updateConnectionStatus('Disconnected');
            this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.isConnected = false;
            this.updateConnectionStatus('Connection Error');
        };
    }

    connectHTTP() {
        // Fallback to HTTP polling if WebSocket fails
        this.isConnected = true;
        this.updateConnectionStatus('Connected (HTTP Polling)');
        
        // Poll for data at different rates
        this.startHTTPPolling();
    }

    startHTTPPolling() {
        // EMG data at 2000 Hz (every 0.5ms)
        this.emgInterval = setInterval(() => {
            this.fetchEMGData();
        }, 0.5);
        
        // Pitch data at 200 Hz (every 5ms) - Updated to match ESP32
        this.pitchInterval = setInterval(() => {
            this.fetchPitchData();
        }, 5);
        
        // Fatigue calculation every 1 second
        this.fatigueInterval = setInterval(() => {
            this.processFatigueData();
        }, 1000);
    }

    async fetchEMGData() {
        try {
            const response = await fetch(`http://${this.esp32IP}/emg`);
            const data = await response.json();
            if (data.emg !== undefined) {
                this.processEMGData(data.emg);
            }
        } catch (error) {
            console.error('Error fetching EMG data:', error);
        }
    }

    async fetchPitchData() {
        try {
            const response = await fetch(`http://${this.esp32IP}/pitch`);
            const data = await response.json();
            if (data.angle !== undefined) {
                this.processPitchData(data.angle);
            }
        } catch (error) {
            console.error('Error fetching pitch data:', error);
        }
    }

    processIncomingData(rawData) {
        try {
            const data = JSON.parse(rawData);
            
            // Handle different message types from ESP32
            if (data.type === 'system_info') {
                console.log('ESP32 System Info:', data);
                this.updateConnectionStatus(`Connected - ${data.device_id}`);
                return;
            }
            
            if (data.type === 'status_update') {
                console.log(`ESP32 Status - Battery: ${data.battery_level}%, WiFi RSSI: ${data.wifi_rssi}`);
                return;
            }
            
            if (data.type === 'calibration_result') {
                console.log('ESP32 Calibration Complete:', data);
                return;
            }
            
            // Handle EMG data
            if (data.emg !== undefined) {
                this.processEMGData(data.emg);
            }
            
            // Handle angle data (pitch from ESP32)
            if (data.angle !== undefined) {
                this.processPitchData(data.angle);
            }
            
            // Alternative: handle pitch data directly
            if (data.pitch !== undefined) {
                this.processPitchData(data.pitch);
            }
            
        } catch (error) {
            console.error('Error parsing incoming data:', error);
            console.log('Raw data:', rawData);
        }
    }

    processEMGData(emgValue) {
        if (this.onEMGData) {
            this.onEMGData(emgValue);
        }
    }

    processPitchData(pitchAngle) {
        if (this.onPitchData) {
            this.onPitchData(pitchAngle);
        }
    }

    processFatigueData() {
        // This will be called by the fatigue calculator when it has enough EMG data
        if (this.onFatigueData) {
            this.onFatigueData();
        }
    }

    disconnect() {
        this.isConnected = false;
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        // Clear polling intervals
        if (this.emgInterval) clearInterval(this.emgInterval);
        if (this.pitchInterval) clearInterval(this.pitchInterval);
        if (this.fatigueInterval) clearInterval(this.fatigueInterval);
        
        this.updateConnectionStatus('Disconnected');
        console.log('Disconnected from ESP32');
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.esp32IP) {
            this.reconnectAttempts++;
            this.updateConnectionStatus(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect(this.esp32IP);
            }, this.reconnectDelay);
        } else {
            this.updateConnectionStatus('Reconnection Failed');
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('status');
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        const calibrateBtn = document.getElementById('calibrateBtn');
        
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.style.color = this.isConnected ? '#00ff41' : '#ff4500';
        }
        
        if (connectBtn && disconnectBtn && calibrateBtn) {
            connectBtn.style.display = this.isConnected ? 'none' : 'inline';
            disconnectBtn.style.display = this.isConnected ? 'inline' : 'none';
            calibrateBtn.style.display = this.isConnected ? 'inline' : 'none';
        }
    }

    // ESP32 Control Methods
    calibrateESP32() {
        if (!this.isConnected || !this.ws) {
            alert('Not connected to ESP32');
            return;
        }
        
        const calibrationMsg = {
            command: "calibrate"
        };
        
        this.ws.send(JSON.stringify(calibrationMsg));
        console.log('Calibration command sent to ESP32');
        this.updateConnectionStatus('Calibrating...');
        
        setTimeout(() => {
            if (this.isConnected) {
                this.updateConnectionStatus('Connected');
            }
        }, 10000); // Reset status after 10 seconds
    }

    resetESP32() {
        if (!this.isConnected || !this.ws) {
            alert('Not connected to ESP32');
            return;
        }
        
        const resetMsg = {
            command: "reset"
        };
        
        this.ws.send(JSON.stringify(resetMsg));
        console.log('Reset command sent to ESP32');
    }

    // Set callback functions
    setEMGCallback(callback) {
        this.onEMGData = callback;
    }

    setPitchCallback(callback) {
        this.onPitchData = callback;
    }

    setFatigueCallback(callback) {
        this.onFatigueData = callback;
    }

    // Simulate data for testing (remove in production)
    startSimulation() {
        console.log('Starting data simulation...');
        this.updateConnectionStatus('Simulating Data');
        this.isConnected = true; // Set as connected for simulation
        
        // Simulate EMG data at 2000 Hz (every 0.5ms)
        setInterval(() => {
            // Simulate EMG signal with muscle activity patterns
            const time = Date.now() * 0.001;
            const baseSignal = Math.sin(time * 0.5) * 300; // Base frequency
            const muscleActivity = Math.sin(time * 2) * 150; // Muscle activity
            const noise = (Math.random() - 0.5) * 100; // Random noise
            const emgValue = baseSignal + muscleActivity + noise;
            this.processEMGData(emgValue);
        }, 0.5);
        
        // Simulate pitch data at 200 Hz (every 5ms) - Match ESP32 frequency
        setInterval(() => {
            // Simulate realistic pitch angle movement (0-90 degrees)
            const time = Date.now() * 0.001;
            const baseAngle = (Math.sin(time * 0.3) + 1) * 45; // 0-90 degree range
            const smoothNoise = Math.sin(time * 1.5) * 10; // Small variations
            const angle = Math.max(0, Math.min(90, baseAngle + smoothNoise));
            this.processPitchData(angle);
        }, 5); // 200 Hz
        
        // Simulate fatigue progression over time
        let fatigueStartTime = Date.now();
        setInterval(() => {
            const elapsedMinutes = (Date.now() - fatigueStartTime) / 60000;
            // Simulate gradual fatigue increase over time (0-40% over 10 minutes)
            const simulatedFatigue = Math.min(40, elapsedMinutes * 4);
            console.log(`Simulation: Simulated fatigue level: ${simulatedFatigue.toFixed(1)}%`);
        }, 5000); // Log every 5 seconds
    }
}

// Export for use in main.js
window.DataReceiver = DataReceiver;
