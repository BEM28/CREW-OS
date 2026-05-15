import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { History, MessageSquare, Clock, ArrowUpRight, Search, LayoutGrid } from 'lucide-react';
import { collectionGroup, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase/client';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export default function Sessions() {
  const { user } = useUserStore();
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Use collectionGroup to find messages where the user was a participant or in their projects
    // Note: For simplicity in this demo, we'll fetch from a "unified" logs view if it existed, 
    // or just show recent activity from the main collections.
    // Since we don't have a global sessions collection, we'll pull from the project messages.
    
    const q = query(
      collectionGroup(db, 'messages'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // Extract project/company IDs from the path if possible, or assume context
          path: d.ref.path
        };
      });
      setRecentMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Sessions</h1>
            <p className="text-text-secondary mt-1">Review historical logs and active collaboration sessions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-text-muted font-medium">Syncing session logs...</p>
            </div>
          ) : recentMessages.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center glass-panel rounded-3xl border-dashed border-border">
              <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                <History className="text-text-muted w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">No sessions recorded yet</h3>
              <p className="text-sm text-text-secondary max-w-xs mt-2">Start a conversation in a project workspace to see your logs here.</p>
            </div>
          ) : (
            <div className="glass-panel border border-border rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-white/[0.02]">
                                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">Specialist</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">Last Message</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {recentMessages.map((msg) => (
                                <tr key={msg.id} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-sm shadow-inner">
                                                {msg.senderType === 'user' ? '👤' : '🤖'}
                                            </div>
                                            <span className="text-sm font-semibold text-text-primary">{msg.senderName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-text-secondary line-clamp-1 max-w-md">
                                            {msg.content}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs text-text-muted whitespace-nowrap">
                                            {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString() : 'Just now'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 rounded-lg text-text-muted hover:text-primary transition-colors">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
