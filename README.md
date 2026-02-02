# TerziLLM
Terzi LLM is meant to be a friction-less entry into self hosted, local AI. 

## Use Cases

- Create a desktop application via PWA for easy access to local AI models.
- Chat with local AI models through a web interface.
- Persist conversations and settings.
- Create a peer to peer network to a mobile PWA so the desktop does the inference and the mobile is just a front end chat.
- Create a browser extension so that local AI can access the internet.

## Technical Challenges

- WebGPU acceleration for local AI models is newly supported and rapidly evolving.
- Database management in the browser can be complex, especially for large datasets.
- It is easy to run into performance bottlenecks when running AI models in the browser, causing crashes or unresponsiveness.
- Caching and loading large AI models efficiently in the browser is challenging.
- This will be intended for anyone to be able to use, not just developers, so ease of use and user experience is critical.

## Packages

### Core API

- WebLLM
- Dexie.js
- Zustand

### UI

- React
- Vite

### Dev Tools

- TypeScript
- ESLint
- Prettier
- Vitest
- v8
- TypeDoc
