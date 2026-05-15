import { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { Settings as SettingsIcon, User, Bell, Shield, Moon, Globe, LogOut, Save } from 'lucide-react';
import { auth } from '../lib/firebase/client';
import DashboardLayout from '../components/layout/DashboardLayout';
import clsx from 'clsx';

export default function Settings() {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Moon },
  ];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Settings</h1>
          <p className="text-text-secondary mt-1">Manage your account preferences and system configuration.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Tabs Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="space-y-1 bg-surface p-2 rounded-2xl border border-border">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    activeTab === tab.id 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-text-secondary hover:text-text-primary hover:bg-white/[0.02]"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
              <div className="pt-2 mt-2 border-t border-border">
                <button 
                  onClick={() => auth.signOut()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-error hover:bg-error/5 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            </nav>
          </aside>

          {/* Tab Content */}
          <main className="flex-1 glass-panel rounded-3xl border border-border overflow-hidden">
            <div className="p-8">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b border-border">
                      {user?.photoURL ? (
                          <img src={user.photoURL} alt="Profile" className="w-20 h-20 rounded-2xl object-cover" />
                      ) : (
                          <div className="w-20 h-20 rounded-2xl bg-surface-2 border border-border flex items-center justify-center">
                              <User className="w-8 h-8 text-text-muted" />
                          </div>
                      )}
                      <div>
                          <h3 className="text-lg font-bold text-text-primary">Profile Picture</h3>
                          <p className="text-sm text-text-secondary mt-1">Click to update your avatar.</p>
                          <button className="mt-3 text-xs font-bold text-primary uppercase tracking-wider hover:opacity-80">Change Photo</button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[13px] font-medium text-text-secondary ml-1">Full Name</label>
                        <input 
                            defaultValue={user?.name || ''}
                            className="w-full h-11 bg-surface-2 border border-border rounded-xl px-4 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[13px] font-medium text-text-secondary ml-1">Email Address</label>
                        <input 
                            disabled
                            defaultValue={user?.email || ''}
                            className="w-full h-11 bg-surface-2 border border-border rounded-xl px-4 text-sm text-text-muted focus:outline-none cursor-not-allowed"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[13px] font-medium text-text-secondary ml-1">Company / Organization</label>
                        <input 
                            defaultValue="My Company"
                            className="w-full h-11 bg-surface-2 border border-border rounded-xl px-4 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                  </div>
                </div>
              )}

              {activeTab !== 'profile' && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                        <SettingsIcon className="w-8 h-8 text-text-muted" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">Advanced settings coming soon</h3>
                    <p className="text-sm text-text-secondary max-w-xs mt-2">We're currently refining the {activeTab} options for Crew OS.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
