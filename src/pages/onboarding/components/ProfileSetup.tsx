import { useState } from 'react';
import { useUserStore } from '../../../store/userStore';
import { ArrowRight, Building2 } from 'lucide-react';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase/client';
import { useLocation } from 'react-router-dom';

const INDUSTRIES = [
  "Tech Startup",
  "Film & Creative",
  "Copywriting Agency",
  "Music Industry",
  "Fashion Brand",
  "Custom Industry"
];

const AUTO_ROLES: Record<string, string> = {
  "Tech Startup": "CEO",
  "Film & Creative": "Director",
  "Copywriting Agency": "Founder",
  "Music Industry": "Founder",
  "Fashion Brand": "Creative Founder",
  "Custom Industry": "Founder"
};

export default function ProfileSetup({ onNext }: { onNext: () => void }) {
  const { user, setUser } = useUserStore();
  const [name, setName] = useState(user?.name || '');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Tech Startup');
  const [role, setRole] = useState(AUTO_ROLES['Tech Startup']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleIndustryChange = (val: string) => {
    setIndustry(val);
    setRole(AUTO_ROLES[val] || 'Founder');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyName.trim() || !user) return;
    
    setIsSubmitting(true);
    try {
      // Create company
      const companyRef = doc(collection(db, 'users', user.uid, 'companies'));
      const companyId = companyRef.id;
      
      await setDoc(companyRef, {
        id: companyId,
        companyName,
        industry,
        userRole: role,
        description: '',
        logo: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        preferredAgents: [],
        defaultWorkflow: null
      });

      // Update user
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        name,
        activeCompanyId: companyId
      }, { merge: true });

      setUser({ ...user, name, activeCompanyId: companyId });
      onNext();
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
          <Building2 className="text-white w-6 h-6" />
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-text-primary">Let's Build Your Company</h2>
        <p className="text-text-secondary leading-relaxed">
          The foundation of your AI team starts here. Tell us who you are and what your company does.
        </p>
      </div>

      <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center">
        <form onSubmit={handleSubmit} className="max-w-md w-full mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Your Name</label>
            <input 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text-primary focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Company Name</label>
            <input 
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text-primary focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Industry</label>
            <select
              value={industry}
              onChange={(e) => handleIndustryChange(e.target.value)}
              className="w-full h-12 bg-[#0B0D14] text-[#F8FAFC] border border-white/10 rounded-xl px-4 focus:outline-none focus:border-purple-500 transition-colors appearance-none"
            >
              {INDUSTRIES.map(ind => (
                <option className="bg-[#0B0D14] text-[#F8FAFC]" key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Your Role</label>
            <input 
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text-primary focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-text-primary text-background font-medium rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
