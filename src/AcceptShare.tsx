import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { authenticatedFetch } from './api';
import Header from './Header';

export default function AcceptShare() {
    const { token: shareToken } = useParams();
    const navigate = useNavigate();
    const { token: authToken, logout } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauthorized'>('loading');

    // WICHTIG: Ein Ref, um Mehrfach-Aufrufe zu verhindern
    const hasCalled = useRef(false);

    const [isDuplicate, setIsDuplicate] = useState(false);

    useEffect(() => {
        const acceptRecipe = async () => {
            // Wenn der Request bereits läuft oder fertig ist, brich ab
            if (hasCalled.current) return;

            if (!authToken) {
                setStatus('unauthorized');
                return;
            }

            try {
                hasCalled.current = true; // Markiere den Start des ersten Requests

                const response = await authenticatedFetch(`/api/shares/accept/${shareToken}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }, logout);

                if (response.ok) {
                    const data = await response.json();

                    // Prüfen, ob das Backend "Rezept war bereits vorhanden" gesendet hat
                    if (data.message === "Rezept war bereits vorhanden") {
                        setIsDuplicate(true);
                    }

                    setStatus('success');
                    setTimeout(() => navigate(`/recipe/${data.recipe_id}`), 2500); // Etwas mehr Zeit zum Lesen geben
                }
            } catch (err) {
                console.error(err);
                setStatus('error');
                hasCalled.current = false;
            }
        };

        acceptRecipe();
    }, [shareToken, authToken, logout, navigate]);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <Header />

                <div className="flex justify-center items-center py-20">
                    <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl text-center border border-gray-100">
                        {status === 'loading' && (
                            <div className="space-y-6">
                                <div className="text-5xl animate-bounce">🍳</div>
                                <h2 className="text-2xl font-bold text-gray-800">Rezept wird hinzugefügt...</h2>
                                <p className="text-gray-500">Wir kopieren die Zutaten in deine Sammlung.</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="space-y-6">
                                <div className="text-5xl">
                                    {isDuplicate ? '📚' : '✅'}
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {isDuplicate ? 'Bereits vorhanden' : 'Erfolgreich hinzugefügt!'}
                                </h2>
                                <p className="text-gray-500">
                                    {isDuplicate
                                        ? 'Dieses Rezept befindet sich schon in deiner Sammlung. Wir leiten dich direkt dorthin...'
                                        : 'Das Rezept wurde in deinem Kochbuch "Geteilte Rezepte" gespeichert.'}
                                </p>

                                {/* Ladebalken zur Visualisierung der Weiterleitung */}
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-4">
                                    <div className={`h-full ${isDuplicate ? 'bg-blue-500' : 'bg-green-500'} animate-progress-fast`}></div>
                                </div>
                            </div>
                        )}

                        {status === 'unauthorized' && (
                            <div className="space-y-6">
                                <div className="text-5xl">🔐</div>
                                <h2 className="text-2xl font-bold text-orange-600">Login erforderlich</h2>
                                <p className="text-gray-500">Du musst eingeloggt sein, um geteilte Rezepte anzunehmen.</p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition"
                                >
                                    Zum Login
                                </button>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-6">
                                <div className="text-5xl">⚠️</div>
                                <h2 className="text-2xl font-bold text-red-600">Link nicht gültig</h2>
                                <p className="text-gray-500">Dieser Link ist abgelaufen oder wurde bereits verwendet.</p>
                                <button
                                    onClick={() => navigate('/')}
                                    className="text-green-600 font-bold hover:underline"
                                >
                                    Zurück zur Übersicht
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}