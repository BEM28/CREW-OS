import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { Play, FileText, ArrowRight, Activity, Clock, FolderKanban, Users } from 'lucide-react';
import { collection, query, limit, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase/client';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useUserStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeWorkspaceUrl, setActiveWorkspaceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.activeCompanyId) return;

    // Fetch Recent Projects
    const q = query(collection(db, 'users', user.uid, 'companies', user.activeCompanyId, 'projects'), limit(4));
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'projects'));

    // Fetch Active Crew
    const qAgents = query(collection(db, 'users', user.uid, 'agents'), limit(6));
    const unsubAgents = onSnapshot(qAgents, (snap) => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'agents'));

    return () => {
      unsub();
      unsubAgents();
    }
  }, [user]);

  useEffect(() => {
    if (user?.lastWorkspaceVisited) {
        setActiveWorkspaceUrl(user.lastWorkspaceVisited);
    }
  }, [user]);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">

        {/* Continue Where You Left Off */}
        {activeWorkspaceUrl && (
          <div className="glass-panel p-6 rounded-2xl border-primary/20 bg-primary/[0.02] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Active Session</span>
              </div>
              <h2 className="text-xl font-medium text-text-primary">Continue where you left off?</h2>
              <p className="text-sm text-text-secondary mt-1">Your crew is currently paused in the war room.</p>
            </div>
            <div className="flex gap-3">
              <Link to="/projects" className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-surface-2 transition-colors">
                Open Dashboard
              </Link>
              <Link to={activeWorkspaceUrl} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center gap-2">
                Resume Session <Play className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent Projects */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-text-muted" /> Recent Projects
              </h3>
              <Link to="/projects" className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="p-8 bg-surface-2 border border-border rounded-2xl text-center">
                  <p className="text-sm text-text-secondary">Create your first project to get started.</p>
                </div>
              ) : projects.map(p => (
                <Link to={`/workspace/${user?.activeCompanyId}/${p.id}`} key={p.id} className="block glass-panel p-4 rounded-2xl hover-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-text-primary">{p.name}</h4>
                      <p className="text-sm text-text-secondary line-clamp-1 mt-1">{p.description}</p>
                    </div>
                    <div className="px-2 py-1 rounded-md bg-surface border border-border text-[10px] uppercase font-semibold text-text-muted">
                      {p.status}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {p.selectedAgents?.length || 0} agents
                    </div>
                    <div className="flex items-center gap-1">
                       <Clock className="w-3 h-3" /> Active
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Active Crew */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
                  <Activity className="w-5 h-5 text-text-muted" /> Active Crew
                </h3>
                {agents.length > 0 && (
                  <div className="glass-panel px-3 py-1 rounded-full text-xs font-medium border-border flex items-center gap-2">
                    <span className="text-text-secondary">Team Mood:</span>
                    <span className={
                      agents.filter(a => a.defaultEmotion === 'HYPED').length > agents.filter(a => a.defaultEmotion === 'SKEPTICAL').length && agents.filter(a => a.defaultEmotion === 'HYPED').length > agents.filter(a => a.defaultEmotion === 'FOCUSED').length ? "text-primary" :
                      agents.filter(a => a.defaultEmotion === 'SKEPTICAL').length > agents.filter(a => a.defaultEmotion === 'HYPED').length && agents.filter(a => a.defaultEmotion === 'SKEPTICAL').length > agents.filter(a => a.defaultEmotion === 'FOCUSED').length ? "text-error" : 
                      "text-success"
                    }>
                      {
                        agents.filter(a => a.defaultEmotion === 'HYPED').length > agents.filter(a => a.defaultEmotion === 'SKEPTICAL').length && agents.filter(a => a.defaultEmotion === 'HYPED').length > agents.filter(a => a.defaultEmotion === 'FOCUSED').length ? "Energetic & Driven" :
                        agents.filter(a => a.defaultEmotion === 'SKEPTICAL').length > agents.filter(a => a.defaultEmotion === 'HYPED').length && agents.filter(a => a.defaultEmotion === 'SKEPTICAL').length > agents.filter(a => a.defaultEmotion === 'FOCUSED').length ? "Cautious & Analytical" : 
                        "Focused & Productive"
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {agents.map(a => (
                <div key={a.id} className="glass-panel p-4 rounded-2xl border border-border relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 blur-2xl opacity-10" style={{ backgroundColor: a.accentColor }} />
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full flex flex-col items-center justify-center text-xl bg-surface border" style={{ borderColor: `${a.accentColor}30` }}>
                      {a.roleEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary text-sm truncate">{a.name}</div>
                      <div className="text-[10px] text-text-muted uppercase font-semibold tracking-wider truncate">{a.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
                      {a.defaultEmotion}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-text-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Idle
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </DashboardLayout>
  );
}
