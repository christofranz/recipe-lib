import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Cookbook } from './App';
import { authenticatedFetch } from './api';


export default function CookbookDetail() {
    const { id } = useParams();
    const [cookbook, setCookbook] = useState<Cookbook | null>(null);
    const { token, logout } = useAuth();

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
            }
        };

        if (token && id) {
            loadCookbookData();
        }
    }, [id, token, logout]);

    if (!cookbook) return <div className="p-8">Lädt...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <Link to="/cookbooks" className="text-green-600 hover:underline mb-4 block">← Zurück zur Übersicht</Link>
            <h1 className="text-3xl font-bold mb-8">Kochbuch: {cookbook.name}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {cookbook.recipes?.map(r => (
                    <Link key={r.id} to={`/recipe/${r.id}`} className="bg-white rounded shadow overflow-hidden">
                        <img src={r.image_url} alt={r.title} className="w-full h-48 object-cover" />
                        <div className="p-4"><h2 className="font-bold">{r.title}</h2></div>
                    </Link>
                ))}
            </div>
            {cookbook.recipes?.length === 0 && <p className="text-gray-500">Noch keine Rezepte in diesem Kochbuch.</p>}
        </div>
    );
}