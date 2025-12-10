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
                        <div style={{ display: 'flex' }}>
                            <a
                                href={finalBringDeeplink}
                                target="_blank"
                                rel="nofollow noopener"
                                // 🎨 Tailwind Klassen für den Bring! Look (grün/weiß)
                                className="bg-[#4FABA2] text-white px-4 py-2 rounded-full text-xs font-bold uppercase shadow-md hover:bg-[#3E958B] transition duration-300 flex items-center"
                            >
                                {/* 📝 BRING! LOGO SVG (Minimalistische Version des Icons) */}
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 18 25"
                                    fill="white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4 mr-2"
                                >
                                    <path d="M11.5419 4.43201L13.1396 4.35939C13.1396 4.35939 13.1396 2.61644 12.9944 2.4712C12.8491 2.25333 11.8324 1.16399 11.1788 0.94612C10.5978 0.873497 9.36321 1.30923 9.14534 1.38186C9.14534 1.38186 9.07272 1.38186 9.07272 1.45448C8.92748 1.67235 8.20125 2.68907 8.12863 3.1248C7.98338 3.41529 7.83813 4.50463 7.83813 4.50463H8.56436H9.0001C9.0001 4.50463 9.14534 2.76169 9.07272 2.68907C9.72633 2.61644 10.6704 2.39858 11.1062 2.54382C11.324 2.54382 11.5419 4.43201 11.5419 4.43201Z" />
                                    <path d="M3.98901 4.64975L5.29622 4.57713C5.29622 4.57713 5.2236 2.83418 5.51409 2.47107C6.02245 2.2532 6.45819 2.18058 6.89392 2.10795C7.32966 2.10795 8.34638 1.96271 8.34638 2.18058C8.419 2.39845 8.49162 3.56041 8.49162 4.43188C9.72621 4.43188 9.72621 4.43188 9.72621 4.43188L9.43572 1.96271C9.43572 1.96271 8.49162 0.582877 8.12851 0.510254C7.91064 0.510254 7.54753 0.510254 6.74868 0.728122C5.94983 0.945991 5.58671 1.09124 5.58671 1.09124C5.58671 1.09124 5.15098 1.3091 4.71524 2.03533C4.20688 2.68894 4.13426 2.83418 4.13426 2.83418C4.13426 2.83418 3.98901 3.8509 3.98901 4.64975Z" />
                                    <path d="M0.140011 22.2971C0.140011 22.2971 0.64837 22.5876 1.59247 22.8054C2.53656 23.0233 12.6311 24.9841 13.43 24.4031C13.43 23.3138 13.0669 4.28662 13.0669 4.28662C13.0669 4.28662 1.3746 4.43187 0.93886 4.72236C0.93886 4.72236 0.866238 4.79498 0.793616 4.94023C0.720993 5.08547 0.64837 5.37596 0.64837 5.66645C0.575747 7.4094 0.430501 11.1132 0.285256 14.5991C0.0673876 18.5207 -0.15048 22.0792 0.140011 22.2971Z" />
                                    <path d="M13.4299 24.4031C13.4299 24.4031 17.2063 21.9339 17.4241 21.2803C17.3515 20.1184 16.9158 4.72236 16.48 4.64973C16.0443 4.43187 13.0668 4.28662 13.0668 4.28662L13.4299 24.4031Z" fill="#24A599" />
                                    <path d="M3.3354 12.6381L5.65933 14.381L10.0167 8.78906L11.6144 10.1689L5.80457 17.7217L1.95557 14.3084L3.3354 12.6381Z" fill="#24A599" />
                                </svg>

                                Auf die Einkaufsliste setzen
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