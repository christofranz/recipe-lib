import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Cookbook } from './App';
import { authenticatedFetch } from './api';
import Header from './Header';

export default function ImportPage() {
    const [importUrl, setImportUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);   // Speziell für das Foto-KI-Overlay
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

    // Ref für den AbortController
    const abortControllerRef = useRef<AbortController | null>(null);

    // image import via upload
    const handlePhotoImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setIsScanning(true); // Das Overlay wird jetzt eingeblendet

        // abort controller
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // FormData erstellen
        const formData = new FormData();
        formData.append('file', file);

        // HIER: Die aktuell ausgewählten Kochbuch-IDs mitschicken
        // Wir senden es als JSON-String, damit das Backend es leicht verarbeiten kann
        formData.append('cookbook_ids', JSON.stringify(selectedCookbookIds));

        try {
            const response = await authenticatedFetch('/api/import/photo', {
                method: 'POST',
                signal: controller.signal, // HIER das Signal übergeben
                headers: {
                    // 'Content-Type' NICHT setzen bei FormData!
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            }, logout);

            if (!response.ok) {
                const err = await response.json();
                alert("Fehler beim Scan: " + (err.detail || "Unbekannter Fehler"));
                setIsImporting(false);
                setIsScanning(false); // Overlay aus
                return;
            }

            const data = await response.json();
            navigate(`/recipe/${data.id}`);

        } catch (error) {
            // PRÜFUNG: Wenn der Fehler durch .abort() ausgelöst wurde, tu nichts (oder logge es nur)
            if (error instanceof Error && error.name === 'AbortError') {
                console.log("Import vom User gestoppt.");
                return; // Funktion verlassen, kein Alert
            }
            if (!(error instanceof Error) || error.message !== "Session abgelaufen") {
                console.error(error);
                alert("Netzwerkfehler beim Hochladen.");
            }
            setIsImporting(false);
            setIsScanning(false); // Overlay aus
        }
    };

    // Die Funktion für den Button
    const cancelImport = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // Stoppt den HTTP-Request
            setIsImporting(false);
        }
    };

    // 1. Definiere kleine Status-Texte
    const loadingSteps = [
        "Bild wird übertragen...",
        "KI liest das Kochbuch...",
        "Zutaten werden sortiert...",
        "Fast fertig..."
    ];

    // 2. In deiner Komponente
    const [loadingStep, setLoadingStep] = useState(0);

    // Effekt, der die Texte während des Ladens durchwechselt
    useEffect(() => {
        let interval: number;
        if (isImporting) {
            interval = setInterval(() => {
                setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
            }, 4000);
        } else {
            setLoadingStep(0);
        }
        return () => clearInterval(interval);
    }, [isImporting]);

    return (

        <div className="min-h-screen bg-gray-100 p-8">
            {/* 1. DAS LADE-OVERLAY (Wird nur angezeigt, wenn isImporting true ist) */}
            {isScanning && (
                <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center">
                    <div className="relative w-32 h-32 mb-8">
                        {/* Pulsierender Hintergrund */}
                        <div className="absolute inset-0 bg-blue-100 rounded-3xl animate-pulse"></div>

                        {/* Scanner-Animation */}
                        <div className="absolute inset-4 border-2 border-blue-500 rounded-2xl overflow-hidden">
                            <div className="w-full h-full bg-blue-50/50 flex items-center justify-center text-5xl">
                                📖
                            </div>
                            {/* Der Laser-Balken */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,1)] animate-scan-line"></div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {loadingSteps[loadingStep]}
                        </h3>
                        <p className="text-gray-500 max-w-[250px] mx-auto">
                            Unsere KI digitalisiert gerade dein Kochbuch-Foto.
                        </p>
                    </div>

                    {/* Ein kleiner Fortschrittsbalken unten */}
                    <div className="mt-8 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-500 ease-out"
                            style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                        ></div>
                    </div>
                    <div className="mt-12 flex flex-col items-center gap-4">
                        <button
                            onClick={cancelImport}
                            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-sm font-bold transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Abbrechen
                        </button>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                            KI Analyse kann bis zu 1 min dauern je nach Bildqualität.
                        </p>
                    </div>
                </div>
            )}
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-1">Rezept hinzufügen</h2>
                        <p className="text-gray-500 mb-8 text-sm">Importiere via Link oder scanne ein Kochbuch-Foto.</p>

                        {/* Kochbuch-Auswahl steht jetzt oben drüber, da sie für BEIDE gilt */}
                        <div className="mb-8 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                            <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-4 font-bold">
                                Ziel-Kochbücher auswählen
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
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* LINKS: URL IMPORT */}
                            <form onSubmit={handleImport} className="space-y-4 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">🔗 Link Import</h3>
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white outline-none"
                                    value={importUrl}
                                    onChange={(e) => setImportUrl(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={isImporting || !importUrl}
                                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:bg-gray-300"
                                >
                                    {isImporting ? 'Lädt...' : 'URL Importieren'}
                                </button>
                            </form>

                            {/* RECHTS: FOTO IMPORT */}
                            <div className="space-y-4 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col justify-between">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">📸 Foto Scan</h3>
                                <p className="text-xs text-gray-500">Fotografiere ein Rezept aus einem Buch.</p>
                                <label className={`
                cursor-pointer px-6 py-3 rounded-xl font-bold text-center transition-all
                ${isImporting ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white'}
            `}>
                                    {isImporting ? 'KI analysiert...' : 'Foto aufnehmen'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handlePhotoImport}
                                        disabled={isImporting}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    </div> {/* Ende p-8 */}
                </div> {/* Ende der Card */}
            </div> {/* Ende max-w-6xl */}
        </div>
    );
}