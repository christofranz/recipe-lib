import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Register from './Register';

// --- TYPEN ---
interface Recipe {
    id: number;
    public_id: string;
    title: string;
    description: string;
    image_url: string;
    ingredients_str: string; // Achten Sie darauf, ob Ihr Backend 'ingredients' (Array) oder string sendet
    instructions: string;
}

// --- HELPER: PROTECTED ROUTE ---
// Wenn User nicht eingeloggt ist, redirect zu Login
function ProtectedRoute({ children }: { children: JSX.Element }) {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

// --- KOMPONENTE: HEADER (Logout Button) ---
function Header() {
    const { logout } = useAuth();
    return (
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Meine Rezeptsammlung</h1>
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800 underline">Logout</button>
        </div>
    );
}

// --- KOMPONENTE 1: ÜBERSICHTSLISTE (HOME) ---
function RecipeList() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);

    // State für Import
    const [importUrl, setImportUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const navigate = useNavigate(); // Hook für Navigation

    // Auth Hook holen
    const { token, logout } = useAuth();

    useEffect(() => {
        fetch('/api/recipes', {
            headers: {
                'Authorization': `Bearer ${token}` // <--- WICHTIG
            }
        })
            .then(res => res.json())
            .then(data => setRecipes(data))
            .catch(err => console.error("Error loading recipes:", err));
    }, []);

    // Import Handler
    const handleImport = async () => {
        if (!importUrl) return;
        setIsImporting(true);

        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url: importUrl })
            });

            if (response.status === 401) {
                logout();
                return;
            }

            if (!response.ok) {
                const err = await response.json();
                alert("Fehler beim Import: " + (err.detail || "Unbekannter Fehler"));
                setIsImporting(false);
                return;
            }

            const data = await response.json();
            // Erfolgreich! Weiterleitung zur Detailseite des neuen Rezepts
            navigate(`/recipe/${data.id}`);

        } catch (error) {
            console.error(error);
            alert("Netzwerkfehler beim Importieren.");
            setIsImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <Header /> {/* log out button*/}

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">

                    {/* H1 links <h1 className="text-3xl font-bold text-gray-800">Meine Rezeptsammlung</h1> */}


                    {/* Import Feld rechts (auf mobilen Geräten unter der H1) */}
                    <div className="flex w-full md:w-auto gap-2">
                        <input
                            type="text"
                            placeholder="Rezept URL einfügen..."
                            className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                        />
                        <button
                            onClick={handleImport}
                            disabled={isImporting}
                            className={`px-6 py-2 rounded-lg text-white font-semibold transition ${isImporting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            {isImporting ? 'Lade...' : 'Import'}
                        </button>
                    </div>
                </div>

                {/* Grid Layout für die Karten */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {recipes.map((recipe) => (
                        <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="group">
                            <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                                <div className="h-48 overflow-hidden">
                                    <img
                                        src={recipe.image_url}
                                        alt={recipe.title}
                                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <div className="p-5 flex-grow">
                                    <h2 className="text-xl font-bold mb-2 text-gray-800">{recipe.title}</h2>
                                    <p className="text-gray-600 line-clamp-3 text-sm">{recipe.description}</p>
                                </div>
                                <div className="p-5 pt-0 mt-auto">
                                    <span className="text-red-500 font-semibold text-sm group-hover:underline">Zum Rezept &rarr;</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {recipes.length === 0 && (
                    <p className="text-center text-gray-500 mt-10">Keine Rezepte gefunden. Importiere dein erstes Rezept!</p>
                )}
            </div>
        </div>
    );
}

// --- KOMPONENTE 2: DETAILANSICHT ---
function RecipeDetail() {
    const { id } = useParams(); // Holt die ID aus der URL
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const { token } = useAuth(); // Token holen

    useEffect(() => {
        // Fetcht jetzt das spezifische Rezept basierend auf der ID
        fetch(`/api/recipes/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error("Not found");
                return res.json();
            })
            .then(data => setRecipe(data))
            .catch(err => console.error(err));
    }, [id]);

    if (!recipe) return <div className="p-10 text-center text-xl">Lade Rezept...</div>;

    // Helper für Zutaten (String zu Array)
    // Passen Sie dies an, falls Ihr Backend bereits ein Array sendet
    const ingredients = recipe.ingredients_str
        ? recipe.ingredients_str.split("|").filter(i => i.trim() !== '')
        : [];

    // --- BRING LINK LOGIK ---
    const recipeSourceUrl = window.location.hostname === 'localhost'
        ? encodeURIComponent(`http://127.0.0.1:8000/r/${recipe.public_id}`)
        : encodeURIComponent(`${window.location.origin}/r/${recipe.public_id}`);

    const bringDeeplinkBase = "https://api.getbring.com/rest/bringrecipes/deeplink";
    const finalBringDeeplink = `${bringDeeplinkBase}?url=${recipeSourceUrl}&source=web&baseQuantity=4&requestedQuantity=4`;

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white max-w-md lg:max-w-3xl w-full rounded-2xl shadow-xl overflow-hidden relative">

                {/* Zurück Button */}
                <Link to="/" className="absolute top-4 left-4 z-10 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm transition">
                    &larr; Alle Rezepte
                </Link>

                <div className="h-64 relative">
                    <img src={recipe.image_url} className="w-full h-full object-cover" alt={recipe.title} />
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4">
                        <h1 className="text-white text-2xl font-bold">{recipe.title}</h1>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-gray-600 mb-6">{recipe.description}</p>

                    <div className="
                        flex flex-col gap-2 
                        lg:flex-row lg:justify-between lg:items-center 
                        mb-4 border-b pb-4
                    ">
                        <h2 className="font-bold text-lg">Zutaten</h2>

                        <div className="w-full lg:w-auto flex justify-start">
                            <a
                                href={finalBringDeeplink}
                                target="_blank"
                                rel="nofollow noopener"
                                className="bring-recipe-button w-auto"
                            >
                                <img
                                    src="data:image/svg+xml,%3csvg%20width='18'%20height='25'%20viewBox='0%200%2018%2025'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M11.5419%204.43201L13.1396%204.35939C13.1396%204.35939%2013.1396%202.61644%2012.9944%202.4712C12.8491%202.25333%2011.8324%201.16399%2011.1788%200.94612C10.5978%200.873497%209.36321%201.30923%209.14534%201.38186C9.14534%201.38186%209.07272%201.38186%209.07272%201.45448C8.92748%201.67235%208.20125%202.68907%208.12863%203.1248C7.98338%203.41529%207.83813%204.50463%207.83813%204.50463H8.56436H9.0001C9.0001%204.50463%209.14534%202.76169%209.07272%202.68907C9.72633%202.61644%2010.6704%202.39858%2011.1062%202.54382C11.324%202.54382%2011.5419%204.43201%2011.5419%204.43201Z'%20fill='white'/%3e%3cpath%20d='M3.98901%204.64975L5.29622%204.57713C5.29622%204.57713%205.2236%202.83418%205.51409%202.47107C6.02245%202.2532%206.45819%202.18058%206.89392%202.10795C7.32966%202.10795%208.34638%201.96271%208.34638%202.18058C8.419%202.39845%208.49162%203.56041%208.49162%204.43188C9.72621%204.43188%209.72621%204.43188%209.72621%204.43188L9.43572%201.96271C9.43572%201.96271%208.49162%200.582877%208.12851%200.510254C7.91064%200.510254%207.54753%200.510254%206.74868%200.728122C5.94983%200.945991%205.58671%201.09124%205.58671%201.09124%205.15098%201.3091%204.71524%202.03533C4.20688%202.68894%204.13426%202.83418%204.13426%202.83418C4.13426%202.83418%203.98901%203.8509%203.98901%204.64975Z'%20fill='white'/%3e%3cpath%20d='M0.140011%2022.2971C0.140011%2022.2971%200.64837%2022.5876%201.59247%2022.8054C2.53656%2023.0233%2012.6311%2024.9841%2013.43%2024.4031C13.43%2023.3138%2013.0669%204.28662%2013.0669%204.28662C13.0669%204.28662%201.3746%204.43187%200.93886%204.72236C0.93886%204.72236%200.866238%204.79498%200.793616%204.94023C0.720993%205.08547%200.64837%205.37596%200.64837%205.66645C0.575747%207.4094%200.430501%2011.1132%200.285256%2014.5991C0.0673876%2018.5207%20-0.15048%2022.0792%200.140011%2022.2971Z'%20fill='white'/%3e%3cpath%20d='M13.4299%2024.4031C13.4299%2024.4031%2017.2063%2021.9339%2017.4241%2021.2803C17.3515%2020.1184%2016.9158%204.72236%2016.48%204.64973C16.0443%204.43187%2013.0668%204.28662%2013.0668%204.28662L13.4299%2024.4031Z'%20fill='%234FABA2'/%3e%3cpath%20d='M3.3354%2012.6381L5.65933%2014.381L10.0167%208.78906L11.6144%2010.1689L5.80457%2017.7217L1.95557%2014.3084L3.3354%2012.6381Z'%20fill='%2324A599'/%3e%3c/svg%3e"
                                    alt="Bring! Logo"
                                    className="w-4 h-4"
                                />
                                <span>Auf die Einkaufsliste setzen</span>
                            </a>
                        </div>
                    </div>

                    <ul className="mb-6 space-y-2">
                        {ingredients.map((ing, i) => (
                            <li key={i} className="flex items-center text-gray-700">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>{ing}
                            </li>
                        ))}
                    </ul>

                    <h2 className="font-bold text-lg mb-4 pt-4 border-t">Anweisungen</h2>

                    <div className="space-y-4">
                        {/* Wir splitten den Text bei \n\n (die Absatztrennung aus dem Backend) 
            und rendern jeden Teil als einen eigenen Absatz oder Schritt. */}
                        {recipe.instructions.split('\n\n').filter(step => step.trim() !== '').map((step, index) => (
                            <div key={index} className="flex items-start">
                                {/* Visualisierung des Schritts mit Nummerierung */}
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 font-bold rounded-full mr-3 mt-1">
                                    {index + 1}
                                </div>
                                <p className="text-gray-700 leading-relaxed flex-grow">
                                    {step}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- APP ROUTING WRAPPER ---
export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Öffentliche Routen */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Geschützte Routen */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <RecipeList />
                        </ProtectedRoute>
                    } />
                    <Route path="/recipe/:id" element={
                        <ProtectedRoute>
                            <RecipeDetail />
                        </ProtectedRoute>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    );
}