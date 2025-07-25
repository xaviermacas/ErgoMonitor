class FatigueCalculator {
    constructor() {
        this.fatigueBar = document.getElementById('fatigueLevel');
        this.fatigueDisplay = document.getElementById('fatiguePercentage');
        this.initialMDF = null;
        this.initialRMS = null; // New: Initial RMS value
        this.currentMDF = 0;
        this.currentRMS = 0; // New: Current RMS value
        this.fatigueMDF = 0; // MDF-based fatigue percentage
        this.fatigueRMS = 0; // RMS-based fatigue percentage
        this.fatigueIndex = 0; // Combined fatigue index
        this.analysisWindow = 2; // Reduced from 3 to 2 seconds window for faster start
        this.sampleRate = 2000; // 2000 Hz
        this.windowSize = this.analysisWindow * this.sampleRate; // Now 4000 samples
        
        // For MDF calculation
        this.fftSize = 1024;
        this.hannWindow = this.generateHannWindow(this.fftSize);
        
        this.updateDisplay();
    }

    generateHannWindow(size) {
        const window = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
        }
        return window;
    }

    // Calculate RMS (Root Mean Square) from EMG data
    calculateRMS(emgData) {
        if (emgData.length === 0) return 0;
        
        let sumSquares = 0;
        for (let i = 0; i < emgData.length; i++) {
            sumSquares += emgData[i] * emgData[i];
        }
        
        return Math.sqrt(sumSquares / emgData.length);
    }

    // Calculate Median Frequency (MDF) from EMG data
    calculateMDF(emgData) {
        if (emgData.length < this.fftSize) {
            return 0;
        }

        // Use fewer overlapping windows for better performance
        const numWindows = Math.min(4, Math.floor((emgData.length - this.fftSize) / (this.fftSize / 2)) + 1);
        let totalMDF = 0;
        let validWindows = 0;

        for (let w = 0; w < numWindows; w++) {
            const startIdx = w * (this.fftSize / 2);
            const windowData = emgData.slice(startIdx, startIdx + this.fftSize);
            
            if (windowData.length === this.fftSize) {
                const mdf = this.calculateWindowMDF(windowData);
                if (mdf > 0 && mdf < 500) { // Reasonable range check
                    totalMDF += mdf;
                    validWindows++;
                }
            }
        }

        const avgMDF = validWindows > 0 ? totalMDF / validWindows : 0;
        console.log(`MDF: Average MDF from ${validWindows} windows = ${avgMDF.toFixed(2)} Hz`);
        return avgMDF;
    }

    calculateWindowMDF(windowData) {
        // Apply Hann window
        const windowed = new Float32Array(this.fftSize);
        for (let i = 0; i < this.fftSize; i++) {
            windowed[i] = windowData[i] * this.hannWindow[i];
        }

        // Calculate power spectral density using FFT
        const psd = this.calculatePSD(windowed);
        
        // Find median frequency
        return this.findMedianFrequency(psd);
    }

    calculatePSD(data) {
        // Simple FFT implementation for power spectral density
        const real = new Float32Array(data);
        const imag = new Float32Array(data.length);
        
        this.fft(real, imag);
        
        // Calculate power spectral density
        const psd = new Float32Array(data.length / 2);
        for (let i = 0; i < psd.length; i++) {
            psd[i] = real[i] * real[i] + imag[i] * imag[i];
        }
        
        return psd;
    }

    // Simple Cooley-Tukey FFT implementation
    fft(real, imag) {
        const n = real.length;
        if (n <= 1) return;

        // Bit reversal
        for (let i = 0; i < n; i++) {
            let j = 0;
            for (let k = 0; k < Math.log2(n); k++) {
                j = (j << 1) | ((i >> k) & 1);
            }
            if (j > i) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
        }

        // Cooley-Tukey FFT
        for (let size = 2; size <= n; size *= 2) {
            const halfsize = size / 2;
            const tablestep = n / size;
            for (let i = 0; i < n; i += size) {
                for (let j = i; j < i + halfsize; j++) {
                    const k = j + halfsize;
                    const tpre = real[k] * Math.cos(-2 * Math.PI * ((j - i) * tablestep) / n) -
                               imag[k] * Math.sin(-2 * Math.PI * ((j - i) * tablestep) / n);
                    const tpim = real[k] * Math.sin(-2 * Math.PI * ((j - i) * tablestep) / n) +
                               imag[k] * Math.cos(-2 * Math.PI * ((j - i) * tablestep) / n);
                    real[k] = real[j] - tpre;
                    imag[k] = imag[j] - tpim;
                    real[j] += tpre;
                    imag[j] += tpim;
                }
            }
        }
    }

    findMedianFrequency(psd) {
        // Calculate total power
        const totalPower = psd.reduce((sum, val) => sum + val, 0);
        if (totalPower === 0) return 0;

        // Find frequency where cumulative power reaches 50%
        let cumulativePower = 0;
        const targetPower = totalPower * 0.5;
        
        for (let i = 0; i < psd.length; i++) {
            cumulativePower += psd[i];
            if (cumulativePower >= targetPower) {
                // Convert bin to frequency (Hz)
                return (i * this.sampleRate) / (2 * psd.length);
            }
        }
        
        return 0;
    }

    // Process EMG data for fatigue calculation
    processFatigueData(emgData) {
        console.log(`Fatigue: Received ${emgData.length} EMG samples, need ${this.windowSize}`);
        
        if (emgData.length < this.windowSize) {
            console.log(`Fatigue: Not enough data yet (${emgData.length}/${this.windowSize})`);
            return this.fatigueIndex;
        }

        // Calculate current RMS
        this.currentRMS = this.calculateRMS(emgData);
        console.log(`Fatigue: Current RMS = ${this.currentRMS.toFixed(4)}`);
        
        // Set initial RMS if not set
        if (this.initialRMS === null && this.currentRMS > 0) {
            this.initialRMS = this.currentRMS;
            console.log(`Initial RMS set to: ${this.initialRMS.toFixed(4)}`);
        }

        // Calculate RMS-based fatigue percentage using the provided formula
        if (this.initialRMS && this.initialRMS > 0) {
            this.fatigueRMS = ((this.currentRMS - this.initialRMS) / this.initialRMS) * 100;
            // Limit RMS fatigue to reasonable range (0-200%)
            this.fatigueRMS = Math.max(0, Math.min(200, this.fatigueRMS));
            console.log(`Fatigue RMS calculated: ${this.fatigueRMS.toFixed(1)}%`);
        }

        // Calculate current MDF
        this.currentMDF = this.calculateMDF(emgData);
        console.log(`Fatigue: Current MDF = ${this.currentMDF.toFixed(2)} Hz`);
        
        // Set initial MDF if not set
        if (this.initialMDF === null && this.currentMDF > 0) {
            this.initialMDF = this.currentMDF;
            console.log(`Initial MDF set to: ${this.initialMDF.toFixed(2)} Hz`);
        }

        // Calculate MDF-based fatigue percentage
        if (this.initialMDF && this.initialMDF > 0) {
            this.fatigueMDF = Math.max(0, 
                Math.min(100, 
                    ((this.initialMDF - this.currentMDF) / this.initialMDF) * 100
                )
            );
            console.log(`Fatigue MDF calculated: ${this.fatigueMDF.toFixed(1)}%`);
        }

        // Calculate combined fatigue index: average of RMS and MDF
        if (this.fatigueRMS >= 0 && this.fatigueMDF >= 0) {
            this.fatigueIndex = (this.fatigueRMS + this.fatigueMDF) / 2;
            console.log(`Combined Fatigue Index: ${this.fatigueIndex.toFixed(1)}% (RMS: ${this.fatigueRMS.toFixed(1)}%, MDF: ${this.fatigueMDF.toFixed(1)}%)`);
        } else if (this.fatigueMDF >= 0) {
            // If RMS not ready, use only MDF
            this.fatigueIndex = this.fatigueMDF;
            console.log(`Using MDF only: ${this.fatigueIndex.toFixed(1)}%`);
        }

        // Ensure fatigue index stays within 0-100% range
        this.fatigueIndex = Math.max(0, Math.min(100, this.fatigueIndex));

        this.updateDisplay();
        return this.fatigueIndex;
    }

    updateDisplay() {
        // Update percentage bar
        this.fatigueBar.style.width = `${this.fatigueIndex}%`;
        
        // Update percentage text
        this.fatigueDisplay.textContent = `${Math.round(this.fatigueIndex)}%`;
        
        // Update bar color class based on fatigue level
        this.fatigueBar.className = 'fatigue-level';
        if (this.fatigueIndex < 30) {
            this.fatigueBar.classList.add('low');
            this.fatigueDisplay.style.color = '#00ff41';
            this.fatigueDisplay.style.textShadow = '0 0 10px #00ff41';
        } else if (this.fatigueIndex < 70) {
            this.fatigueBar.classList.add('medium');
            this.fatigueDisplay.style.color = '#ffff00';
            this.fatigueDisplay.style.textShadow = '0 0 10px #ffff00';
        } else {
            this.fatigueBar.classList.add('high');
            this.fatigueDisplay.style.color = '#ff4500';
            this.fatigueDisplay.style.textShadow = '0 0 10px #ff4500';
        }
    }

    // Reset fatigue calculation
    reset() {
        this.initialMDF = null;
        this.initialRMS = null;
        this.currentMDF = 0;
        this.currentRMS = 0;
        this.fatigueMDF = 0;
        this.fatigueRMS = 0;
        this.fatigueIndex = 0;
        this.updateDisplay();
    }

    // Get current fatigue metrics
    getMetrics() {
        return {
            initialMDF: this.initialMDF,
            currentMDF: this.currentMDF,
            initialRMS: this.initialRMS,
            currentRMS: this.currentRMS,
            fatigueMDF: this.fatigueMDF,
            fatigueRMS: this.fatigueRMS,
            fatigueIndex: this.fatigueIndex
        };
    }
}

// Export for use in main.js
window.FatigueCalculator = FatigueCalculator;
