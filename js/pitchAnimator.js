class PitchAnimator {
    constructor() {
        this.currentAngle = 0;
        this.targetAngle = 0;
        this.imageElement = document.getElementById('pitchImage');
        this.angleDisplay = document.getElementById('angleValue');
        this.updateRate = 200; // 200 Hz to match ESP32 output
        this.smoothingFactor = 0.9; // Increased for smoother transitions at higher frequency
        
        // Available angle images (excluding Angulo40 as requested)
        this.availableAngles = [0, 10, 20, 30, 50, 60, 70, 80, 90];
        
        // Preload images for smooth transitions
        this.preloadImages();
        
        // Start animation loop
        this.startAnimationLoop();
    }

    preloadImages() {
        this.imageCache = {};
        this.availableAngles.forEach(angle => {
            const img = new Image();
            img.src = `./images/Angulo${angle}.png`;
            this.imageCache[angle] = img;
        });
    }

    updateAngle(newAngle) {
        // Clamp angle between 0 and 90
        this.targetAngle = Math.max(0, Math.min(90, newAngle));
    }

    startAnimationLoop() {
        setInterval(() => {
            this.animate();
        }, 1000 / this.updateRate); // 200 Hz update rate to match ESP32
    }

    animate() {
        // Smooth transition to target angle
        const angleDiff = this.targetAngle - this.currentAngle;
        this.currentAngle += angleDiff * (1 - this.smoothingFactor);
        
        // Find closest available image
        const closestAngle = this.findClosestAvailableAngle(this.currentAngle);
        
        // Update image if different
        this.updateImage(closestAngle);
        
        // Update angle display
        this.updateAngleDisplay(Math.round(this.currentAngle));
    }

    findClosestAvailableAngle(targetAngle) {
        let closest = this.availableAngles[0];
        let minDiff = Math.abs(targetAngle - closest);
        
        for (let angle of this.availableAngles) {
            const diff = Math.abs(targetAngle - angle);
            if (diff < minDiff) {
                minDiff = diff;
                closest = angle;
            }
        }
        
        return closest;
    }

    updateImage(angle) {
        if (this.imageCache[angle] && this.imageElement.src !== this.imageCache[angle].src) {
            this.imageElement.src = this.imageCache[angle].src;
            
            // Add a subtle animation effect
            this.imageElement.style.transform = `scale(1.05)`;
            setTimeout(() => {
                this.imageElement.style.transform = `scale(1)`;
            }, 100);
        }
    }

    updateAngleDisplay(angle) {
        if (this.angleDisplay.textContent !== `${angle}°`) {
            this.angleDisplay.textContent = `${angle}°`;
            
            // Color coding based on angle
            if (angle < 30) {
                this.angleDisplay.style.color = '#00ff41'; // Green
                this.angleDisplay.style.textShadow = '0 0 10px #00ff41';
            } else if (angle < 60) {
                this.angleDisplay.style.color = '#ffff00'; // Yellow
                this.angleDisplay.style.textShadow = '0 0 10px #ffff00';
            } else {
                this.angleDisplay.style.color = '#ff4500'; // Orange
                this.angleDisplay.style.textShadow = '0 0 10px #ff4500';
            }
        }
    }

    // Method to process raw angle data at 200 Hz (updated from 50 Hz)
    processAngleData(rawAngle) {
        this.updateAngle(rawAngle);
        return this.currentAngle;
    }

    // Get current angle for other calculations
    getCurrentAngle() {
        return this.currentAngle;
    }

    // Reset animation to angle 0
    reset() {
        this.currentAngle = 0;
        this.targetAngle = 0;
        this.updateImage(0);
        this.updateAngleDisplay(0);
    }
}

// Export for use in main.js
window.PitchAnimator = PitchAnimator;
