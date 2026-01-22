import { useAuth } from './AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, UtensilsCrossed } from 'lucide-react'; // Falls du Lucide nutzt


export default function Header() {
    const { logout } = useAuth();

    return (
        <div className="flex justify-between items-center mb-6">
            {/* LINKE SEITE: Logo & Titel als Link zur Startseite */}
            <Link
                to="/"
                className="flex items-center gap-3 group transition-transform active:scale-95"
            >
                <div className="bg-green-600 p-2 rounded-xl shadow-lg shadow-green-200 group-hover:bg-green-700 transition-colors">
                    <UtensilsCrossed size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-none">
                        Recipe<span className="text-green-600">Lib</span>
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mt-1">
                        Digital Kitchen
                    </p>
                </div>
            </Link>

            {/* RECHTE SEITE: Logout */}
            <button
                onClick={logout}
                title="Abmelden"
                className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-250 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-all duration-200 border border-gray-100 hover:border-red-100"
            >
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
                    Abmelden
                </span>
                <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
        </div>
    );
}


export function SubNav() {
    const location = useLocation();

    const getLinkStyle = (path: string) => {
        const isActive = location.pathname === path;

        // Basis-Style für die "Pillen"
        const base = "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 ";

        if (isActive) {
            // Aktiver Zustand (Grün)
            return base + "bg-green-600 text-white shadow-sm";
        }

        // Inaktiver Zustand (Graue Pillen)
        return base + "bg-gray-150 text-gray-600 hover:bg-gray-200";
    };

    return (
        <div className="w-full mb-6">
            <nav className="
                flex 
                gap-2 
                overflow-x-auto 
                scrollbar-hide 
                -webkit-overflow-scrolling-touch
                py-2
                /* Wichtig: Padding links/rechts damit es nicht am Rand klebt */
                px-4
            ">
                <Link to="/" className={getLinkStyle('/')}>🏠 Rezepte</Link>
                <Link to="/cookbooks" className={getLinkStyle('/cookbooks')}>📖 Kochbücher</Link>
                <Link to="/cooklist" className={getLinkStyle('/cooklist')}>📋 Kochliste</Link>
                <Link to="/import" className={getLinkStyle('/import')}>📥 Import</Link>

                {/* Puffer-Element am Ende für sauberes Auslaufen beim Scrollen */}
                <div className="w-4 shrink-0 h-1"></div>
            </nav>
        </div>
    );
}