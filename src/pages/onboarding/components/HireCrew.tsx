import { useState, useEffect } from 'react';
import { useUserStore } from '../../../store/userStore';
import { UserPlus, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase/client';

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

export default function HireCrew({ onNext }: { onNext: () => void }) {
  const { user } = useUserStore();
  const [agents, setAgents] = useState<any[]>([]);
  
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [customRole, setCustomRole] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [personalityNotes, setPersonalityNotes] = useState('');
  
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [keyMessage, setKeyMessage] = useState('');
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
    if (!name || (!apiKey && keyStatus !== 'valid') || !user) return;
    
    setIsSubmitting(true);
    try {
      // Get encrypted key and preset data via backend
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
      
      // Save it directly via Web SDK to bypass Admin SDK limits in sandbox
      const agentsRef = collection(db, 'users', user.uid, 'agents');
      await import('firebase/firestore').then(async ({ addDoc, serverTimestamp }) => {
           await addDoc(agentsRef, {
             ...data.agentData,
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp(),
             lastUsedAt: null
           });
      });
      
      setName('');
      setApiKey('');
      setPersonalityNotes('');
      setKeyStatus('idle');
    } catch (e) {
      console.error(e);
      alert('Error creating agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full h-full flex-col lg:flex-row overflow-hidden">
      
      {/* Right side form for adding crew */}
      <div className="w-full lg:w-[400px] border-r border-border bg-surface flex flex-col p-8 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <UserPlus className="text-white w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary">Add Specialist</h2>
        </div>

        <form onSubmit={handleCreateAgent} className="space-y-4 flex-1">
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1">Name</label>
            <input 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 bg-surface-2 border border-border rounded-lg px-3 text-sm text-text-primary focus:outline-none focus:border-primary"
              placeholder="e.g. Alex"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 bg-[#0B0D14] text-[#F8FAFC] border border-white/10 rounded-lg px-3 text-sm focus:outline-none focus:border-purple-500 appearance-none"
            >
              {ROLES.map(r => <option className="bg-[#0B0D14] text-[#F8FAFC]" key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {role === 'Custom' && (
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1">Custom Role</label>
              <input 
                required
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="w-full h-10 bg-surface-2 border border-border rounded-lg px-3 text-sm text-text-primary focus:outline-none focus:border-primary"
                placeholder="e.g. Data Scientist"
              />
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1">Accent Color (Optional)</label>
            <div className="flex items-center gap-3">
               <input 
                 type="color"
                 value={accentColor || '#7C3AED'}
                 onChange={(e) => setAccentColor(e.target.value)}
                 className="w-10 h-10 p-1 bg-surface-2 border border-border rounded-lg cursor-pointer"
               />
               <span className="text-xs text-text-secondary">Used in 3D scene</span>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1">Gemini API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type={showKey ? 'text' : 'password'}
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-10 bg-surface-2 border border-border rounded-lg pl-3 pr-10 text-sm text-text-primary focus:outline-none focus:border-primary"
                  placeholder="AIzaSy..."
                />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <button 
                type="button" 
                onClick={handleTestKey}
                disabled={testingKey || !apiKey}
                className="px-3 h-10 bg-surface-2 border border-border rounded-lg text-xs font-medium hover:bg-white/[0.05] transition-colors"
              >
                {testingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
              </button>
            </div>
            {keyStatus === 'valid' && <p className="text-xs text-success mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Key is valid</p>}
            {keyStatus === 'invalid' && <p className="text-xs text-error mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {keyMessage}</p>}
          </div>

          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1">Personality Notes (Optional)</label>
            <textarea 
              value={personalityNotes}
              onChange={(e) => setPersonalityNotes(e.target.value)}
              className="w-full h-24 bg-surface-2 border border-border rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-primary resize-none"
              placeholder="Very direct, technical-focused, uses data in every argument..."
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={isSubmitting || keyStatus !== 'valid'}
              className="w-full h-10 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add to Crew'}
            </button>
          </div>
        </form>
      </div>

      {/* Left side preview & list */}
      <div className="flex-1 p-8 flex flex-col">
        <div className="flex-1">
          {agents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl border border-dashed border-border flex items-center justify-center mb-4">
                <UserPlus className="text-text-muted w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-1">Your war room is empty</h3>
              <p className="text-sm text-text-secondary">Add your first AI specialist to start building.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(a => (
                <div key={a.id} className="glass-panel p-5 rounded-2xl border border-border hover-card relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: a.accentColor }} />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-surface-2 flex flex-col items-center justify-center text-xl" style={{ border: `1px solid ${a.accentColor}40` }}>
                      {a.roleEmoji}
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-primary text-sm">{a.name}</h4>
                      <p className="text-xs text-text-muted">{a.role}</p>
                    </div>
                  </div>
                  <div className="text-xs text-text-secondary line-clamp-3 mb-4">
                    {a.basePersonality} {a.personalityNotes}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono bg-background px-2 py-1 rounded inline-block">
                    {a.keyPreview}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-border flex justify-end">
          <button 
            onClick={onNext}
            disabled={agents.length === 0}
            className="h-10 px-6 bg-text-primary text-background font-medium rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            Create First Project
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
