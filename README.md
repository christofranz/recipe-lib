# recipe-lib
recipe-poc/
├── api/
│   └── index.py            # Complete Backend (DB + API)
├── src/
│   └── App.tsx             # Frontend Logic
├── requirements.txt        # Python Deps
├── package.json            # JS Deps
├── vercel.json             # Deployment Config
├── vite.config.ts          # Local Proxy Config
└── index.html              # Entry HTML

# Create environment
python3.8 -m venv venv  # Explicitly using 3.8 if you have multiple versions
source venv/bin/activate

# Install
pip install -r requirements.txt

# Run
uvicorn api.index:app --reload --port 8000

# Frontend
npm install
npm run dev