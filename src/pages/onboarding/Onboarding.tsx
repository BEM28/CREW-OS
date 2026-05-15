import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ProfileSetup from './components/ProfileSetup';
import HireCrew from './components/HireCrew';
import CreateProject from './components/CreateProject';
import { useUserStore } from '../../store/userStore';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/client';
import { handleFirestoreError, OperationType } from '../../lib/firebase/client';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const { user, setUser } = useUserStore();
  const navigate = useNavigate();

  const handleFinish = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        onboardingComplete: true
      });
      setUser({ ...user, onboardingComplete: true });
      navigate('/dashboard');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden text-text-primary p-4 sm:p-8">
      <div className="absolute inset-0 pattern-grid-lg text-white/[0.02] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Progress Indicator */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-primary' : 'w-2 bg-surface-2'}`} />
          </div>
        ))}
      </div>

      <div className="w-full max-w-[1000px] z-10 glass-panel premium-shadow rounded-[24px] overflow-hidden min-h-[600px] flex">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex"
            >
              <ProfileSetup onNext={() => setStep(2)} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex"
            >
              <HireCrew onNext={() => setStep(3)} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex"
            >
              <CreateProject onFinish={handleFinish} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
