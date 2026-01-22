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

        // shrink-0 verhindert das Zusammenquetschen der Texte
        const base = "transition-all duration-200 font-medium pb-3 whitespace-nowrap text-sm md:text-base shrink-0 border-b-2 ";

        if (isActive) {
            return base + "text-green-700 font-bold border-b-2 border-green-600";
        }

        return base + "text-gray-500 hover:text-green-600 border-transparent";
    };

    return (
        <div className="w-full bg-white">
            {/* max-w-full: Stellt sicher, dass das Menü nie breiter als das Handy ist.
               flex: Damit die Links nebeneinander liegen.
               overflow-x-auto: Aktiviert das Wischen ohne Scrollbar.
            */}
            <nav className="
                flex 
                items-center 
                gap-6 
                overflow-x-auto 
                scrollbar-hide 
                -webkit-overflow-scrolling-touch 
                px-4 
                md:px-0
                border-b border-gray-100
            ">
                <Link to="/" className={getLinkStyle('/')}>🏠 Rezepte</Link>
                <Link to="/cookbooks" className={getLinkStyle('/cookbooks')}>📖 Kochbücher</Link>
                <Link to="/cooklist" className={getLinkStyle('/cooklist')}>📋 Kochliste</Link>
                <Link to="/import" className={getLinkStyle('/import')}>📥 Import</Link>

                {/* Ein kleiner unsichtbarer Puffer am Ende, damit der letzte Punkt nicht klebt */}
                <div className="w-4 shrink-0 h-1"></div>
            </nav>
        </div>
    );
}