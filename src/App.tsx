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

                    {/* 1. CONTAINER: Hält H2 (Ingredients) und den Button NEBENEINANDER */}
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <h2 className="font-bold text-lg">Zutaten</h2>

                        {/* Button-Container (Bring!) */}
                        <div className="flex justify-start">
                            <a
                                href={finalBringDeeplink}
                                target="_blank"
                                rel="nofollow noopener"
                                className="bring-recipe-button" // Button-Klasse
                            >
                                <img
                                    src="data:image/svg+xml,%3csvg%20width='18'%20height='25'%20viewBox='0%200%2018%2025'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M11.5419%204.43201L13.1396%204.35939C13.1396%204.35939%2013.1396%202.61644%2012.9944%202.4712C12.8491%202.25333%2011.8324%201.16399%2011.1788%200.94612C10.5978%200.873497%209.36321%201.30923%209.14534%201.38186C9.14534%201.38186%209.07272%201.38186%209.07272%201.45448C8.92748%201.67235%208.20125%202.68907%208.12863%203.1248C7.98338%203.41529%207.83813%204.50463%207.83813%204.50463H8.56436H9.0001C9.0001%204.50463%209.14534%202.76169%209.07272%202.68907C9.72633%202.61644%2010.6704%202.39858%2011.1062%202.54382C11.324%202.54382%2011.5419%204.43201%2011.5419%204.43201Z'%20fill='white'/%3e%3cpath%20d='M3.98901%204.64975L5.29622%204.57713C5.29622%204.57713%205.2236%202.83418%205.51409%202.47107C6.02245%202.2532%206.45819%202.18058%206.89392%202.10795C7.32966%202.10795%208.34638%201.96271%208.34638%202.18058C8.419%202.39845%208.49162%203.56041%208.49162%204.43188C9.72621%204.43188%209.72621%204.43188%209.72621%204.43188L9.43572%201.96271C9.43572%201.96271%208.49162%200.582877%208.12851%200.510254C7.91064%200.510254%207.54753%200.510254%206.74868%200.728122C5.94983%200.945991%205.58671%201.09124%205.58671%201.09124C5.58671%201.09124%205.15098%201.3091%204.71524%202.03533C4.20688%202.68894%204.13426%202.83418%204.13426%202.83418C4.13426%202.83418%203.98901%203.8509%203.98901%204.64975Z'%20fill='white'/%3e%3cpath%20d='M0.140011%2022.2971C0.140011%2022.2971%200.64837%2022.5876%201.59247%2022.8054C2.53656%2023.0233%2012.6311%2024.9841%2013.43%2024.4031C13.43%2023.3138%2013.0669%204.28662%2013.0669%204.28662C13.0669%204.28662%201.3746%204.43187%200.93886%204.72236C0.93886%204.72236%200.866238%204.79498%200.793616%204.94023C0.720993%205.08547%200.64837%205.37596%200.64837%205.66645C0.575747%207.4094%200.430501%2011.1132%200.285256%2014.5991C0.0673876%2018.5207%20-0.15048%2022.0792%200.140011%2022.2971Z'%20fill='white'/%3e%3cpath%20d='M13.4299%2024.4031C13.4299%2024.4031%2017.2063%2021.9339%2017.4241%2021.2803C17.3515%2020.1184%2016.9158%204.72236%2016.48%204.64973C16.0443%204.43187%2013.0668%204.28662%2013.0668%204.28662L13.4299%2024.4031Z'%20fill='%234FABA2'/%3e%3cpath%20d='M3.3354%2012.6381L5.65933%2014.381L10.0167%208.78906L11.6144%2010.1689L5.80457%2017.7217L1.95557%2014.3084L3.3354%2012.6381Z'%20fill='%2324A599'/%3e%3c/svg%3e"
                                    alt="Bring! Logo"
                                    className="w-4 h-4"
                                />
                                <span>Auf die Einkaufsliste setzen</span>
                            </a>
                        </div>
                    </div>

                    {/* 2. ZUTATENLISTE: Folgt im normalen Block-Fluss */}
                    <ul className="mb-6 space-y-2">
                        {recipe.ingredients.map((ing, i) => (
                            <li key={i} className="flex items-center text-gray-700">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>{ing}
                            </li>
                        ))}
                    </ul>

                    {/* 3. ANWEISUNGEN: Folgt ebenfalls im normalen Block-Fluss */}
                    <h2 className="font-bold text-lg mb-2 pt-4 border-t">Anweisungen</h2>
                    <div className="text-gray-600 whitespace-pre-wrap">{recipe.instructions}</div>

                </div>
            </div>
        </div>
    );
}