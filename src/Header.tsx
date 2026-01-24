import { useAuth } from './AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, UtensilsCrossed } from 'lucide-react'; // Falls du Lucide nutzt
import { useEffect, useRef } from 'react';

export default function Header() {
    const { logout } = useAuth();

    return (
        <div className="flex justify-between items-center">
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
                        One for All
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
    const navRef = useRef<HTMLDivElement>(null);

    // Diese Funktion findet den aktiven Link und scrollt ihn in die Mitte
    useEffect(() => {
        const activeLink = navRef.current?.querySelector('.active-pill');
        if (activeLink) {
            activeLink.scrollIntoView({
                behavior: 'smooth',
                inline: 'center', // Schiebt das Element in die Mitte des Sichtfelds
                block: 'nearest'
            });
        }
    }, [location.pathname]); // Feuert jedes Mal, wenn die Seite wechselt

    const getLinkStyle = (path: string) => {
        const isActive = location.pathname === path;
        const base = "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 ";

        // Wir fügen die Klasse 'active-pill' hinzu, damit useEffect sie findet
        if (isActive) {
            return base + "bg-green-600 text-white shadow-sm active-pill";
        }

        return base + "bg-gray-100 text-gray-600 hover:bg-gray-200";
    };

    return (
        /* mb-6 entfernen wir hier, da wir den Abstand in den Hauptseiten steuern */
        <div className="w-full">
            <nav
                ref={navRef} // Referenz für das automatische Scrollen
                className="
                    flex 
                    gap-2 
                    overflow-x-auto 
                    scrollbar-hide 
                    -webkit-overflow-scrolling-touch
                    py-2
                    px-4
                "
                style={{ scrollSnapType: 'x proximity' }} // Optional: Snapping Effekt
            >
                <Link to="/" className={getLinkStyle('/')}>🏠 Rezepte</Link>
                <Link to="/cookbooks" className={getLinkStyle('/cookbooks')}>📖 Kochbücher</Link>
                <Link to="/cooklist" className={getLinkStyle('/cooklist')}>📋 Kochliste</Link>
                <Link to="/import" className={getLinkStyle('/import')}>📥 Import</Link>

                <div className="w-8 shrink-0 h-1"></div>
            </nav>
        </div>
    );
}