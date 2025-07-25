// Main application entry point
class EMGMonitorApp {
    constructor() {
        this.emgProcessor = null;
        this.pitchAnimator = null;
        this.fatigueCalculator = null;
        this.dataReceiver = null;
        
        // Performance monitoring
        this.fatigueInterval = null;
        this.lastCleanup = 0;
        
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        console.log('Initializing EMG Monitor Application...');
        
        // Initialize all components
        this.initializeComponents();
        
        // Setup data flow
        this.setupDataFlow();
        
        // Setup keyboard shortcuts for testing
        this.setupKeyboardShortcuts();
        
        console.log('EMG Monitor Application initialized successfully');
    }

    initializeComponents() {
        try {
            // Initialize EMG processor
            this.emgProcessor = new EMGProcessor();
            console.log('EMG Processor initialized');
            
            // Initialize pitch animator
            this.pitchAnimator = new PitchAnimator();
            console.log('Pitch Animator initialized');
            
            // Initialize fatigue calculator
            this.fatigueCalculator = new FatigueCalculator();
            console.log('Fatigue Calculator initialized');
            
            // Initialize data receiver
            this.dataReceiver = new DataReceiver();
            console.log('Data Receiver initialized');
            
        } catch (error) {
            console.error('Error initializing components:', error);
        }
    }

    setupDataFlow() {
        // Set up EMG data processing chain
        this.dataReceiver.setEMGCallback((emgValue) => {
            // Process EMG data through filter
            this.emgProcessor.processEMGData(emgValue);
        });

        // Set up pitch data processing
        this.dataReceiver.setPitchCallback((pitchAngle) => {
            this.pitchAnimator.processAngleData(pitchAngle);
        });

        // Set up fatigue calculation timer (every 2 seconds instead of every EMG sample)
        // Clear any existing interval first to prevent duplicates
        if (this.fatigueInterval) {
            clearInterval(this.fatigueInterval);
        }
        
        this.fatigueInterval = setInterval(() => {
            const recentEMGData = this.emgProcessor.getRecentDataForMDF();
            if (recentEMGData.length >= this.emgProcessor.sampleRate * 2) { // 2 seconds of data (4000 samples)
                this.fatigueCalculator.processFatigueData(recentEMGData);
            }
            
            // Periodic memory cleanup
            this.cleanupMemory();
        }, 2000); // Calculate fatigue every 2 seconds
    }

    cleanupMemory() {
        // Force garbage collection hints every 30 seconds
        if (Date.now() - (this.lastCleanup || 0) > 30000) {
            this.lastCleanup = Date.now();
            
            // Clear unnecessary references
            if (typeof gc !== 'undefined') {
                gc(); // Force garbage collection if available
            }
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            switch (event.key.toLowerCase()) {
                case 's':
                    // Start simulation
                    event.preventDefault();
                    this.startSimulation();
                    break;
                case 'r':
                    // Reset all data
                    event.preventDefault();
                    this.resetAll();
                    break;
                case 'c':
                    // Connect to ESP32
                    event.preventDefault();
                    this.dataReceiver.connect();
                    break;
                case 'd':
                    // Disconnect from ESP32
                    event.preventDefault();
                    this.dataReceiver.disconnect();
                    break;
                case 'q':
                    // Calibrate ESP32
                    event.preventDefault();
                    this.dataReceiver.calibrateESP32();
                    break;
                case 'e':
                    // Reset ESP32
                    event.preventDefault();
                    this.dataReceiver.resetESP32();
                    break;
                case 'h':
                    // Show help
                    event.preventDefault();
                    this.showHelp();
                    break;
            }
        });
    }

    startSimulation() {
        console.log('Starting data simulation...');
        this.dataReceiver.startSimulation();
        
        // Show notification
        this.showNotification('Simulation started. Press R to reset, D to disconnect.', 'info');
    }

    resetAll() {
        console.log('Resetting all components...');
        
        // Reset all components
        if (this.emgProcessor) {
            this.emgProcessor.dataBuffer = [];
            this.emgProcessor.filteredBuffer = [];
            this.emgProcessor.updateChart();
        }
        
        if (this.pitchAnimator) {
            this.pitchAnimator.reset();
        }
        
        if (this.fatigueCalculator) {
            this.fatigueCalculator.reset();
        }
        
        this.showNotification('All data reset successfully', 'success');
    }

    showHelp() {
        const helpText = `
EMG Monitor - Keyboard Shortcuts:
• S - Start simulation
• C - Connect to ESP32
• D - Disconnect
• Q - Calibrate ESP32
• E - Reset ESP32
• R - Reset all local data
• H - Show this help

Connection:
1. Enter ESP32 IP address (default: 192.168.68.100)
2. Click Connect or press C
3. Calibrate ESP32 by pressing Q (keep muscle relaxed)
4. Real-time data will flow automatically

ESP32 Configuration:
- EMG Sample Rate: 2000 Hz
- Angle Sample Rate: 200 Hz  
- WebSocket: port 8000, path /ws/esp32

For simulation mode, press S to start with test data.
        `;
        
        alert(helpText);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50px;
            right: 10px;
            background: ${type === 'success' ? '#00ff41' : type === 'error' ? '#ff4500' : '#0080ff'};
            color: black;
            padding: 10px 15px;
            border-radius: 5px;
            font-weight: bold;
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-in reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Get current application state
    getApplicationState() {
        return {
            isConnected: this.dataReceiver?.isConnected || false,
            emgStats: {
                bufferSize: this.emgProcessor?.dataBuffer.length || 0,
                filteredBufferSize: this.emgProcessor?.filteredBuffer.length || 0,
                rms: this.emgProcessor?.getRMS() || 0
            },
            pitchStats: {
                currentAngle: this.pitchAnimator?.getCurrentAngle() || 0
            },
            fatigueStats: this.fatigueCalculator?.getMetrics() || {}
        };
    }

    // Performance monitoring
    startPerformanceMonitoring() {
        setInterval(() => {
            const state = this.getApplicationState();
            console.log('App State:', state);
            
            // Check for performance issues
            if (state.emgStats.bufferSize > 10000) {
                console.warn('EMG buffer getting large, consider optimization');
            }
        }, 10000); // Every 10 seconds
    }
}

// Global variables for external access
let emgMonitorApp;
let dataReceiver; // For button onclick handlers

// Initialize application when page loads
document.addEventListener('DOMContentLoaded', () => {
    emgMonitorApp = new EMGMonitorApp();
    dataReceiver = emgMonitorApp.dataReceiver; // For HTML button access
    
    // Start performance monitoring in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        emgMonitorApp.startPerformanceMonitoring();
    }
    
    // Show initial help
    setTimeout(() => {
        emgMonitorApp.showNotification('EMG Monitor loaded. Press H for help, S for simulation.', 'info');
    }, 1000);
});

// Export for debugging
window.emgMonitorApp = emgMonitorApp;
