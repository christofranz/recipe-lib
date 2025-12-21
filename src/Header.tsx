import { useAuth } from './AuthContext';

export default function Header() {
    const { logout } = useAuth();
    return (
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Meine Rezeptsammlung</h1>
            <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800 underline transition"
            >
                Logout
            </button>
        </div>
    );
}