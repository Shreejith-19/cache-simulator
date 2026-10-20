# CPU Cache Simulator — Full-Stack Web Application

A full-stack CPU Cache Simulator designed for computer architecture study and C++ portfolio demonstration. The application separates hardware-accurate simulation from interactive visualization:
- **Simulation Engine (Backend):** High-performance C++20 engine executing all memory address calculations, set mapping, tag matching, replacement policies (LRU, LFU, FIFO), and write policies (Write-Back/Write-Through).
- **HTTP Server:** Lightweight REST API server built with [Crow](https://crowcpp.org/).
- **Visualization (Frontend):** Interactive dashboard built with React 19, JavaScript, Vite, Tailwind CSS, DaisyUI, and Recharts.

---

## Project Structure

```
cache-simulator/
├── frontend/                     # React + Vite application
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js            # Environment-aware backend API client
│   │   ├── App.jsx               # Dashboard and connection status UI
│   │   ├── App.css               # Component style overrides
│   │   ├── index.css             # Tailwind and DaisyUI imports
│   │   └── main.jsx              # React DOM entry
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js        # DaisyUI & Tailwind setup
│   ├── postcss.config.js
│   ├── vite.config.js            # Vite dev server with /api proxy
│   ├── .env                      # Local dev environment settings
│   └── .env.example
├── backend/                      # C++20 Crow Backend
│   ├── include/                  # Header files (cache simulation models)
│   │   └── cache_types.hpp
│   ├── src/                      # Implementation files
│   │   └── main.cpp              # Server entry point & GET /api/health
│   ├── tests/                    # Unit tests
│   │   ├── CMakeLists.txt
│   │   └── test_placeholder.cpp
│   └── CMakeLists.txt            # Modern CMake build configuration
├── .gitignore                    # Root gitignore for C++, Node & IDEs
└── README.md
```

---

## Architecture & Responsibilities

| Layer | Technology | Primary Responsibilities |
|---|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, DaisyUI, Recharts | Interactive UI, configuration forms, hit/miss charts, trace visualization, calling the backend via REST API |
| **Backend** | C++20, Crow, CMake | Tag/Index/Offset address decoding, cache line storage, set associativity, hit/miss metrics, replacement & write policies |
| **Protocol** | JSON over HTTP | RESTful communication between frontend and backend |

> **Note:** The cache simulation algorithms are strictly implemented in C++. The frontend acts purely as a presentation and interaction layer.

---

## API Endpoints

### `GET /api/health`
Checks backend service availability.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "cpu-cache-simulator-backend",
  "version": "1.0.0",
  "message": "C++ Crow Backend is healthy and ready for cache simulation requests."
}
```

---

## Setup & Running Instructions

### 1. Prerequisites

- **Frontend:** Node.js (v18+) and `npm`
- **Backend:**
  - **CMake** 3.20 or newer
  - **C++20 Compiler:**
    - Windows: Visual Studio 2022 / 2026 (MSVC) with "Desktop development with C++"
    - Ubuntu/WSL: GCC 11+ or Clang 13+ (`build-essential`, `g++`, `cmake`, `libasio-dev`)

---

### 2. Backend Setup

#### Windows (PowerShell / Visual Studio Developer Prompt)
```powershell
# Navigate to the backend directory
cd backend

# Configure CMake with Visual Studio
cmake -B build -S .

# Build the executable (Release or Debug)
cmake --build build --config Release

# Run the backend server (starts on http://localhost:8080)
.\build\Release\cache_simulator_backend.exe
```

#### Ubuntu / WSL
```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential cmake libasio-dev git

# Navigate to backend directory
cd backend

# Configure CMake
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release

# Build the executable
cmake --build build -j$(nproc)

# Run the backend server (starts on http://localhost:8080)
./build/cache_simulator_backend
```

#### Running Tests
```bash
ctest --test-dir build -C Release --output-on-failure
```

---

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (React, Tailwind, DaisyUI, Recharts)
npm install

# Start Vite development server with proxying enabled
npm run dev
```

The frontend will run at `http://localhost:5173`.
By default, the Vite dev server automatically proxies all `/api/*` requests to `http://localhost:8080`, avoiding cross-origin issues during development.

---

### 4. Environment Variables

In `frontend/.env`:
```ini
# Leave empty to use Vite's dev proxy (/api -> backend)
# Set to an explicit URL (e.g. http://localhost:8080) for direct cross-origin calls
VITE_API_BASE_URL=

# Backend target for Vite dev proxy
VITE_DEV_BACKEND_URL=http://localhost:8080
```

---

## Verification Checkpoint

1. Start the C++ backend on port `8080`.
2. Start the Vite frontend on port `5173`.
3. Open `http://localhost:5173` in your browser.
4. The dashboard will automatically query `GET /api/health` and display **"Backend Online"** along with server diagnostic details.