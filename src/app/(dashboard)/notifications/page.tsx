"use client";

import React from "react";
import { Bell, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: number;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/notifications?limit=20");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAll: true }) });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const markRead = async (id: string) => {
    try {
      await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Bell className="size-5 text-white" /></div>
          <div><h1 className="text-2xl font-bold text-white">Notificaciones</h1><p className="text-sm text-slate-400">Cargando...</p></div>
        </div>
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.03]" />)}</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Bell className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
          <p className="text-sm text-slate-400">Últimas actualizaciones de tu autopublicador</p>
        </div>
        {notifications.length > 0 && (
          <Button variant="outline" size="sm" className="ml-auto border-white/10 text-slate-400 hover:text-white" onClick={markAllRead}>
            Marcar todo como leído
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl">
          <Bell className="size-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Sin notificaciones</h3>
          <p className="text-slate-400 text-sm">Cuando haya novedades, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                n.read ? "bg-white/[0.01] border-white/[0.03] opacity-60" : "bg-white/[0.03] border-white/[0.06] hover:border-violet-500/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  n.type === "success" ? "bg-emerald-500/20 text-emerald-400" :
                  n.type === "warning" ? "bg-amber-500/20 text-amber-400" :
                  "bg-violet-500/20 text-violet-400"
                }`}>
                  {n.type === "success" ? <CheckCircle2 className="size-4" /> :
                   n.type === "warning" ? <AlertCircle className="size-4" /> :
                   <Info className="size-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white text-sm">{n.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">
                      {new Date(n.created_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
