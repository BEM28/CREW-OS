import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { UserPlus, CheckCircle2, AlertCircle, Loader2, Trash2, Edit2, ShieldCheck, Palette, BrainCircuit, Users } from 'lucide-react';
import { collection, query, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase/client';
import DashboardLayout from '../components/layout/DashboardLayout';
import clsx from 'clsx';

const ROLES = [
  "Product Manager",
  "UI/UX Designer",
  "Lead Developer",
  "Marketing & Growth",
  "QA Engineer",
  "Strategist",
  "Copywriter",
  "Producer",
  "Creative Director",
  "Social Media Manager",
  "Director of Photography",
  "Music Producer",
  "PR Manager",
  "Buyer",
  "Custom"
];

export default function Crew() {
  const { user } = useUserStore();
  const [agents, setAgents] = useState<any[]>([]);
  
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [customRole, setCustomRole] = useState('');
  const [accentColor, setAccentColor] = useState('#7C3AED');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [personalityNotes, setPersonalityNotes] = useState('');
  
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [keyMessage, setKeyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

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

  const handleTestKey = async () => {
    if (!apiKey) return;
    setTestingKey(true);
    setKeyStatus('idle');
    try {
      const res = await fetch('/api/agents/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });
      const data = await res.json();
      if (data.valid) {
        setKeyStatus('valid');
      } else {
        setKeyStatus('invalid');
        setKeyMessage(data.message || 'Invalid Gemini API key.');
      }
    } catch (e) {
      setKeyStatus('invalid');
      setKeyMessage('Error testing key.');
    } finally {
      setTestingKey(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!apiKey && keyStatus !== 'valid' && !editingAgentId) || !user) return;
    
    setIsSubmitting(true);
    try {
      if (editingAgentId) {
        // Update existing agent
        const agentDocRef = doc(db, 'users', user.uid, 'agents', editingAgentId);
        const updateData: any = {
           name,
           role: role === 'Custom' ? customRole : role,
           personalityNotes,
           accentColor,
           updatedAt: serverTimestamp()
        };
        // Only update API key if one was provided
        if (apiKey && keyStatus === 'valid') {
            updateData.apiKey = apiKey;
        }
        await updateDoc(agentDocRef, updateData);
      } else {
        // Create new agent via API
        const res = await fetch('/api/agents/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.uid}` 
          },
          body: JSON.stringify({
            uid: user.uid,
            name,
            role: role === 'Custom' ? customRole : role,
            apiKey,
            personalityNotes,
            accentColor
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate agent data');
        
        const agentsRef = collection(db, 'users', user.uid, 'agents');
        await addDoc(agentsRef, {
          ...data.agentData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastUsedAt: null
        });
      }
      
      resetForm();
      setShowAddForm(false);
    } catch (e) {
      console.error(e);
      alert(editingAgentId ? 'Error updating agent' : 'Error creating agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setApiKey('');
    setPersonalityNotes('');
    setKeyStatus('idle');
    setEditingAgentId(null);
    setRole(ROLES[0]);
    setCustomRole('');
    setAccentColor('#7C3AED');
  };

  const handleEditAgent = (agent: any) => {
    setEditingAgentId(agent.id);
    setName(agent.name);
    setPersonalityNotes(agent.personalityNotes || '');
    setAccentColor(agent.accentColor || '#7C3AED');
    
    if (ROLES.includes(agent.role)) {
        setRole(agent.role);
    } else {
        setRole('Custom');
        setCustomRole(agent.role);
    }
    
    setKeyStatus('idle'); // We don't have the key to test until they type a new one
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!user || !window.confirm('Are you sure you want to dismiss this agent from your crew?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'agents', agentId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/agents/${agentId}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Crew Management</h1>
            <p className="text-text-secondary mt-1">Configure your AI specialists and their unique personalities.</p>
          </div>
          <button 
            onClick={() => {
                if (showAddForm) resetForm();
                setShowAddForm(!showAddForm);
            }}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> {showAddForm ? 'Cancel' : 'Hire New Specialist'}
          </button>
        </div>

        {showAddForm && (
          <div className="glass-panel p-8 rounded-3xl border-primary/20 bg-primary/[0.02] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        {editingAgentId ? <Edit2 className="text-white w-5 h-5" /> : <UserPlus className="text-white w-5 h-5" />}
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary">{editingAgentId ? `Update ${name}` : 'Hire Specialist'}</h2>
                </div>

                <form onSubmit={handleCreateAgent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[13px] font-medium text-text-secondary mb-1 flex items-center gap-2">
                                <UserPlus className="w-3 h-3" /> Name
                            </label>
                            <input 
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-11 bg-surface-2 border border-border rounded-xl px-4 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                                placeholder="e.g. Alex"
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-text-secondary mb-1 flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" /> Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full h-11 bg-surface-2 text-text-primary border border-border rounded-xl px-4 text-sm focus:outline-none focus:border-primary appearance-none transition-colors"
                            >
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        {role === 'Custom' && (
                            <div>
                                <label className="block text-[13px] font-medium text-text-secondary mb-1">Custom Role</label>
                                <input 
                                    required
                                    value={customRole}
                                    onChange={(e) => setCustomRole(e.target.value)}
                                    className="w-full h-11 bg-surface-2 border border-border rounded-xl px-4 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                                    placeholder="e.g. Data Scientist"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-[13px] font-medium text-text-secondary mb-1 flex items-center gap-2">
                                <Palette className="w-3 h-3" /> Accent Color
                            </label>
                            <div className="flex items-center gap-3 p-1.5 bg-surface-2 border border-border rounded-xl">
                                <input 
                                    type="color"
                                    value={accentColor}
                                    onChange={(e) => setAccentColor(e.target.value)}
                                    className="w-10 h-10 p-1 bg-transparent rounded-lg cursor-pointer border-none"
                                />
                                <span className="text-xs text-text-muted">Will be used for their digital avatar</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[13px] font-medium text-text-secondary mb-1">Gemini API Key {editingAgentId && '(Leave blank to keep current)'}</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        type={showKey ? 'text' : 'password'}
                                        required={!editingAgentId}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full h-11 bg-surface-2 border border-border rounded-xl pl-4 pr-12 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                                        placeholder={editingAgentId ? "••••••••••••••••" : "AIzaSy..."}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowKey(!showKey)} 
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-text-primary"
                                    >
                                        {showKey ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleTestKey}
                                    disabled={testingKey || !apiKey}
                                    className="px-4 h-11 bg-surface-2 border border-border rounded-xl text-xs font-semibold hover:bg-white/[0.05] transition-colors disabled:opacity-50"
                                >
                                    {testingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                                </button>
                            </div>
                            {keyStatus === 'valid' && <p className="text-[11px] text-success mt-2 flex items-center gap-1.5 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Key verification successful</p>}
                            {keyStatus === 'invalid' && <p className="text-[11px] text-error mt-2 flex items-center gap-1.5 font-medium"><AlertCircle className="w-3.5 h-3.5" /> {keyMessage}</p>}
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-text-secondary mb-1 flex items-center gap-2">
                                <BrainCircuit className="w-3 h-3" /> Personality Notes
                            </label>
                            <textarea 
                                value={personalityNotes}
                                onChange={(e) => setPersonalityNotes(e.target.value)}
                                className="w-full h-[104px] bg-surface-2 border border-border rounded-xl p-4 text-sm text-text-primary focus:outline-none focus:border-primary resize-none transition-colors"
                                placeholder="Describe how they think, their tone, and common catchphrases..."
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-2">
                        <button 
                            type="submit"
                            disabled={isSubmitting || (!editingAgentId && keyStatus !== 'valid')}
                            className="w-full h-11 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> {editingAgentId ? 'Updating Specialist...' : 'Finalizing Specialist...'}
                                </span>
                            ) : editingAgentId ? 'Update Specialist Profile' : 'Finalize Hire'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center glass-panel rounded-3xl border-dashed border-border">
              <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                <Users className="text-text-muted w-8 h-8" />
              </div>
              <h3 className="text-xl font-medium text-text-primary mb-2">No active crew members</h3>
              <p className="text-sm text-text-secondary max-w-sm">Every great project needs a team. Start by hiring your first AI specialist.</p>
            </div>
          ) : (
            agents.map(a => (
              <div key={a.id} className="glass-panel group relative overflow-hidden rounded-3xl border border-border p-6 hover-card transition-all">
                {/* Background Accent */}
                <div 
                    className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none" 
                    style={{ backgroundColor: a.accentColor }} 
                />
                
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div 
                        className="w-14 h-14 rounded-2xl bg-surface-2 border border-white/5 flex items-center justify-center text-2xl shadow-inner shadow-white/5"
                        style={{ borderBottom: `3px solid ${a.accentColor}` }}
                    >
                      {a.roleEmoji}
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary text-lg leading-tight">{a.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-2 py-0.5 rounded bg-white/[0.03] border border-white/5">
                            {a.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => handleEditAgent(a)}
                        className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit Specialist"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleDeleteAgent(a.id)}
                        className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                        title="Dismiss Specialist"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h5 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Agent Baseline</h5>
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 italic">
                           "{a.basePersonality}"
                        </p>
                    </div>

                    {a.personalityNotes && (
                        <div>
                            <h5 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Custom Directives</h5>
                            <p className="text-xs text-text-primary/80 leading-relaxed line-clamp-2">
                                {a.personalityNotes}
                            </p>
                        </div>
                    )}

                    <div className="pt-4 flex items-center justify-between border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-muted font-mono">{a.keyPreview}</span>
                        </div>
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-success uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Ready
                        </span>
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
