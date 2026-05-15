import { useState, useEffect } from 'react';
import { useUserStore } from '../../../store/userStore';
import { ArrowRight, FolderPlus, Check } from 'lucide-react';
import { doc, collection, setDoc, query, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase/client';
import clsx from 'clsx';

export default function CreateProject({ onFinish }: { onFinish: () => void }) {
  const { user, setUser } = useUserStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'agents'));
    const unsub = onSnapshot(q, (snap) => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/agents`);
    });
    return () => unsub();
  }, [user]);

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || selectedAgents.length === 0 || !user || !user.activeCompanyId) return;

    setIsSubmitting(true);
    try {
      const projectRef = doc(collection(db, 'users', user.uid, 'companies', user.activeCompanyId, 'projects'));
      
      await setDoc(projectRef, {
        id: projectRef.id,
        name,
        description,
        status: "active",
        selectedAgents,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastOpenedAt: serverTimestamp(),
        currentWorkflow: null,
        meetingEnergy: 10,
        projectSummary: description
      });

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        activeProjectId: projectRef.id,
        lastWorkspaceVisited: `/workspace/${user.activeCompanyId}/${projectRef.id}`
      }, { merge: true });

      setUser({ 
        ...user, 
        activeProjectId: projectRef.id,
        lastWorkspaceVisited: `/workspace/${user.activeCompanyId}/${projectRef.id}`
      });
      
      onFinish();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/companies`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full h-full">
      <div className="hidden lg:flex w-1/3 border-r border-border bg-surface flex-col p-12">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-8">
          <FolderPlus className="text-white w-6 h-6" />
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-text-primary">Create Your First Project</h2>
        <p className="text-text-secondary leading-relaxed">
          Projects keep your crew memory, deliverables, and sessions organized.
        </p>
      </div>

      <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center overflow-y-auto">
        <form onSubmit={handleFinish} className="max-w-xl w-full mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Project Name</label>
            <input 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text-primary focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. Acme Redesign"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Project Description</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 bg-surface-2 border border-border rounded-xl p-4 text-text-primary focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="Briefly describe what your AI crew needs to accomplish..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-4 flex items-center justify-between">
              Select Crew Members
              <span className="text-xs text-text-muted">{selectedAgents.length} selected</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.map(a => {
                const isSelected = selectedAgents.includes(a.id);
                return (
                  <div 
                    key={a.id}
                    onClick={() => toggleAgent(a.id)}
                    className={clsx(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                      isSelected ? "border-primary bg-primary/10" : "border-border bg-surface-2 hover:border-text-muted"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-sm" style={{ border: `1px solid ${a.accentColor}40`}}>
                      {a.roleEmoji}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">{a.name}</div>
                      <div className="text-xs text-text-muted">{a.role}</div>
                    </div>
                    {isSelected && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              disabled={isSubmitting || selectedAgents.length === 0 || !name.trim()}
              className="w-full h-12 bg-text-primary text-background font-medium rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Finalizing...' : 'Enter Dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
