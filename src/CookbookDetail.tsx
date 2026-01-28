import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Cookbook } from './App';
import { authenticatedFetch } from './api';
import Header from './Header';


export default function CookbookDetail() {
    const { id } = useParams();
    const [cookbook, setCookbook] = useState<Cookbook | null>(null);
    const { token, logout } = useAuth();
    const [loading, setLoading] = useState(true);


    // 1. Such-Query State
    const [searchQuery, setSearchQuery] = useState("");

    // 2. Filter-Logik: Greift auf cookbook.recipes zu
    const filteredRecipes = cookbook?.recipes ? cookbook.recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];

    useEffect(() => {
        const loadCookbookData = async () => {
            try {
                const response = await authenticatedFetch(`/api/cookbooks/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }, logout);

                const data = await response.json();
                setCookbook(data);
            } catch (err) {
                console.error("Fehler beim Laden des Kochbuchs:", err);
            } finally {
                setLoading(false); // Laden beendet
            }
        };

        if (token && id) {
            loadCookbookData();
        }
    }, [id, token, logout]);

    if (!cookbook) return <div className="p-8">Lädt...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <Header /> {/* Logout Button oben rechts wie im Original */}

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    {/* LINKE SEITE: Navigation (jetzt mit Fokus auf Kochbücher) */}
                    <div>
                        <nav className="flex gap-4 mt-2">
                            <Link
                                to="/"
                                className="text-gray-500 hover:text-green-600 transition font-medium pb-1"
                            >
                                🏠 Rezepte
                            </Link>
                            <Link
                                to="/cookbooks"
                                className="text-green-700 font-bold border-b-2 border-green-600 pb-1 cursor-default"
                            >
                                📖 Kochbücher
                            </Link>
                            <Link
                                to="/import"
                                className="text-gray-500 hover:text-green-600 transition font-medium pb-1"
                            >
                                📥 Import
                            </Link>
                        </nav>
                    </div>

                    {/* RECHTE SEITE: Kochbuch-Info (statt Import-Feld) */}
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-gray-800">{cookbook.name}</h1>
                        </div>
                        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                            {cookbook.recipes?.length || 0} Rezepte gespeichert
                        </p>
                    </div>
                </div>

                <hr className="mb-3 border-gray-200" />

                {/* Suche & Trefferanzahl */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">

                    {/* Suche & Trefferanzahl */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:max-w-2xl">

                        {/* Suche: Auf Mobile w-full (vollflächig), ab sm: (Tablet/Desktop) max-w-xs */}
                        <div className="relative w-full sm:max-w-xs">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
                            <input
                                type="text"
                                placeholder="In deinen Rezepten suchen..."
                                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Trefferanzahl */}
                        {searchQuery.length > 0 && (
                            <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest whitespace-nowrap bg-green-50 px-3 py-1.5 rounded-full border border-green-100 animate-fadeIn h-fit">
                                {filteredRecipes.length} {filteredRecipes.length === 1 ? 'Treffer' : 'Treffer'}
                            </span>
                        )}
                    </div>
                </div>
                {/* Grid Layout für die Karten (Exakte Kopie) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* FALLS LADEND: Zeige 6 Platzhalter-Karten */}
                    {loading && (
                        <>
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse border border-gray-100">
                                    {/* Bild-Platzhalter */}
                                    <div className="h-48 bg-gray-200" />
                                    <div className="p-5">
                                        {/* Titel-Platzhalter */}
                                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                                        {/* Text-Platzhalter (3 Zeilen für line-clamp-3 Optik) */}
                                        <div className="space-y-2">
                                            <div className="h-4 bg-gray-100 rounded w-full" />
                                            <div className="h-4 bg-gray-100 rounded w-full" />
                                            <div className="h-4 bg-gray-100 rounded w-2/3" />
                                        </div>
                                        {/* Button-Platzhalter */}
                                        <div className="h-4 bg-gray-100 rounded w-24 mt-6" />
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                    {!loading && cookbook.recipes && cookbook.recipes.length > 0 ? (
                        filteredRecipes.map((recipe) => (
                            <Link key={recipe.id} to={`/recipe/${recipe.id}`} state={{ from: window.location.pathname }} className="group">
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
                                        <span className="text-red-500 font-semibold text-sm group-hover:underline">
                                            Zum Rezept &rarr;
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                            <p className="text-gray-500">Dieses Kochbuch ist noch leer.</p>
                            <Link to="/" className="text-green-600 font-bold mt-2 inline-block">
                                Rezepte hinzufügen &rarr;
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}