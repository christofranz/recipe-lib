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
uvicorn api.index:app --reload --port 8000 --env-file .env

# Frontend
npm install
npm run dev

2. Deploy to Vercel (Uses Postgres)
Push to GitHub: Commit all files and push to a new repo.

Import to Vercel: Create a new project in Vercel from that repo.

Deploy (First Pass): It might look like it's working, but it will error on the backend because the DB isn't connected yet.

Connect Database:

In the Vercel Project Dashboard, go to Storage.

Click Connect Store -> Postgres -> Create New.

Select a Region (e.g., Frankfurt).

Click Create.

Important: Once created, Vercel automatically adds environment variables like POSTGRES_URL to your project settings.

Redeploy:

Go to Deployments.

Click the three dots on the latest deployment -> Redeploy.

Why? The app needs to rebuild to see the new Database Environment Variables.

Verify:

Open your App URL.

The backend will detect POSTGRES_URL, run the startup event, create the table in Postgres, and seed the data.

Your App will show the "Spicy DB-Powered Shrimp".


ENV Variables: Dashboard -> Settings -> env variables -> manually add variables from prisma postgres

tailwind: npm install -D tailwindcss postcss autoprefixer and had to add postcss.config.js

echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p


Extension of app: npm install react-router-dom

set jwt keys and alo in .env file, .env file can be imported in vercel