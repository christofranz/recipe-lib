import { useEffect, useState, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useSearchParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Register from './Register';
import CookbookList from './CookbookList';
import ImportPage from './Import';
import CookbookDetail from './CookbookDetail';
import CookbookSelector from './CookbookSelector';
import AcceptShare from './AcceptShare';
import { authenticatedFetch } from './api';
import Header from './Header';
// import { TimerIcon, FireIcon, UsersIcon } from './Icons';
import {
    Timer as TimerIcon,
    Flame as FireIcon,
    Users as UsersIcon,
    Camera, Edit2, Check, X, Trash2, Share2, Star,
    ArrowUpWideNarrow, ArrowDownWideNarrow,
    ChevronDown
} from 'lucide-react';

// --- TYPEN ---
export interface Recipe {
    id: number;
    public_id: string;
    title: string;
    description: string;
    image_url: string;
    ingredients_str: string; // Achten Sie darauf, ob Ihr Backend 'ingredients' (Array) oder string sendet
    instructions: string;
    cookbooks: Cookbook[];
    cook_time: number; // in Minuten
    prep_time: number; // in Minuten
    yields: number; // Anzahl der Portionen
    notes: string; // Persönliche Notizen
    rating: number; // 0 bis 5 Sterne
    cook_count: number; // Wie oft gekocht
    last_cooked: string | null; // ISO Datum des letzten Kochens
}
export interface Cookbook {
    id: number;
    name: string;
    recipes?: Recipe[]; // Optional, wenn wir ein spezifisches Kochbuch laden
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

const PLACEHOLDER_IMAGE = "https://icon-library.com/images/photo-placeholder-icon/photo-placeholder-icon-7.jpg";

// --- KOMPONENTE 1: ÜBERSICHTSLISTE (HOME) ---
function RecipeList() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);

    // State für Import
    const [importUrl, setImportUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const navigate = useNavigate(); // Hook für Navigation

    // Auth Hook holen
    const { token, logout } = useAuth();

    // Cookbook list
    const [allCookbooks, setAllCookbooks] = useState<Cookbook[]>([]);
    const [selectedCookbookIds, setSelectedCookbookIds] = useState<number[]>([]);

    const location = useLocation();

    // Such-Query State
    const [searchQuery, setSearchQuery] = useState("");

    // Filter-Logik: Sucht im Titel und in der Beschreibung
    // 1. Zuerst die Filterung (Suche)
    const filteredRecipes = useMemo(() => {
        return recipes.filter(recipe =>
            recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [recipes, searchQuery]); // Reagiert sofort, wenn 'recipes' nach dem Löschen neu geladen wird

    // Sortier-Logik
    const [searchParams, setSearchParams] = useSearchParams();

    // Werte aus der URL lesen (mit Fallback-Standards)
    const sortBy = (searchParams.get('sort') as SortKey) || 'id';
    const sortOrder = (searchParams.get('order') as SortOrder) || 'desc';

    // Diese Funktion aktualisiert die URL
    const updateSort = (newSort?: SortKey, newOrder?: SortOrder) => {
        const params = new URLSearchParams(searchParams);
        if (newSort) params.set('sort', newSort);
        if (newOrder) params.set('order', newOrder);
        setSearchParams(params);
    };

    type SortOrder = 'asc' | 'desc';
    type SortKey = 'id' | 'last_cooked' | 'frequency' | 'rating';



    // Rezepte laden
    const loadRecipes = useCallback(async (extraHeaders = {}) => {
        if (!token) return;
        try {
            const res = await authenticatedFetch('/api/recipes', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...extraHeaders // Hier werden die Force-Refresh Header injiziert
                }
            }, logout);
            const data = await res.json();
            setRecipes(data);
        } catch (err) {
            console.error("Error loading recipes:", err);
        }
    }, [token, logout]);

    // 1. Kochbücher laden
    useEffect(() => {
        // Prüfen, ob wir von einer Aktion kommen (z.B. Löschen), die frische Daten erzwingt
        const shouldForce = location.state?.forceRefresh;

        const fetchOptions = shouldForce
            ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            : {};

        // Rezepte laden
        loadRecipes(fetchOptions);

        // WICHTIG: Den State "verbrauchen"
        // Das verhindert, dass bei jedem internen Re-Render erneut ein Force-Refresh passiert
        if (shouldForce) {
            window.history.replaceState({}, document.title);
        }
    }, [token, loadRecipes, location.state]); // location.state triggert den Effekt nach dem navigate

    // Sort function
    const sortRecipes = (recipes: Recipe[], sortBy: SortKey, sortOrder: SortOrder): Recipe[] => {
        return [...recipes].sort((a, b) => {
            let valueA = a[sortBy as keyof Recipe];
            let valueB = b[sortBy as keyof Recipe];

            if (sortBy === 'last_cooked') {
                const timeA = valueA ? new Date(valueA as string).getTime() : 0;
                const timeB = valueB ? new Date(valueB as string).getTime() : 0;
                return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
            }

            const numA = Number(valueA) || 0;
            const numB = Number(valueB) || 0;

            return sortOrder === 'desc' ? numB - numA : numA - numB;
        });
    };

    // Sortierung
    const filteredAndSortedRecipes = useMemo(() => {
        return sortRecipes(filteredRecipes, sortBy, sortOrder);
    }, [filteredRecipes, sortBy, sortOrder]); // Reagiert, wenn sich die gefilterte Liste oder Sortierung ändert

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <Header /> {/* Logout Button oben rechts */}

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    {/* LINKE SEITE: Titel & Navigation */}
                    <div>
                        <nav className="flex gap-4 mt-2">
                            <span className="text-green-700 font-bold border-b-2 border-green-600 pb-1 cursor-default">
                                🏠 Rezepte
                            </span>
                            <Link
                                to="/cookbooks"
                                className="text-gray-500 hover:text-green-600 transition font-medium pb-1"
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
                </div>

                <hr className="mb-3 border-gray-200" />
                {/* Such- und Sortierbereich */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">

                    {/* Linke Seite: Suche & Trefferanzahl */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:max-w-2xl">
                        <div className="relative flex-grow max-w-xs">
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

                        {/* Trefferanzahl (dezent daneben oder darunter) */}
                        {searchQuery.length > 0 && (
                            <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest whitespace-nowrap bg-green-50 px-2 py-1 rounded-full border border-green-100 animate-fadeIn">
                                {filteredAndSortedRecipes.length} {filteredAndSortedRecipes.length === 1 ? 'Treffer' : 'Treffer'}
                            </span>
                        )}
                    </div>

                    {/* Modernes Sortier-Menü */}
                    <div className="flex items-center w-full md:w-auto bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-1 shadow-sm">
                        <div className="relative flex items-center flex-grow md:flex-none">
                            <select
                                value={sortBy}
                                onChange={(e) => updateSort(e.target.value as SortKey, sortOrder)}
                                className="appearance-none bg-transparent pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 cursor-pointer focus:outline-none"
                            >
                                <option value="id">Neuste</option>
                                <option value="last_cooked">Zuletzt gekocht</option>
                                <option value="frequency">Häufigkeit</option>
                                <option value="rating">Bewertung</option>
                            </select>
                            <div className="absolute right-2 pointer-events-none text-gray-400">
                                <ChevronDown size={14} />
                            </div>
                        </div>

                        <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>

                        <button
                            onClick={() => updateSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 flex items-center justify-center group"
                            title={sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
                        >
                            {sortOrder === 'asc' ? (
                                <ArrowUpWideNarrow size={18} className="group-active:scale-90 transition-transform" />
                            ) : (
                                <ArrowDownWideNarrow size={18} className="group-active:scale-90 transition-transform" />
                            )}
                        </button>
                    </div>
                </div>
                {/* Grid Layout für die Karten */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredAndSortedRecipes.map((recipe) => (
                        <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="group">
                            <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                                <div className="h-48 overflow-hidden">
                                    <img
                                        // Nutzt das Bild aus der DB oder den Platzhalter, wenn image_url leer/null ist
                                        src={recipe.image_url || PLACEHOLDER_IMAGE}
                                        alt={recipe.title}
                                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (target.src !== PLACEHOLDER_IMAGE) {
                                                target.src = PLACEHOLDER_IMAGE;
                                            }
                                        }}
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

                {filteredRecipes.length === 0 && (
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
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [allCookbooks, setAllCookbooks] = useState([]);
    const { token, logout } = useAuth();

    const location = useLocation(); // Hook wovon der User kommt
    const navigate = useNavigate();


    // Bewertung & Notizen States
    const [rating, setRating] = useState(0);
    const [notes, setNotes] = useState("");

    // Prüfen, ob wir eine Information haben, woher der User kam
    const fromPath = location.state?.from || "/";
    const isFromCookbook = fromPath.includes("/cookbook/");
    const isFromImport = fromPath.includes("/import");

    // Always on
    const [isMobile, setIsMobile] = useState(false);
    const [isWakeLockActive, setIsWakeLockActive] = useState(false);
    const [wakeLock, setWakeLock] = useState<any>(null);

    // 1. Prüfen, ob wir auf einem Mobilgerät sind
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 2. Automatisches Re-Locking beim Zurückkehren zum Tab
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                const lock = await (navigator as any).wakeLock.request('screen');
                setWakeLock(lock);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [wakeLock]);

    const toggleWakeLock = async () => {
        if (!('wakeLock' in navigator)) {
            alert("Dein Browser unterstützt das Wachhalten des Bildschirms leider nicht.");
            return;
        }

        try {
            if (!isWakeLockActive) {
                const lock = await (navigator as any).wakeLock.request('screen');
                setWakeLock(lock);
                setIsWakeLockActive(true);
                lock.addEventListener('release', () => setIsWakeLockActive(false));
            } else {
                wakeLock?.release();
                setWakeLock(null);
                setIsWakeLockActive(false);
            }
        } catch (err) {
            console.error("Wake Lock Fehler:", err);
        }
    };


    useEffect(() => {
        const loadRecipe = async () => {
            try {
                const res = await authenticatedFetch(`/api/recipes/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }, logout);

                if (!res.ok) {
                    if (res.status === 404) {
                        console.error("Rezept nicht gefunden");
                        // Optional: Hier könntest du auf eine 404-Seite umleiten
                    }
                    throw new Error("Fehler beim Laden");
                }

                const data = await res.json();
                setRecipe(data);
                setRating(data.rating || 0);
                setNotes(data.notes || "");
            } catch (err) {
                console.error("Error loading recipe:", err);
            }
        };

        // Nur ausführen, wenn ID und Token vorhanden sind
        if (id && token) {
            loadRecipe();
        }
    }, [id, token, logout]);

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

    const saveUpdate = async (fields = {}) => {
        setIsSaving(true);
        try {
            // Logik: Wenn wir im Edit-Mode sind, nehmen wir den gesamten aktuellen State.
            // Wenn nicht (z.B. nur Sterne geklickt), nehmen wir nur die übergebenen 'fields'.
            const payload = isEditing ? {
                title: recipe.title,
                description: recipe.description,
                prep_time: recipe.prep_time,
                cook_time: recipe.cook_time,
                yields: recipe.yields,
                ingredients_str: recipe.ingredients_str,
                instructions: recipe.instructions,
                notes: notes,
                rating: rating
            } : fields;

            await authenticatedFetch(`/api/recipes/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            }, logout);

            // UI-Update: Falls wir im Edit-Mode waren, diesen jetzt schließen
            if (isEditing) setIsEditing(false);

            // Lokalen State synchronisieren
            setRecipe((prev) => {
                if (!prev) return null;
                return { ...prev, ...payload };
            });

        } catch (err) {
            console.error("Fehler beim Speichern:", err);
            alert("Änderungen konnten nicht gespeichert werden.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSaving(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await authenticatedFetch(`/api/recipes/${id}/image`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            }, logout);

            const data = await res.json();
            setRecipe(prev => prev ? { ...prev, image_url: data.image_url } : null);
        } catch (err) {
            console.error("Bild-Upload fehlgeschlagen:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBringClick = async (e: React.MouseEvent) => {
        e.preventDefault();

        try {
            // HIER FEHLTE DAS TOKEN:
            const res = await authenticatedFetch(`/api/recipes/${id}/mark-cooked`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}` // <--- Das muss rein!
                }
            }, logout);

            if (res.ok) {
                const data = await res.json();
                setRecipe(prev => prev ? {
                    ...prev,
                    cook_count: data.cook_count,
                    last_cooked: data.last_cooked
                } : null);
            }
        } catch (err) {
            console.error("Fehler beim Markieren als gekocht:", err);
        } finally {
            window.open(finalBringDeeplink, "_blank", "noopener,noreferrer");
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Möchtest du dieses Rezept wirklich dauerhaft löschen?")) return;

        try {
            const res = await authenticatedFetch(`/api/recipes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }, logout);

            if (res.ok) {
                // Nach dem Löschen zurück zur Übersicht
                navigate('/', { state: { forceRefresh: true } });
            }
        } catch (err) {
            console.error("Fehler beim Löschen:", err);
        }
    };

    // Teilen von Rezepten
    const handleShare = async () => {
        try {
            // 1. Token vom Backend holen
            const response = await authenticatedFetch(`/api/recipes/${id}/share`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }, logout);

            const data = await response.json();
            const shareUrl = `${window.location.origin}/accept-share/${data.share_token}`;

            // 2. Prüfen, ob das Gerät das native Teilen unterstützt (Mobile Standard)
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: recipe.title,
                        text: `Probier mal dieses Rezept aus: ${recipe.title} 🍳`,
                        url: shareUrl,
                    });
                    // Erfolg! Das native Menü wurde geschlossen.
                } catch (shareErr) {
                    // Nutzer hat das Menü abgebrochen, wir machen nichts
                    console.log("Teilen abgebrochen");
                }
            } else {
                // 3. Fallback für Desktop-Browser (Chrome/Firefox am PC)
                await navigator.clipboard.writeText(shareUrl);
                alert("Link wurde in die Zwischenablage kopiert, da dein Browser das Teilen-Menü nicht unterstützt.");
            }
        } catch (err) {
            console.error("Fehler beim Teilen:", err);
        }
    };


    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white max-w-md lg:max-w-3xl w-full rounded-2xl shadow-xl overflow-hidden relative">

                <button
                    onClick={() => navigate(-1)} // Nutzt den Browser-Verlauf inklusive URL-Params
                    className="absolute top-4 left-4 z-10 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm transition flex items-center gap-2"
                >
                    <span>&larr;</span>
                    {isFromImport
                        ? 'Zurück zum Import'
                        : (isFromCookbook ? 'Zurück zum Kochbuch' : 'Alle Rezepte')
                    }
                </button>

                <div className="h-64 relative group overflow-hidden">
                    <img
                        // Wenn image_url null, undefined oder ein leerer String ist, nimm den Platzhalter
                        src={recipe.image_url || PLACEHOLDER_IMAGE}
                        className={`w-full h-full object-cover transition-opacity ${isSaving ? 'opacity-50' : ''}`}
                        alt={recipe.title}
                        onError={(e) => {
                            // Falls der Link in der DB steht, aber das Bild gelöscht wurde (404),
                            // wird hier zur Laufzeit der Platzhalter eingesetzt.
                            const target = e.target as HTMLImageElement;
                            if (target.src !== PLACEHOLDER_IMAGE) {
                                target.src = PLACEHOLDER_IMAGE;
                            }
                        }}
                    />
                    {isEditing && (
                        <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white mb-2" />
                            <span className="text-white text-xs font-bold uppercase">Neues Essensfoto</span>
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpdate} />
                        </label>
                    )}
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4">
                        {isEditing ? (
                            <input
                                className="bg-transparent border-b border-white text-white text-2xl font-bold w-full outline-none py-1"
                                value={recipe.title}
                                onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
                            />
                        ) : (
                            <h1 className="text-white text-2xl font-bold">{recipe.title}</h1>
                        )}
                    </div>
                </div>
                {/* Button-Leiste oben rechts über dem Bild */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">

                    {/* Bearbeiten / Speichern Button */}
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 bg-white/80 hover:bg-blue-50 backdrop-blur-sm text-gray-500 hover:text-blue-600 rounded-full shadow-lg transition-all duration-200 group"
                            title="Rezept bearbeiten"
                        >
                            <Edit2 size={20} className="w-5 h-5" />
                        </button>
                    ) : (
                        <>
                            {/* ABBRECHEN - Erscheint links vom Speichern-Button */}
                            <button
                                onClick={() => setIsEditing(false)}
                                className="p-2 bg-white/80 hover:bg-orange-50 backdrop-blur-sm text-gray-500 hover:text-orange-600 rounded-full shadow-lg transition-all duration-200"
                                title="Abbrechen"
                            >
                                <X size={20} className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => saveUpdate()}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-all duration-200 font-bold text-sm"
                            >
                                <Check size={20} className="w-5 h-5" />
                                Speichern
                            </button>
                        </>
                    )}

                    {/* Teilen-Button */}
                    <button
                        onClick={handleShare}
                        className="p-2 bg-white/80 hover:bg-blue-50 backdrop-blur-sm text-gray-500 hover:text-blue-600 rounded-full shadow-lg transition-all duration-200 group"
                        title="Rezept teilen"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                            />
                        </svg>
                    </button>

                    {/* Löschen-Button */}
                    <button
                        onClick={handleDelete}
                        className="p-2 bg-white/80 hover:bg-red-50 backdrop-blur-sm text-gray-500 hover:text-red-600 rounded-full shadow-lg transition-all duration-200 group"
                        title="Rezept löschen"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {recipe.last_cooked && (
                        <p className="text-xs text-gray-400 mb-4">
                            Zuletzt gekocht am {new Date(recipe.last_cooked).toLocaleDateString('de-DE')}
                        </p>
                    )}
                    {/* Beschreibung */}
                    <div className="mb-6">
                        {isEditing ? (
                            <div className="flex flex-col">
                                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">
                                    Beschreibung
                                </label>
                                <textarea
                                    className="w-full p-3 text-sm text-gray-600 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none transition-all resize-none"
                                    rows={3}
                                    value={recipe.description || ""}
                                    onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                                    placeholder="Beschreibe dein Rezept..."
                                />
                            </div>
                        ) : (
                            <p className="text-gray-600 leading-relaxed italic-none">
                                {recipe.description || "Keine Beschreibung vorhanden."}
                            </p>
                        )}
                    </div>
                    <CookbookSelector
                        recipeId={recipe.id}
                        currentCookbooks={recipe.cookbooks || []}
                    />
                    {/* Info-Leiste (Vorbereitung, Kochen, Menge) */}
                    <div className="
                            flex flex-wrap gap-x-8 gap-y-4 
                            mb-4 border-b pb-4
                        ">
                        <EditableInfo icon={<TimerIcon className="w-5 h-5" />} label="Vorbereitung" value={recipe.prep_time} suffix="Min." isEditing={isEditing} onChange={(v) => setRecipe({ ...recipe, prep_time: v })} color="gray" />
                        <EditableInfo icon={<FireIcon className="w-5 h-5" />} label="Kochen" value={recipe.cook_time} suffix="Min." isEditing={isEditing} onChange={(v) => setRecipe({ ...recipe, cook_time: v })} color="orange" />
                        <EditableInfo icon={<UsersIcon className="w-5 h-5" />} label="Menge" value={recipe.yields} suffix="Port." isEditing={isEditing} onChange={(v) => setRecipe({ ...recipe, yields: v })} color="blue" />

                        {/* Sterne Bewertung */}
                        <div className="flex items-center gap-2 w-full mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => { setRating(star); if (!isEditing) saveUpdate({ rating: star }); }} className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                            ))}
                            <span className="text-sm text-gray-400 ml-2">({recipe.cook_count}x gekocht)</span>
                        </div>
                        {/* Notizen Bereich */}
                        <div className="mb-8 w-full">
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Persönliche Notizen</p>
                            <textarea
                                className="w-full p-3 text-sm rounded-lg border bg-gray-50 border-gray-200 focus:bg-white outline-none resize-none transition-all"
                                rows={Math.max(2, notes.split('\n').length)}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                onBlur={() => !isEditing && saveUpdate({ notes })}
                                placeholder="Notizen hinzufügen..."
                            />
                        </div>
                    </div>
                    <div className="
                        flex flex-col gap-2 
                        lg:flex-row lg:justify-between lg:items-center 
                        mb-4 border-b pb-4
                    ">
                        <h2 className="font-bold text-lg">Zutaten</h2>

                        <div className="w-full lg:w-auto flex justify-start">
                            <button
                                onClick={handleBringClick}
                                className="bring-recipe-button w-auto flex items-center gap-2 cursor-pointer"
                            >
                                <img
                                    src="data:image/svg+xml,%3csvg%20width='18'%20height='25'%20viewBox='0%200%2018%2025'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M11.5419%204.43201L13.1396%204.35939C13.1396%204.35939%2013.1396%202.61644%2012.9944%202.4712C12.8491%202.25333%2011.8324%201.16399%2011.1788%200.94612C10.5978%200.873497%209.36321%201.30923%209.14534%201.38186C9.14534%201.38186%209.07272%201.38186%209.07272%201.45448C8.92748%201.67235%208.20125%202.68907%208.12863%203.1248C7.98338%203.41529%207.83813%204.50463%207.83813%204.50463H8.56436H9.0001C9.0001%204.50463%209.14534%202.76169%209.07272%202.68907C9.72633%202.61644%2010.6704%202.39858%2011.1062%202.54382C11.324%202.54382%2011.5419%204.43201%2011.5419%204.43201Z'%20fill='white'/%3e%3cpath%20d='M3.98901%204.64975L5.29622%204.57713C5.29622%204.57713%205.2236%202.83418%205.51409%202.47107C6.02245%202.2532%206.45819%202.18058%206.89392%202.10795C7.32966%202.10795%208.34638%201.96271%208.34638%202.18058C8.419%202.39845%208.49162%203.56041%208.49162%204.43188C9.72621%204.43188%209.72621%204.43188%209.72621%204.43188L9.43572%201.96271C9.43572%201.96271%208.49162%200.582877%208.12851%200.510254C7.91064%200.510254%207.54753%200.510254%206.74868%200.728122C5.94983%200.945991%205.58671%201.09124%205.58671%201.09124%205.15098%201.3091%204.71524%202.03533C4.20688%202.68894%204.13426%202.83418%204.13426%202.83418C4.13426%202.83418%203.98901%203.8509%203.98901%204.64975Z'%20fill='white'/%3e%3cpath%20d='M0.140011%2022.2971C0.140011%2022.2971%200.64837%2022.5876%201.59247%2022.8054C2.53656%2023.0233%2012.6311%2024.9841%2013.43%2024.4031C13.43%2023.3138%2013.0669%204.28662%2013.0669%204.28662C13.0669%204.28662%201.3746%204.43187%200.93886%204.72236C0.93886%204.72236%200.866238%204.79498%200.793616%204.94023C0.720993%205.08547%200.64837%205.37596%200.64837%205.66645C0.575747%207.4094%200.430501%2011.1132%200.285256%2014.5991C0.0673876%2018.5207%20-0.15048%2022.0792%200.140011%2022.2971Z'%20fill='white'/%3e%3cpath%20d='M13.4299%2024.4031C13.4299%2024.4031%2017.2063%2021.9339%2017.4241%2021.2803C17.3515%2020.1184%2016.9158%204.72236%2016.48%204.64973C16.0443%204.43187%2013.0668%204.28662%2013.0668%204.28662L13.4299%2024.4031Z'%20fill='%234FABA2'/%3e%3cpath%20d='M3.3354%2012.6381L5.65933%2014.381L10.0167%208.78906L11.6144%2010.1689L5.80457%2017.7217L1.95557%2014.3084L3.3354%2012.6381Z'%20fill='%2324A599'/%3e%3c/svg%3e"
                                    alt="Bring! Logo"
                                    className="w-4 h-4"
                                />
                                <span>Auf die Einkaufsliste setzen</span>
                            </button>
                        </div>
                    </div>

                    {isEditing ? (
                        <textarea
                            className="w-full p-3 border rounded-xl text-sm h-64 bg-gray-50 outline-none focus:bg-white"
                            // Wir zeigen dem User Zeilenumbrüche beim Bearbeiten
                            value={recipe.ingredients_str?.split('|').join('\n')}
                            onChange={(e) => setRecipe({ ...recipe, ingredients_str: e.target.value.split('\n').join('|') })}
                        />
                    ) : (
                        <ul className="space-y-2">
                            {/* WICHTIG: Hier splitten wir den String wieder für die Anzeige auf */}
                            {recipe.ingredients_str?.split('|')
                                .filter(ing => ing.trim() !== '') // Verhindert leere Zeilen
                                .map((ing, i) => (
                                    <li key={i} className="flex items-center text-gray-700 text-sm">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3"></span>
                                        {ing}
                                    </li>
                                ))
                            }
                        </ul>
                    )}

                    <h2 className="font-bold text-lg mb-4 pt-4 border-t">Anweisungen</h2>


                    <div className="space-y-4">
                        {/* Wir splitten den Text bei \n\n (die Absatztrennung aus dem Backend) 
            und rendern jeden Teil als einen eigenen Absatz oder Schritt. */}
                        {isEditing ? (
                            <textarea
                                className="w-full p-3 border border-gray-200 rounded-xl text-sm h-64 bg-gray-50 outline-none focus:bg-white"
                                value={recipe.instructions}
                                onChange={(e) => setRecipe({ ...recipe, instructions: e.target.value })}
                            />
                        ) : (
                            <div className="space-y-4">
                                {recipe.instructions.split('\n\n').filter(s => s.trim()).map((step, i) => (
                                    <div key={i} className="flex items-start">
                                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 text-xs font-bold rounded-full mr-3 mt-1">{i + 1}</div>
                                        <p className="text-gray-700 text-sm leading-relaxed">{step}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {isMobile && (
                        <div className="fixed bottom-6 right-6 z-50">
                            <button
                                onClick={toggleWakeLock}
                                className={`
                relative flex items-center justify-center w-11 h-11 rounded-full shadow-lg transition-all duration-200
                ${isWakeLockActive
                                        ? 'bg-yellow-400 text-yellow-900 shadow-yellow-200/50 ring-2 ring-yellow-300'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 shadow-black/20'}
            `}
                            >
                                {isWakeLockActive ? (
                                    // Minimalistische Glühbirne (An)
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18.75a.75.75 0 0 1 .75.75V21.75a.75.75 0 0 1-1.5 0V19.5a.75.75 0 0 1 .75-.75ZM4.106 17.834a.75.75 0 0 0 1.06 1.06l1.59-1.591a.75.75 0 0 0-1.061-1.06l-1.59 1.591ZM2.25 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75ZM6.166 5.106a.75.75 0 0 0-1.06 1.06l1.591 1.59a.75.75 0 0 0 1.06-1.06l-1.591-1.59Z" />
                                    </svg>
                                ) : (
                                    // Mond-Icon für "Ruhezustand erlaubt"
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 1 1-13.236-13.235.75.75 0 0 1 .82.163Z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
// --- UNTERKOMPONENTE: EDITIERBARE INFO ---
function EditableInfo({ icon, label, value, suffix, isEditing, onChange, color }: { icon: JSX.Element; label: string; value: number; suffix: string; isEditing: boolean; onChange: (value: any) => void; color: "gray" | "orange" | "blue" }) {
    const colors = {
        gray: "bg-gray-50 text-gray-500",
        orange: "bg-orange-50 text-orange-500",
        blue: "bg-blue-50 text-blue-500"
    };
    return (
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
            <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{label}</p>
                {isEditing ? (
                    <div className="flex items-center gap-1 border-b border-gray-300">
                        <input className="text-sm font-semibold text-gray-700 w-12 bg-transparent outline-none" value={value} onChange={(e) => onChange(e.target.value)} />
                        <span className="text-xs text-gray-400">{suffix}</span>
                    </div>
                ) : (
                    <p className="text-sm font-semibold text-gray-700">{value || 0} {suffix}</p>
                )}
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
                    <Route path="/cookbooks" element={
                        <ProtectedRoute><CookbookList /></ProtectedRoute>
                    } />
                    <Route path="/cookbook/:id" element={
                        <ProtectedRoute><CookbookDetail /></ProtectedRoute>
                    } />
                    <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
                    <Route path="/accept-share/:token" element={<AcceptShare />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

