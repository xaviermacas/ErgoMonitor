class EMGProcessor {
    constructor() {
        this.sampleRate = 2000; // 2000 Hz
        this.lowCutoff = 20;    // 20 Hz
        this.highCutoff = 450;  // 450 Hz
        this.bufferSize = 4000; // 2 seconds of data
        this.dataBuffer = [];
        this.filteredBuffer = [];
        this.chart = null;
        this.maxDataPoints = 500; // Show last 0.25 seconds on chart (reduced from 2000)
        
        // Continuous scrolling variables
        this.timeIndex = 0; // Continuous time counter for smooth scrolling
        
        // Auto-scaling variables
        this.currentMin = -50;
        this.currentMax = 50;
        this.autoScaleBuffer = [];
        this.autoScaleBufferSize = 50; // Ultra-small buffer for instant response
        this.scaleMargin = 0.2; // 20% margin for better visualization
        this.scaleUpdateCounter = 0;
        this.scaleUpdateInterval = 1; // Update scale every single sample for zero delay
        
        this.initChart();
        this.initFilters();
    }

    initChart() {
        const ctx = document.getElementById('emgChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        display: false,
                        min: 0,
                        max: 250 // Window size - will be updated dynamically
                    },
                    y: {
                        display: false,
                        min: -100,
                        max: 100
                    }
                },
                animation: false, // Completely disable all animations
                transitions: {
                    active: {
                        animation: {
                            duration: 0
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: null // Disable all interactions for performance
                },
                elements: {
                    line: {
                        tension: 0 // No smoothing for instant response
                    }
                }
            }
        });
    }

    initFilters() {
        // Butterworth bandpass filter coefficients for 20-450 Hz at 2000 Hz sampling rate
        // These are approximate coefficients - in production, use proper filter design
        this.highpassFilter = new IIRFilter(this.sampleRate, this.lowCutoff, 'highpass');
        this.lowpassFilter = new IIRFilter(this.sampleRate, this.highCutoff, 'lowpass');
    }

    processEMGData(rawData) {
        // Add to buffer
        this.dataBuffer.push(rawData);
        
        // Keep buffer size strictly controlled
        if (this.dataBuffer.length > this.bufferSize) {
            this.dataBuffer.splice(0, this.dataBuffer.length - this.bufferSize); // More aggressive cleanup
        }

        // Apply bandpass filter (highpass then lowpass)
        let filtered = this.highpassFilter.process(rawData);
        filtered = this.lowpassFilter.process(filtered);
        
        this.filteredBuffer.push(filtered);
        
        // Keep filtered buffer size strictly controlled
        if (this.filteredBuffer.length > this.bufferSize) {
            this.filteredBuffer.splice(0, this.filteredBuffer.length - this.bufferSize); // More aggressive cleanup
        }

        // Add to auto-scale buffer for dynamic scaling
        this.autoScaleBuffer.push(filtered);
        if (this.autoScaleBuffer.length > this.autoScaleBufferSize) {
            this.autoScaleBuffer.splice(0, this.autoScaleBuffer.length - this.autoScaleBufferSize); // More aggressive cleanup
        }

        // Update chart with last 1 second of data and auto-scaling
        this.updateChart();
        
        return filtered;
    }

    updateChart() {
        if (!this.chart) return;

        // Increment continuous time index
        this.timeIndex++;

        // Get recent data for display
        const availableData = this.filteredBuffer.length;
        const displayData = availableData < this.maxDataPoints 
            ? this.filteredBuffer.slice() // Show all available data initially
            : this.filteredBuffer.slice(-this.maxDataPoints); // Show last 0.25 seconds when buffer is full
        
        // Create continuous scrolling labels
        const startTime = Math.max(0, this.timeIndex - displayData.length + 1);
        const labels = displayData.map((_, index) => startTime + index);

        // Update X-axis for continuous scrolling
        if (displayData.length >= this.maxDataPoints) {
            // Continuous scroll mode - window moves with data
            this.chart.options.scales.x.min = this.timeIndex - this.maxDataPoints + 1;
            this.chart.options.scales.x.max = this.timeIndex;
        } else {
            // Initial fill mode - fixed window
            this.chart.options.scales.x.min = 0;
            this.chart.options.scales.x.max = this.maxDataPoints;
        }

        // Update scale counter
        this.scaleUpdateCounter++;

        // Calculate dynamic scaling (start immediately with any data)
        if (this.autoScaleBuffer.length > 5 && this.scaleUpdateCounter >= this.scaleUpdateInterval) {
            this.scaleUpdateCounter = 0; // Reset counter
            
            const recentData = this.autoScaleBuffer;
            const dataMin = Math.min(...recentData);
            const dataMax = Math.max(...recentData);
            
            // Add margin for better visualization
            const range = Math.max(dataMax - dataMin, 5); // Minimum range of 5 (reduced)
            const margin = range * this.scaleMargin;
            
            // Calculate target scales
            let targetMin = dataMin - margin;
            let targetMax = dataMax + margin;
            
            // Ensure reasonable minimum range for visibility
            const minRange = 10; // Reduced minimum range
            if (targetMax - targetMin < minRange) {
                const center = (targetMax + targetMin) / 2;
                targetMin = center - minRange / 2;
                targetMax = center + minRange / 2;
            }
            
            // Ultra-aggressive adaptation for real-time response
            const adaptationSpeed = 0.4; // 40% adaptation rate for instant response
            
            this.currentMin = this.currentMin * (1 - adaptationSpeed) + targetMin * adaptationSpeed;
            this.currentMax = this.currentMax * (1 - adaptationSpeed) + targetMax * adaptationSpeed;
            
            // Update chart scales immediately
            this.chart.options.scales.y.min = Math.round(this.currentMin * 10) / 10;
            this.chart.options.scales.y.max = Math.round(this.currentMax * 10) / 10;
        }

        // Create data points with continuous time coordinates
        const dataPoints = displayData.map((value, index) => ({
            x: startTime + index,
            y: value
        }));

        // Update chart data with continuous coordinates
        this.chart.data.datasets[0].data = dataPoints;
        
        // Immediate update with no delay
        this.chart.update('none');
        
        // More frequent memory cleanup for smaller windows
        if (this.scaleUpdateCounter % 500 === 0) {
            this.cleanupMemory();
        }
    }

    cleanupMemory() {
        // Force garbage collection hints
        if (this.chart && this.chart.data) {
            // Clear old references without affecting the dataset structure
            if (this.chart.data.datasets[0].data.length > this.maxDataPoints * 2) {
                // Keep only recent data if too much accumulates
                this.chart.data.datasets[0].data = this.chart.data.datasets[0].data.slice(-this.maxDataPoints);
            }
        }
    }

    getRMS(windowSize = 100) {
        if (this.filteredBuffer.length < windowSize) return 0;
        
        const recentData = this.filteredBuffer.slice(-windowSize);
        const sumSquares = recentData.reduce((sum, val) => sum + val * val, 0);
        return Math.sqrt(sumSquares / windowSize);
    }

    // Get data for MDF calculation (last 2 seconds)
    getRecentDataForMDF() {
        const twoSecondsOfSamples = this.sampleRate * 2;
        return this.filteredBuffer.slice(-twoSecondsOfSamples);
    }
}

