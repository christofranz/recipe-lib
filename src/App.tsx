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
        fetch('/api/recipe')
            .then(res => res.json())
            .then(data => setRecipe(data))
            .catch(err => console.error("Error:", err));

        const script = document.createElement("script");
        script.src = "//platform.getbring.com/widgets/import.js";
        script.async = true;
        document.body.appendChild(script);

        return () => { document.body.removeChild(script); }
    }, []);

    if (!recipe) return <div className="p-10 text-center text-xl">Loading from Database...</div>;

    const publicEndpoint = window.location.hostname === 'localhost'
        ? 'http://127.0.0.1:8000/api/public/recipe'
        : `${window.location.origin}/api/public/recipe`;

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
                        <div data-bring-import={publicEndpoint} style={{ display: 'flex' }}>
                            <a href="https://www.getbring.com" className="bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold uppercase shadow hover:bg-red-700 transition">
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