import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Cookbook } from './App';
import { authenticatedFetch } from './api';
import Header, { SubNav } from './Header';

export default function CookbookList() {
    const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
    const [newName, setNewName] = useState("");
    const { token, logout } = useAuth();

    const fetchCookbooks = async () => {
        try {
            const response = await authenticatedFetch('/api/cookbooks', {
                headers: { 'Authorization': `Bearer ${token}` }
            }, logout);

            const data = await response.json();
            setCookbooks(data);
        } catch (err) {
            console.error("Fehler beim Laden der Kochbücher:", err);
        }
    };

    // Initiales Laden
    useEffect(() => {
        if (token) {
            fetchCookbooks();
        }
    }, [token, logout]);

    // Beispiel für Erstellen mit authenticatedFetch
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;

        try {
            const response = await authenticatedFetch('/api/cookbooks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName })
            }, logout);

            if (response.ok) {
                const createdCookbook = await response.json(); // Der Server sollte das neue Objekt inkl. ID zurückgeben

                // Lokalen State sofort aktualisieren
                setCookbooks(prev => [...prev, createdCookbook]);
                setNewName(""); // Eingabefeld leeren
            }
        } catch (err) {
            console.error("Fehler beim Erstellen:", err);
        }
    };

    // Beispiel für Löschen mit authenticatedFetch
    const handleDelete = async (id: number) => {
        if (!confirm("Kochbuch wirklich löschen?")) return;

        try {
            const response = await authenticatedFetch(`/api/cookbooks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }, logout);

            if (response.ok) {
                // OPTIMISTISCHES UPDATE: 
                // Wir filtern das gelöschte Kochbuch sofort aus dem lokalen State heraus.
                setCookbooks(prev => prev.filter(cb => cb.id !== id));

                // fetchCookbooks(); // Optional: Kannst du zur Sicherheit trotzdem aufrufen
            } else {
                alert("Fehler beim Löschen auf dem Server.");
            }
        } catch (err) {
            console.error("Fehler beim Löschen:", err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* OBERER BEREICH: Header und Nav */}
            <div className="bg-gray-100 border-b border-gray-200 pt-8 pb-4">
                <div className="max-w-6xl mx-auto px-4 md:px-8">
                    <Header />
                    <SubNav />
                </div>
            </div>

            {/* UNTERER BEREICH: Grauer Hintergrund für Content */}
            <div className="max-w-6xl mx-auto p-4 md:p-8">

                {/* AKTIONEN: Erstellen-Bereich */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h2 className="text-xl font-bold text-gray-800">📖 Deine Kochbücher</h2>

                    <div className="flex gap-2 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Neues Kochbuch Name..."
                            className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button
                            onClick={handleCreate}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition shadow-md active:scale-95"
                        >
                            Erstellen
                        </button>
                    </div>
                </div>

                {/* GRID: Die Kochbuch-Karten */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {cookbooks.map((cb) => (
                        <div key={cb.id} className="group relative">
                            {/* WICHTIG: Hier muss /cookbook/ (Singular) stehen, wenn das dein funktionierender Pfad war */}
                            <Link to={`/cookbook/${cb.id}`}>
                                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition duration-300 transform hover:-translate-y-1 h-40 flex flex-col justify-center items-center border border-transparent hover:border-green-200">
                                    <div className="text-3xl mb-3">📖</div>
                                    <h2 className="text-xl font-bold text-gray-800">{cb.name}</h2>
                                    {/* Anzeige der Anzahl - setzt joinedload im Backend voraus */}
                                    <p className="text-gray-500 text-sm mt-1">
                                        {cb.recipes ? `${cb.recipes.length} Rezepte` : "0 Rezepte"}
                                    </p>
                                </div>
                            </Link>

                            {/* Lösch-Button */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault(); // Verhindert, dass der Link ausgelöst wird
                                    handleDelete(cb.id);
                                }}
                                className="absolute top-3 right-3 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <button className="w-4 h-4">
                                    🗑️
                                </button>
                            </button>
                        </div>
                    ))}
                </div>

                {cookbooks.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500">Du hast noch keine Kochbücher. Erstelle eins oben rechts!</p>
                    </div>
                )}
            </div>
        </div>
    );
}