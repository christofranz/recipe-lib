import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Cookbook } from './App';
import { authenticatedFetch } from './api';

export default function CookbookSelector({ recipeId, currentCookbooks }: { recipeId: number, currentCookbooks: Cookbook[] }) {
    const [allCookbooks, setAllCookbooks] = useState<Cookbook[]>([]);
    const [userCookbooks, setUserCookbooks] = useState<Cookbook[]>(currentCookbooks);
    const { token, logout } = useAuth();

    // 1. Verfügbare Kochbücher laden
    useEffect(() => {
        const loadCookbooks = async () => {
            try {
                const response = await authenticatedFetch('/api/cookbooks', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }, logout);

                const data = await response.json();
                setAllCookbooks(data);
            } catch (err) {
                console.error("Fehler beim Laden der Kochbücher:", err);
            }
        };

        if (token) {
            loadCookbooks();
        }
    }, [token, logout]);

    // 2. Rezept einem Kochbuch hinzufügen oder daraus entfernen
    const toggleRecipe = async (cbId: number) => {
        const isMember = userCookbooks.some(c => c.id === cbId);
        const method = isMember ? 'DELETE' : 'POST';

        try {
            const res = await authenticatedFetch(`/api/cookbooks/${cbId}/recipes/${recipeId}`, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` }
            }, logout);

            if (res.ok) {
                if (isMember) {
                    // Aus lokalem State entfernen
                    setUserCookbooks(userCookbooks.filter(c => c.id !== cbId));
                } else {
                    // Zum lokalen State hinzufügen
                    const addedCb = allCookbooks.find(c => c.id === cbId);
                    if (addedCb) setUserCookbooks([...userCookbooks, addedCb]);
                }
            }
        } catch (err) {
            console.error("Fehler beim Aktualisieren des Kochbuchs:", err);
        }
    };

    return (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-3">In Kochbüchern gespeichert:</h3>
            <div className="flex flex-wrap gap-2">
                {allCookbooks.map(cb => {
                    const active = userCookbooks.some(c => c.id === cb.id);
                    return (
                        <button
                            key={cb.id}
                            onClick={() => toggleRecipe(cb.id)}
                            className={`px-4 py-1 rounded-full text-sm transition ${active ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {cb.name} {active ? '✓' : '+'}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}