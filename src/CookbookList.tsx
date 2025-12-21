import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Cookbook } from './App';
import { authenticatedFetch } from './api';

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
            await authenticatedFetch('/api/cookbooks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName })
            }, logout);

            setNewName("");
            fetchCookbooks(); // Liste aktualisieren
        } catch (err) {
            console.error("Fehler beim Erstellen:", err);
        }
    };

    // Beispiel für Löschen mit authenticatedFetch
    const handleDelete = async (id: number) => {
        if (!confirm("Kochbuch wirklich löschen?")) return;

        try {
            await authenticatedFetch(`/api/cookbooks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }, logout);

            fetchCookbooks(); // Liste aktualisieren
        } catch (err) {
            console.error("Fehler beim Löschen:", err);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Link to="/" className="text-green-600 hover:underline mb-4 block">← Zurück zu allen Rezepten</Link>
            <h1 className="text-3xl font-bold mb-8">Meine Kochbücher</h1>

            <form onSubmit={handleCreate} className="flex gap-2 mb-8">
                <input
                    className="border p-2 rounded flex-grow"
                    placeholder="Neues Kochbuch Name..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <button className="bg-green-600 text-white px-4 py-2 rounded">Erstellen</button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cookbooks.map(cb => (
                    <div key={cb.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                        <Link to={`/cookbook/${cb.id}`} className="text-xl font-semibold hover:text-green-600">
                            📖 {cb.name}
                        </Link>
                        <button onClick={() => handleDelete(cb.id)} className="text-red-500 hover:text-red-700">Löschen</button>
                    </div>
                ))}
            </div>
        </div>
    );
}