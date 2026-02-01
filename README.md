# LLM Model Vetter

A minimal application for testing and vetting WebLLM models across different devices and browsers. Built for deployment on GitHub Pages.

## 🎯 Purpose

This tool helps you:
- Test which LLM models work on your device
- Compare model performance across different hardware
- Verify WebGPU compatibility
- Evaluate models for mobile vs desktop use cases

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

## 📱 Model Tiers

Models are categorized by device capability:

### Tier 1: Mobile-Friendly (< 1GB VRAM)
| Model | Parameters | Notes |
|-------|------------|-------|
| SmolLM2 360M | 360M | Smallest, fastest |
| TinyLlama 1.1B | 1.1B | Good quality for size |

### Tier 2: Medium (1-3GB VRAM)
| Model | Parameters | Notes |
|-------|------------|-------|
| Llama 3.2 1B | 1B | Best small Llama |
| SmolLM2 1.7B | 1.7B | Good balance |
| Qwen 2.5 1.5B | 1.5B | Multilingual |
| Phi 3.5 Mini | 3.8B | Strong reasoning |

### Tier 3: Heavy/Desktop (4-8GB VRAM)
| Model | Parameters | Notes |
|-------|------------|-------|
| Llama 3.2 3B | 3B | Good mid-range |
| Gemma 2 2B | 2B | Long context |
| Llama 3.1 8B | 8B | High quality |
| DeepSeek R1 7B | 7B | Reasoning focused |

## 🌐 Browser Compatibility

| Browser | Platform | WebGPU Support |
|---------|----------|----------------|
| Chrome 121+ | Desktop | ✅ Full |
| Chrome 121+ | Android | ✅ With flag |
| Edge 121+ | Desktop | ✅ Full |
| Safari 18+ | macOS | ✅ Full |
| Safari | iOS | ❌ Coming soon |
| Firefox | All | ❌ Limited |

## 📁 Project Structure

```
src/
├── core/
│   ├── api-types.ts      # Type definitions
│   ├── webllm-client.ts  # WebLLM wrapper
│   └── worker.ts         # Web worker handler
├── models/
│   └── model-config.ts   # Model definitions
├── ui/
│   └── ui-controller.ts  # DOM interactions
├── utils/
│   └── webgpu-detect.ts  # Device detection
└── main.ts               # Entry point

tests/
├── setup.ts              # Test configuration
├── unit/                 # Unit tests
└── user-stories/         # Behavior-driven tests
```

## 🧪 Testing

The project uses Vitest with V8 coverage:

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Categories

- **Unit Tests**: Core functionality testing
- **User Story Tests**: Behavior-driven scenarios
  - Model Selection Journey
  - Chat Interaction Journey
  - Device Compatibility Journey

## 🚢 Deployment

### GitHub Pages

1. Build the project:
   ```bash
   npm run build
   ```

2. The `dist/` folder contains static files ready for GitHub Pages

3. Configure GitHub Pages to serve from `dist/` or use GitHub Actions

### Configuration

Update `vite.config.ts` base path for your repo:

```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ...
});
```

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm 9+
- Modern browser with WebGPU support

### Environment

The app automatically detects:
- WebGPU availability
- Device type (mobile/tablet/desktop)
- GPU capabilities
- Recommended model tier

## 📊 Performance Metrics

The app tracks:
- **Load Time**: Time to download and initialize model
- **Tokens**: Total tokens generated
- **Speed**: Tokens per second
- **Response Time**: Total inference time

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass with `npm run test:coverage`
5. Submit a pull request

## 📝 License

Apache-2.0

## 🙏 Acknowledgments

- [WebLLM](https://webllm.mlc.ai) - The core inference engine
- [MLC-AI](https://mlc.ai) - Machine Learning Compilation
