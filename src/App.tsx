import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './lib/firebase/client';
import { useUserStore, UserData } from './store/userStore';

import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/onboarding/Onboarding';
import Workspace from './pages/Workspace';

function generateSkeleton() {
  return (
    <div className="flex h-screen bg-[#05060A] text-[#F8FAFC] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pattern-grid-lg text-white/[0.02] bg-[size:40px_40px]"></div>
        <div className="flex flex-col items-center z-10">
          <h1 className="text-4xl font-bold tracking-tighter mb-4">CREW OS</h1>
          <p className="text-[#94A3B8]">Restoring your workspace...</p>
        </div>
    </div>
  );
}

function AuthListener({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        if (location.pathname !== '/login' && location.pathname !== '/') {
          navigate('/login');
        }
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      let userData: UserData;

      if (!userSnap.exists()) {
        userData = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Unknown',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL,
          onboardingComplete: false,
          activeCompanyId: null,
          activeProjectId: null,
          lastSessionId: null,
          lastWorkspaceVisited: null,
        };

        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
      } else {
        const docData = userSnap.data();
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
        });
        
        userData = {
          uid: docData.uid,
          name: docData.name,
          email: docData.email,
          photoURL: docData.photoURL,
          onboardingComplete: docData.onboardingComplete,
          activeCompanyId: docData.activeCompanyId,
          activeProjectId: docData.activeProjectId,
          lastSessionId: docData.lastSessionId,
          lastWorkspaceVisited: docData.lastWorkspaceVisited,
        };
      }

      setUser(userData);
      setLoading(false);

      if (location.pathname === '/login' || location.pathname === '/') {
        if (userData.onboardingComplete) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
        }
      }
    });

    return () => unsub();
  }, [navigate, location, setUser, setLoading]);

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUserStore();
  
  if (loading) return generateSkeleton();
  if (!user) return <div className="p-8 text-white">Redirecting to login...</div>;
  if (!user.onboardingComplete && window.location.pathname !== '/onboarding') {
      return <div className="p-8 text-white">Redirecting to onboarding...</div>
  }
  
  return <>{children}</>;
}


// Placeholder pages
const PlaceholderPage = ({ title }: { title: string }) => {
  return <div className="p-8 text-white">{title}</div>
};

export default function App() {
  const { loading } = useUserStore();

  return (
    <BrowserRouter>
      <AuthListener>
        {loading ? generateSkeleton() : (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Landing />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/workspace/:companyId/:projectId" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
            
            {/* Nav Links placeholders */}
            <Route path="/projects" element={<ProtectedRoute><PlaceholderPage title="Projects" /></ProtectedRoute>} />
            <Route path="/crew" element={<ProtectedRoute><PlaceholderPage title="Crew" /></ProtectedRoute>} />
            <Route path="/sessions" element={<ProtectedRoute><PlaceholderPage title="Sessions" /></ProtectedRoute>} />
            <Route path="/deliverables" element={<ProtectedRoute><PlaceholderPage title="Deliverables" /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><PlaceholderPage title="Settings" /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </AuthListener>
    </BrowserRouter>
  );
}
