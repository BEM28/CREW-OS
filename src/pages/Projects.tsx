import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { FolderKanban, Plus, Clock, Users, ArrowRight, X, Check, Search, Filter, Trash2, Edit2 } from 'lucide-react';
import { collection, query, onSnapshot, doc, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase/client';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export default function Projects() {
  const { user } = useUserStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user?.activeCompanyId) return;

    // Fetch Projects
    const q = query(collection(db, 'users', user.uid, 'companies', user.activeCompanyId, 'projects'));
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'projects'));

    // Fetch Crew
    const qAgents = query(collection(db, 'users', user.uid, 'agents'));
    const unsubAgents = onSnapshot(qAgents, (snap) => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'agents'));

    return () => {
      unsub();
      unsubAgents();
    }
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.activeCompanyId || !newProjectName.trim() || selectedAgents.length === 0) return;

    setIsSubmitting(true);
    try {
      if (editingProjectId) {
         const projectRef = doc(db, 'users', user.uid, 'companies', user.activeCompanyId, 'projects', editingProjectId);
         await updateDoc(projectRef, {
            name: newProjectName,
            description: newProjectDesc,
            selectedAgents,
            updatedAt: serverTimestamp()
         });
      } else {
        const projectsRef = collection(db, 'users', user.uid, 'companies', user.activeCompanyId, 'projects');
        await addDoc(projectsRef, {
          name: newProjectName,
          description: newProjectDesc,
          status: 'active',
          selectedAgents,
          projectSummary: newProjectDesc,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastOpenedAt: serverTimestamp()
        });
      }

      resetForm();
      setShowAddForm(false);
    } catch (e) {
      handleFirestoreError(e, editingProjectId ? OperationType.UPDATE : OperationType.CREATE, 'projects');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewProjectName('');
    setNewProjectDesc('');
    setSelectedAgents([]);
    setEditingProjectId(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user?.activeCompanyId || !window.confirm('Archive and delete this project war room? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'companies', user.activeCompanyId, 'projects', projectId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'projects');
    }
  };

  const handleEditProject = (project: any) => {
    setEditingProjectId(project.id);
    setNewProjectName(project.name);
    setNewProjectDesc(project.description);
    setSelectedAgents(project.selectedAgents || []);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Projects</h1>
            <p className="text-text-secondary mt-1">Manage all your active project war rooms and crews.</p>
          </div>
          <button 
            onClick={() => {
                if (showAddForm) resetForm();
                setShowAddForm(!showAddForm);
            }}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center gap-2 w-fit"
          >
            <Plus className="w-4 h-4" /> {showAddForm ? 'Cancel' : 'New Project'}
          </button>
        </div>

        {showAddForm && (
          <div className="glass-panel p-8 rounded-3xl border-primary/20 bg-primary/[0.02] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        {editingProjectId ? <Edit2 className="text-white w-5 h-5" /> : <FolderKanban className="text-white w-5 h-5" />}
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary">{editingProjectId ? `Edit ${newProjectName}` : 'Launch New Project'}</h2>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[13px] font-medium text-text-secondary mb-1">Project Name</label>
                                <input 
                                    required
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full h-11 bg-surface-2 border border-border rounded-xl px-4 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                                    placeholder="e.g. Project Phoenix"
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-medium text-text-secondary mb-1">Description</label>
                                <textarea 
                                    required
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                    className="w-full h-32 bg-surface-2 border border-border rounded-xl p-4 text-sm text-text-primary focus:outline-none focus:border-primary resize-none transition-colors"
                                    placeholder="What are we building?"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[13px] font-medium text-text-secondary">Select Crew Members</label>
                            <div className="space-y-2 max-h-[184px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                {agents.map(agent => (
                                    <div 
                                        key={agent.id}
                                        onClick={() => toggleAgent(agent.id)}
                                        className={clsx(
                                            "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                            selectedAgents.includes(agent.id) 
                                                ? "bg-primary/10 border-primary/50 text-white" 
                                                : "bg-surface-2 border-border text-text-secondary hover:border-text-muted"
                                        )}
                                    >
                                        <div className="text-lg">{agent.roleEmoji}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold truncate">{agent.name}</div>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60 truncate">{agent.role}</div>
                                        </div>
                                        {selectedAgents.includes(agent.id) && <Check className="w-4 h-4 text-primary" />}
                                    </div>
                                ))}
                                {agents.length === 0 && (
                                    <div className="text-xs text-text-muted text-center py-4 bg-surface-2 border border-dashed border-border rounded-xl">
                                        No agents available. Hire some first!
                                    </div>
                                )}
                            </div>
                            {selectedAgents.length === 0 && (
                                <p className="text-[10px] text-error font-medium italic">* At least one crew member is required</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit"
                            disabled={isSubmitting || !newProjectName.trim() || selectedAgents.length === 0}
                            className="w-full h-11 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            {isSubmitting ? 'Updating Workspace...' : editingProjectId ? 'Save Project Changes' : 'Initialize Project War Room'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 bg-surface p-2 rounded-2xl border border-border">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search projects by name or description..."
                    className="w-full h-11 bg-transparent pl-12 pr-4 text-sm text-text-primary focus:outline-none"
                />
            </div>
            <button className="h-11 px-4 flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors border-l border-border">
                <Filter className="w-4 h-4" /> Filter
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center glass-panel rounded-3xl border-dashed border-border">
              <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                <FolderKanban className="text-text-muted w-8 h-8" />
              </div>
              <h3 className="text-xl font-medium text-text-primary mb-2">No projects found</h3>
              <p className="text-sm text-text-secondary max-w-sm">
                {searchQuery ? "Try a different search term or clear the filter." : "Get started by creating your first project workspace."}
              </p>
            </div>
          ) : (
            filteredProjects.map(p => (
              <Link 
                to={`/workspace/${user?.activeCompanyId}/${p.id}`} 
                key={p.id} 
                className="glass-panel group p-6 rounded-3xl border border-border hover-card transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">{p.name}</h3>
                    <p className="text-sm text-text-secondary line-clamp-2 mt-1 leading-relaxed">{p.description}</p>
                  </div>
                  <div className={clsx(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    p.status === 'active' ? "bg-success/10 border-success/20 text-success" : "bg-text-muted/10 border-text-muted/20 text-text-muted"
                  )}>
                    {p.status}
                  </div>
                </div>

                <div className="absolute top-6 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                   <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditProject(p); }}
                        className="p-2 rounded-lg bg-surface-2 border border-border text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit Project"
                   >
                        <Edit2 className="w-3.5 h-3.5" />
                   </button>
                   <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProject(p.id); }}
                        className="p-2 rounded-lg bg-surface-2 border border-border text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                        title="Delete Project"
                   >
                        <Trash2 className="w-3.5 h-3.5" />
                   </button>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="flex -space-x-2">
                        {p.selectedAgents?.slice(0, 3).map((aid: string) => {
                            const agent = agents.find(a => a.id === aid);
                            return (
                                <div key={aid} className="w-8 h-8 rounded-full bg-surface border-2 border-background flex items-center justify-center text-xs shadow-sm" title={agent?.name}>
                                    {agent?.roleEmoji || '🤖'}
                                </div>
                            );
                        })}
                        {p.selectedAgents?.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-surface-2 border-2 border-background flex items-center justify-center text-[10px] font-bold text-text-muted shadow-sm">
                                +{p.selectedAgents.length - 3}
                            </div>
                        )}
                     </div>
                     <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                        <Users className="w-3.5 h-3.5" /> {p.selectedAgents?.length || 0} agents
                     </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                     <Clock className="w-3.5 h-3.5" /> 
                     {p.updatedAt?.toDate() ? (
                         (() => {
                            const date = p.updatedAt.toDate();
                            const now = new Date();
                            const diff = now.getTime() - date.getTime();
                            if (diff < 3600000) return 'Just now';
                            if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
                            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                         })()
                     ) : 'Active'}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                    Enter War Room <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