// Simple IIR Filter implementation
class IIRFilter {
    constructor(sampleRate, cutoffFreq, type) {
        this.sampleRate = sampleRate;
        this.cutoffFreq = cutoffFreq;
        this.type = type;
        
        // Calculate filter coefficients (simplified first-order filter)
        const omega = 2 * Math.PI * cutoffFreq / sampleRate;
        const alpha = Math.sin(omega) / (2 * 0.707); // Q = 0.707 for Butterworth
        
        if (type === 'highpass') {
            this.b0 = (1 + Math.cos(omega)) / 2;
            this.b1 = -(1 + Math.cos(omega));
            this.b2 = (1 + Math.cos(omega)) / 2;
        } else { // lowpass
            this.b0 = (1 - Math.cos(omega)) / 2;
            this.b1 = 1 - Math.cos(omega);
            this.b2 = (1 - Math.cos(omega)) / 2;
        }
        
        this.a0 = 1 + alpha;
        this.a1 = -2 * Math.cos(omega);
        this.a2 = 1 - alpha;
        
        // Normalize coefficients
        this.b0 /= this.a0;
        this.b1 /= this.a0;
        this.b2 /= this.a0;
        this.a1 /= this.a0;
        this.a2 /= this.a0;
        
        // Initialize delay elements
        this.x1 = 0;
        this.x2 = 0;
        this.y1 = 0;
        this.y2 = 0;
    }

    process(input) {
        const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2 
                      - this.a1 * this.y1 - this.a2 * this.y2;
        
        // Update delay elements
        this.x2 = this.x1;
        this.x1 = input;
        this.y2 = this.y1;
        this.y1 = output;
        
        return output;
    }
}

// Export for use in main.js
window.EMGProcessor = EMGProcessor;
