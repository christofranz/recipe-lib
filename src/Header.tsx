import { useAuth } from './AuthContext';

export default function Header() {
    const { logout } = useAuth();
    return (
        <div className="flex justify-end mb-4">
            <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800 underline transition"
            >
                Logout
            </button>
        </div>
    );
}