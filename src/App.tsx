import { useEffect, useState } from 'react';

interface Recipe {
    title: string;
    description: string;
    image_url: string;
    ingredients: string[];
    instructions: string;
}

export default function App() {
    const [recipe, setRecipe] = useState<Recipe | null>(null);

    useEffect(() => {
        // 1. DATENABRUF: Holt das Rezept vom Backend
        fetch('/api/recipe')
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => setRecipe(data))
            .catch(err => {
                console.error("Error fetching recipe:", err);
                // Optional: setRecipe auf leeres Objekt setzen, um Fehlermeldung anzuzeigen
            });

    }, []);

    if (!recipe) return <div className="p-10 text-center text-xl">Loading from Database...</div>;

    // Die URL, die Bring! crawlen soll: Unsere serverseitig gerenderte Schema-Seite
    const recipeSourceUrl = window.location.hostname === 'localhost'
        ? encodeURIComponent('http://127.0.0.1:8000/r/1')
        : encodeURIComponent(`${window.location.origin}/r/1`);

    // Die Basis-API-URL für Bring!
    const bringDeeplinkBase = "https://api.getbring.com/rest/bringrecipes/deeplink";

    // Der vollständige Deep-Link
    const finalBringDeeplink = `${bringDeeplinkBase}?url=${recipeSourceUrl}&source=web&baseQuantity=4&requestedQuantity=4`;

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
                <div className="h-64 relative">
                    <img src={recipe.image_url} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4">
                        <h1 className="text-white text-2xl font-bold">{recipe.title}</h1>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-gray-600 mb-6">{recipe.description}</p>

                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <h2 className="font-bold text-lg">Ingredients</h2>
                        {/* NEU: Der Button ist ein einfacher Deep-Link */}
                        <div style={{ display: 'flex' }}>
                            <a
                                href={finalBringDeeplink} // ZIEL: Bring! API
                                target="_blank" // Wichtig: Öffnet in einem neuen Tab/App
                                rel="nofollow noopener"
                                className="bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold uppercase shadow hover:bg-red-700 transition duration-300"
                            >
                                Add to Bring!
                            </a>
                        </div>
                    </div>

                    <ul className="mb-6 space-y-2">
                        {recipe.ingredients.map((ing, i) => (
                            <li key={i} className="flex items-center text-gray-700">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>{ing}
                            </li>
                        ))}
                    </ul>

                    <h2 className="font-bold text-lg mb-2">Instructions</h2>
                    <div className="text-gray-600 whitespace-pre-wrap">{recipe.instructions}</div>
                </div>
            </div>
        </div>
    );
}