# EMG Real-Time Monitor

Sistema de monitoreo en tiempo real para datos EMG, ángulo pitch y fatiga muscular, diseñado para recibir datos de un ESP32 vía WiFi.

## Características

### 📊 Gráfica EMG en Tiempo Real
- Frecuencia de muestreo: **2000 Hz**
- Filtros pasa banda: **20-450 Hz**
- Visualización en tiempo real sin títulos
- Procesamiento de señal con filtros IIR Butterworth

### 🔄 Animación de Ángulo Pitch
- Frecuencia de actualización: **200 Hz** (optimizada para ESP32)
- 9 imágenes PNG de inclinación (Angulo0, Angulo10...Angulo90, excepto Angulo40)
- Animación fluida con interpolación
- Visualización del ángulo numérico al lado de la animación

### 📈 Barra de Fatiga
- Cálculo basado en Median Frequency (MDF)
- Fórmula: `Fatiga (%) = [(MDF_inicial - MDF_actual) / MDF_inicial] × 100`
- Ventana de análisis: **5 segundos**
- Barra porcentual 0-100% con codificación de colores

## Estructura del Proyecto

```
📁 Gráficas/
├── 📄 index.html                 # Página principal
├── 📁 css/
│   └── 📄 styles.css            # Estilos responsivos
├── 📁 js/
│   ├── 📄 emgProcessor.js       # Procesamiento EMG y filtros
│   ├── 📄 pitchAnimator.js      # Animación de ángulo pitch
│   ├── 📄 fatigueCalculator.js  # Cálculo de fatiga MDF
│   ├── 📄 dataReceiver.js       # Comunicación con ESP32
│   └── 📄 main.js               # Coordinador principal
├── 📁 images/                   # Imágenes PNG de ángulos
│   ├── 🖼️ Angulo0.png
│   ├── 🖼️ Angulo10.png
│   ├── 🖼️ Angulo20.png
│   ├── 🖼️ Angulo30.png
│   ├── 🖼️ Angulo50.png
│   ├── 🖼️ Angulo60.png
│   ├── 🖼️ Angulo70.png
│   ├── 🖼️ Angulo80.png
│   └── 🖼️ Angulo90.png
└── 📄 README.md
```

## Configuración de Imágenes

**IMPORTANTE**: Debes agregar las 9 imágenes PNG en la carpeta `images/`:

- `Angulo0.png`
- `Angulo10.png`
- `Angulo20.png`
- `Angulo30.png`
- `Angulo50.png` (nota: NO Angulo40.png como solicitado)
- `Angulo60.png`
- `Angulo70.png`
- `Angulo80.png`
- `Angulo90.png`

## Uso

### 🚀 Inicio Rápido

1. **Abrir la aplicación**: Abrir `index.html` en un navegador web
2. **Modo simulación**: Presionar `S` para datos de prueba
3. **Conectar ESP32**: Ingresar IP del ESP32 y hacer clic en "Connect"

### ⌨️ Atajos de Teclado

- `S` - Iniciar simulación de datos
- `C` - Conectar al ESP32
- `D` - Desconectar del ESP32
- `Q` - Calibrar ESP32 (mantener músculo relajado)
- `E` - Reiniciar ESP32
- `R` - Reiniciar datos locales
- `H` - Mostrar ayuda

### 🔌 Configuración ESP32

#### WebSocket (Configuración Actual)
```cpp
// Puerto WebSocket: 8000
// Path: /ws/esp32
// IP por defecto: 192.168.68.100

// Formato de datos EMG:
{
  "timestamp": 1234567.890,
  "emg": 123.45,
  "sensor_id": "esp32_001",
  "raw_adc": 2048,
  "voltage": 1.65
}

// Formato de datos Ángulo:
{
  "timestamp": 1234567.890,
  "angle": 45.5,
  "pitch": 45.5,
  "roll": 12.3,
  "sensor_id": "esp32_001"
}
```

#### Comandos de Control
```json
// Calibrar ESP32
{"command": "calibrate"}

// Reiniciar ESP32
{"command": "reset"}
```

### 📱 Integración con App

- **GitHub Pages**: Proyecto listo para publicar en GitHub Pages
- **WebViewer**: Optimizado para visualización en apps móviles
- **Sin títulos**: Gráficas limpias sin etiquetas para integración fluida

## Especificaciones Técnicas

### Procesamiento de Datos
- **EMG**: Separado a 2000 Hz con filtros pasa banda 20-450 Hz
- **Pitch**: Separado a 200 Hz para animación ultra-fluida (ESP32 optimizado)
- **Fatiga**: Calculado cada 5 segundos con ventana deslizante

### Algoritmos
- **Filtros IIR Butterworth**: Implementación digital para EMG
- **FFT**: Cálculo de densidad espectral para MDF
- **Interpolación**: Suavizado de animaciones de ángulo

### Rendimiento
- **Tiempo real**: Actualización instantánea de cambios
- **Separación de frecuencias**: Evita conflictos en transmisión de datos
- **Optimización**: Buffers limitados para prevenir sobrecarga de memoria

## Desarrollo

### Ejecutar Localmente
```bash
# Servir archivos estáticos (Python)
python -m http.server 8000

# O con Node.js
npx serve .

# Acceder en: http://localhost:8000
```

### Depuración
- Consola del navegador muestra logs detallados
- Estado de la aplicación disponible en `window.emgMonitorApp.getApplicationState()`
- Monitoreo de rendimiento activado en localhost

## Publicación

### GitHub Pages
1. Subir proyecto a repositorio GitHub
2. Habilitar GitHub Pages en configuración
3. Usar URL generada en WebViewer de la app

### Consideraciones
- Todas las gráficas sin títulos para integración limpia
- Diseño responsivo para móviles
- Optimizado para WebView en aplicaciones nativas

## Soporte

- **Navegadores**: Chrome, Firefox, Safari, Edge (moderno)
- **Dispositivos**: Desktop, tablet, móvil
- **ESP32**: Compatible con Arduino IDE y PlatformIO

---

## Notas del Desarrollador

Este proyecto implementa un sistema completo de monitoreo EMG en tiempo real con:
- Procesamiento separado por frecuencia para evitar conflictos
- Algoritmos de procesamiento de señales digitales
- Interfaz optimizada para aplicaciones móviles
- Comunicación robusta con ESP32

Para preguntas técnicas o mejoras, revisar el código fuente documentado en cada módulo.
