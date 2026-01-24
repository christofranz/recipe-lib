import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { authenticatedFetch } from './api';
import Header, { SubNav } from './Header';
import { Recipe, PLACEHOLDER_IMAGE } from './App';


export default function Cooklist() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const { token, logout } = useAuth();

    const fetchCooklist = async () => {
        setLoading(true);
        try {
            // Wir laden alle Rezepte und filtern im Frontend, 
            // oder du hast einen speziellen Endpunkt /api/recipes/cooklist
            const response = await authenticatedFetch('/api/recipes', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            }, logout);

            const data = await response.json();
            // Nur Rezepte behalten, die auf der Kochliste sind
            setRecipes(data.filter((r: Recipe) => r.in_cooklist));
        } catch (err) {
            console.error("Fehler beim Laden der Kochliste:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchCooklist();
        }
    }, [token, logout]);

    // Entfernen von der Kochliste
    const removeFromCooklist = async (e: React.MouseEvent, id: number) => {
        e.preventDefault(); // Verhindert Navigation zum Rezept
        try {
            const res = await authenticatedFetch(`/api/recipes/${id}/cooklist`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            }, logout);

            if (res.ok) {
                // Optimistisches Update
                setRecipes(prev => prev.filter(r => r.id !== id));
            }
        } catch (err) {
            console.error("Fehler beim Entfernen:", err);
        }
    };

    // Sortierung: FIFO (First In - First Out)
    // Das älteste Datum steht oben
    const sortedRecipes = useMemo(() => {
        return [...recipes].sort((a, b) => {
            const dateA = a.added_to_cooklist_at ? new Date(a.added_to_cooklist_at).getTime() : 0;
            const dateB = b.added_to_cooklist_at ? new Date(b.added_to_cooklist_at).getTime() : 0;
            return dateA - dateB;
        });
    }, [recipes]);

    // Hilfsfunktion für schönes Datum
    const formatDate = (dateString: string | null) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* OBERER BEREICH */}
            <div className="bg-gray-100 border-b border-gray-200 pt-8 pb-2"> {/* pb-2 statt pb-4 für feineren Abschluss zur Linie */}
                <div className="max-w-6xl mx-auto">
                    {/* 1. Header mit Abstand nach unten zur Nav */}
                    <div className="px-4 md:px-8 mb-4"> {/* mb-4 sorgt für Luft zwischen Logo und Pillen */}
                        <Header />
                    </div>

                    {/* 2. SubNav (ohne extra Padding im Container für Full-Width Scroll) */}
                    <div className="mb-1"> {/* Kleiner Puffer zur Trennlinie */}
                        <SubNav />
                    </div>
                </div>
            </div>

            {/* UNTERER BEREICH: Grauer Content-Bereich */}
            <div className="max-w-6xl mx-auto p-4 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    {recipes.length > 0 && (
                        <div className="w-fit text-sm font-medium text-orange-600 bg-orange-50 px-4 py-2 rounded-full shadow-sm border border-orange-100 animate-fadeIn">
                            {recipes.length} {recipes.length === 1 ? 'Rezept geplant' : 'Rezepte geplant'}
                        </div>
                    )}
                </div>

                {/* CONTENT: Loader, Empty State oder Grid */}
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Lade Kochliste...</div>
                ) : recipes.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-300 shadow-sm">
                        <div className="text-5xl mb-4">🥗</div>
                        <h3 className="text-xl font-bold text-gray-800">Deine Kochliste ist leer</h3>
                        <p className="text-gray-500 mt-2 px-4">
                            Füge Rezepte über die Detailseite hinzu, um deinen nächsten Einkauf zu planen.
                        </p>
                        <Link to="/" className="inline-block mt-6 bg-green-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-green-700 transition active:scale-95">
                            Rezepte durchstöbern
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {sortedRecipes.map((recipe) => (
                            <div key={recipe.id} className="group relative">
                                <Link to={`/recipe/${recipe.id}`} state={{ from: window.location.pathname }} className="block h-full">
                                    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition duration-300 transform hover:-translate-y-1 h-full flex flex-col border border-transparent hover:border-orange-200">

                                        {/* Bild mit Badge */}
                                        <div className="h-48 overflow-hidden relative">
                                            <img
                                                src={recipe.image_url || PLACEHOLDER_IMAGE}
                                                alt={recipe.title}
                                                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute top-3 left-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg uppercase tracking-wider">
                                                Geplant für bald
                                            </div>
                                        </div>

                                        <div className="p-5 flex-grow">
                                            <div className="flex justify-between items-start mb-2">
                                                <h2 className="text-xl font-bold text-gray-800 line-clamp-1">{recipe.title}</h2>
                                            </div>
                                            <p className="text-gray-600 line-clamp-2 text-sm mb-4">{recipe.description}</p>

                                            {/* Datum-Info */}
                                            <div className="flex items-center text-xs text-gray-400 mt-auto">
                                                <span className="mr-1">📅</span>
                                                Hinzugefügt am {formatDate(recipe.added_to_cooklist_at)}
                                            </div>
                                        </div>

                                        <div className="p-5 pt-0 mt-auto flex justify-between items-center">
                                            <span className="text-orange-600 font-semibold text-sm group-hover:underline flex items-center">
                                                Ansehen <span className="ml-1">→</span>
                                            </span>
                                        </div>
                                    </div>
                                </Link>

                                {/* Schnell-Entfernen Button (X) oben rechts */}
                                <button
                                    onClick={(e) => removeFromCooklist(e, recipe.id)}
                                    className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 w-8 h-8 rounded-full shadow-md border border-gray-100 flex items-center justify-center transition-all hover:scale-110 z-10"
                                    title="Von Liste entfernen"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}