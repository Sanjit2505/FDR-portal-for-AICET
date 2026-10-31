import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Receipt,
  FilePlus2,
  FolderLock,
  AlertTriangle,
  GitFork,
  Briefcase,
  CalendarDays,
  History,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: any;
  highlight?: boolean;
  badge?: string;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const sections: NavSection[] = [
    {
      title: 'Core Registry',
      items: [
        { name: 'Overview', path: '/overview', icon: LayoutDashboard },
        { name: 'Institutions', path: '/institutions', icon: Building2 },
        { name: 'FDR Registry', path: '/fdr', icon: Receipt },
        { name: 'Submit FDR', path: '/fdr/new', icon: FilePlus2, highlight: true },
      ]
    },
    {
      title: 'Evidence Scrutiny',
      items: [
        { name: 'Document Vault', path: '/documents', icon: FolderLock },
        { name: 'Risk & Discrepancies', path: '/risk', icon: AlertTriangle, badge: 'R1-R8' },
        { name: 'Relationship Graph', path: '/graph', icon: GitFork },
        { name: 'Investigation Cases', path: '/cases', icon: Briefcase },
      ]
    },
    {
      title: 'Planning & Governance',
      items: [
        { name: 'Maturity Planner', path: '/maturity', icon: CalendarDays },
        { name: 'Audit Trail', path: '/audit', icon: History, badge: 'SHA-256' },
        { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
        { name: 'Administration', path: '/settings', icon: Settings, adminOnly: true },
      ]
    }
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 268 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="bg-[#090d18] border-r border-white/[0.07] flex flex-col h-screen sticky top-0 z-40 select-none shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#0a0f1d]/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(99,102,241,0.35)] border border-indigo-400/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col whitespace-nowrap min-w-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-[14px] tracking-tight text-white font-sans">
                  FDR Guardian
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Gov
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight">Institutional Scrutiny</span>
            </motion.div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {sections.map((section, idx) => {
          const visibleItems = section.items.filter(item => {
            if (item.adminOnly && user?.role !== 'admin') return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-0.5">
              {!collapsed && (
                <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  {section.title}
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/overview' && location.pathname.startsWith(item.path));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    className={({ isActive: active }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${
                        active || isActive
                          ? 'bg-indigo-600/15 text-white border border-indigo-500/25 shadow-sm'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                      }`
                    }
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`} />
                    {!collapsed && (
                      <span className="truncate flex-1 tracking-tight text-[12.5px]">{item.name}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-white/[0.03] text-slate-400 border-white/[0.06]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeSidebarIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-500 rounded-r"
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Footer Card */}
      <div className="p-3 border-t border-white/[0.06] bg-[#080c16]">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-slate-200 flex-shrink-0">
                {getInitials(user?.full_name)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-semibold text-slate-200 truncate font-sans tracking-tight">
                  {user?.full_name?.split('(')[0] || 'Official'}
                </span>
                <span className="text-[9px] font-mono text-indigo-300 uppercase tracking-wider truncate">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
};
