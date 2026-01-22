import { useAuth } from './AuthContext';
import { Link, useLocation } from 'react-router-dom';


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


export function SubNav() {
    const location = useLocation();

    const getLinkStyle = (path: string) => {
        const isActive = location.pathname === path;

        const base = "transition font-medium pb-2 whitespace-nowrap text-sm md:text-base ";

        if (isActive) {
            return base + "text-green-700 font-bold border-b-2 border-green-600";
        }

        return base + "text-gray-500 hover:text-green-600";
    };

    return (
        <div className="relative w-full overflow-hidden">

            {/* Schatten-Indikator rechts (nur sichtbar wenn Scroll möglich) 
                Dies signalisiert dem User: "Hier geht es weiter" */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 md:hidden" />

            <nav className="
                flex gap-5 mt-2 
                overflow-x-auto 
                scrollbar-hide 
                -webkit-overflow-scrolling-touch
                /* Padding rechts hinzufügen, damit der letzte Punkt nicht am Rand klebt */
                pr-10 md:pr-0
            ">
                <Link to="/" className={getLinkStyle('/')}>🏠 Rezepte</Link>
                <Link to="/cookbooks" className={getLinkStyle('/cookbooks')}>📖 Kochbücher</Link>
                <Link to="/cooklist" className={getLinkStyle('/cooklist')}>📋 Kochliste</Link>
                <Link to="/import" className={getLinkStyle('/import')}>📥 Import</Link>
            </nav>

            {/* Eine feine graue Linie über die volle Breite */}
            <div className="h-[1px] w-full bg-gray-100 -mt-[1px]" />
        </div>
    );
}