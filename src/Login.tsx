import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // FastAPI erwartet Form Data für den Token-Endpunkt!
        const formData = new FormData();
        formData.append('username', email); // FastAPI nennt es "username", wir nutzen die Email
        formData.append('password', password);

        try {
            const response = await fetch('/api/token', {
                method: 'POST',
                body: formData, // Kein JSON.stringify, kein Content-Type Header (macht der Browser automatisch bei FormData)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Login fehlgeschlagen');
            }

            const data = await response.json();
            // data.access_token kommt vom Backend
            login(data.access_token);
            navigate('/'); // Zurück zur Startseite

        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Anmelden</h2>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Passwort</label>
                        <input
                            type="password"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition">
                        Einloggen
                    </button>
                </form>
                <div className="mt-4 text-center text-sm">
                    Noch kein Konto? <Link to="/register" className="text-green-600 hover:underline">Hier registrieren</Link>
                </div>
            </div>
        </div>
    );
}