import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Cookbook } from './App';
import { authenticatedFetch } from './api';
import Header from './Header';

export default function ImportPage() {
    const [importUrl, setImportUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
    const [selectedCookbookIds, setSelectedCookbookIds] = useState<number[]>([]);

    const { token, logout } = useAuth();
    const navigate = useNavigate();

    // Konsistentes Laden der Kochbücher für die Auswahl
    useEffect(() => {
        const fetchCookbooks = async () => {
            try {
                const response = await authenticatedFetch('/api/cookbooks', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }, logout);
                if (response.ok) {
                    const data = await response.json();
                    setCookbooks(data);
                }
            } catch (err) {
                console.error("Fehler beim Laden der Kochbücher:", err);
            }
        };
        if (token) fetchCookbooks();
    }, [token, logout]);

    // Deine toggleSelection Logik
    const toggleSelection = (id: number) => {
        setSelectedCookbookIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Deine handleImport Logik mit Redirect auf das neue Rezept
    const handleImport = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!importUrl) return;
        setIsImporting(true);

        try {
            const response = await authenticatedFetch('/api/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url: importUrl, cookbook_ids: selectedCookbookIds })
            }, logout);

            if (!response.ok) {
                const err = await response.json();
                alert("Fehler beim Import: " + (err.detail || "Unbekannter Fehler"));
                setIsImporting(false);
                return;
            }

            const data = await response.json();
            // Navigiert direkt zum neu erstellten Rezept
            navigate(`/recipe/${data.id}`);

        } catch (error) {
            if (!(error instanceof Error) || error.message !== "Session abgelaufen") {
                console.error(error);
                alert("Netzwerkfehler beim Importieren.");
            }
            setIsImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <Header />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <nav className="flex gap-4 mt-2">
                            <Link to="/" className="text-gray-500 hover:text-green-600 transition font-medium pb-1">
                                🏠 Rezepte
                            </Link>
                            <Link to="/cookbooks" className="text-gray-500 hover:text-green-600 transition font-medium pb-1">
                                📖 Kochbücher
                            </Link>
                            <span className="text-green-700 font-bold border-b-2 border-green-600 pb-1 cursor-default">
                                📥 Import
                            </span>
                        </nav>
                    </div>
                </div>

                <hr className="mb-3 border-gray-200" />

                {/* ZENTRALE IMPORT CARD */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-1">Rezept importieren</h2>
                        <p className="text-gray-500 mb-8 text-sm">Unterstützt Chefkoch, Techniker Krankenkasse und mehr.</p>

                        {/* NUR EIN FORM TAG HIER */}
                        <form onSubmit={handleImport} className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                            {/* LINKE SPALTE: URL Eingabe */}
                            <div className="lg:col-span-7 space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                        Rezept Link
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="text"
                                            placeholder="https://www.chefkoch.de/rezepte/..."
                                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
                                            value={importUrl}
                                            onChange={(e) => setImportUrl(e.target.value)}
                                        />
                                        <button
                                            type="submit"
                                            disabled={isImporting || !importUrl}
                                            className={`px-8 py-3 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 ${isImporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:shadow-green-200'
                                                }`}
                                        >
                                            {isImporting ? 'Importiert...' : 'Import'}
                                        </button>
                                    </div>
                                </div>

                            </div>

                            {/* RECHTE SPALTE: Kochbuch Auswahl */}
                            <div className="lg:col-span-5 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-4 font-bold">
                                    In Kochbücher einsortieren
                                </span>

                                {cookbooks.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {cookbooks.map(cb => {
                                            const active = selectedCookbookIds.includes(cb.id);
                                            return (
                                                <button
                                                    key={cb.id}
                                                    type="button"
                                                    onClick={() => toggleSelection(cb.id)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${active
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                                                        : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                                                        }`}
                                                >
                                                    {cb.name} {active ? '✓' : '+'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Noch keine Kochbücher erstellt.</p>
                                )}
                            </div>
                        </form> {/* Ende des Formulars */}
                    </div> {/* Ende p-8 */}
                </div> {/* Ende der Card */}
            </div> {/* Ende max-w-6xl */}
        </div>
    );
}