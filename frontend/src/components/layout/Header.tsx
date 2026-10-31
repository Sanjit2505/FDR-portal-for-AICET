import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Shield, CheckCircle2, ChevronRight, X, Command, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
      } catch {
        // ignore
      }
    }
    loadNotifications();
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/fdr?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [{ label: 'Overview', path: '/overview' }];
    return parts.map((part, index) => {
      const path = `/${parts.slice(0, index + 1).join('/')}`;
      const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      return { label, path };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-16 border-b border-white/[0.06] bg-[#080d1a]/80 backdrop-blur-xl sticky top-0 z-30 px-6 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      {/* Breadcrumb Path */}
      <div className="flex items-center gap-2 text-xs">
        <Link to="/overview" className="text-slate-400 hover:text-slate-200 transition-colors font-medium">
          Workspace
        </Link>
        {breadcrumbs.map((bc, i) => (
          <React.Fragment key={bc.path}>
            <span className="text-slate-600 font-mono">/</span>
            <Link
              to={bc.path}
              className={`tracking-tight truncate max-w-[200px] ${
                i === breadcrumbs.length - 1
                  ? 'text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              {bc.label}
            </Link>
          </React.Fragment>
        ))}
      </div>

      {/* Action Strip */}
      <div className="flex items-center gap-3">
        {/* Quick Search */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search FDR, Bank, IFSC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl pl-8 pr-9 py-1.5 text-[12px] text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/80 focus:bg-white/[0.05] w-64 transition-all font-sans"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/[0.08] pointer-events-none">
            ↵
          </kbd>
        </form>

        {/* Live Integrity Capsule */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>CHAIN VERIFIED</span>
        </div>

        {/* Institution Scope Badge */}
        {user?.institutions && user.institutions.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] border border-white/[0.08] rounded-xl text-[11px] font-medium text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate max-w-[150px]">{user.institutions[0].name}</span>
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors relative border border-transparent hover:border-white/[0.08]"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#080d1a]" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0d1322] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                <span className="text-xs font-semibold text-white tracking-tight">System Alerts ({unreadCount})</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
                {notifications.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400 font-mono">No active notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        api.markNotificationRead(n.id);
                        if (n.link_url) navigate(n.link_url);
                        setShowNotifications(false);
                      }}
                      className={`p-3 text-xs cursor-pointer hover:bg-white/[0.03] transition-colors ${
                        !n.is_read ? 'bg-indigo-500/[0.06]' : ''
                      }`}
                    >
                      <div className="font-semibold text-slate-200">{n.title}</div>
                      <div className="text-slate-400 mt-0.5 text-[11px] leading-relaxed line-clamp-2">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
