import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMsg('');

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Registrierung fehlgeschlagen');
            }

            setMsg('Account erstellt! Bitte warten Sie auf die Freigabe durch den Admin.');
            // Optional: Nach 3 Sekunden zum Login leiten
            setTimeout(() => navigate('/login'), 3000);

        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Registrieren</h2>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
                {msg && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{msg}</div>}

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
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
                        Registrieren
                    </button>
                </form>
                <div className="mt-4 text-center text-sm">
                    Bereits ein Konto? <Link to="/login" className="text-blue-600 hover:underline">Zum Login</Link>
                </div>
            </div>
        </div>
    );
}