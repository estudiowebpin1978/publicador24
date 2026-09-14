"use client";

import * as React from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Play,
  Pause,
  RefreshCw,
  Zap,
  AlertTriangle,
  Target,
  BarChart3,
} from "lucide-react";

export default function AIControlCenterPage() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [loopResult, setLoopResult] = React.useState<Record<string, unknown> | null>(null);

  const setKillSwitch = useAction(api.campaignHealth.setGlobalKillSwitch);

  const [health, setHealth] = React.useState<Record<string, unknown> | null>(null);

  const autopilotSettings = useQuery(api.autopilot.getSettings);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (!cancelled) {
          setHealth(data);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshHealth = async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
    } catch (error) {
      console.error("Failed to refresh health:", error);
    }
  };

  const handleRunLoop = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/autopilot", { method: "POST" });
      const result = await res.json();
      setLoopResult(result);
      await refreshHealth();
    } catch (error) {
      console.error("Loop failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunOrchestrator = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/autopilot", { method: "POST" });
      const result = await res.json();
      setLoopResult(result);
      await refreshHealth();
    } catch (error) {
      console.error("Orchestrator failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleKillSwitch = async () => {
    const isPaused = autopilotSettings?.level === "STOPPED";
    await setKillSwitch({ paused: !isPaused });
  };

  const isPaused = autopilotSettings?.level === "STOPPED";
  const healthData = (health as Record<string, unknown>) || {};
  const integrations = (healthData.integrations as Record<string, unknown>) || {};
  const costTracking = (integrations.costTracking as Record<string, unknown>) || {};
  const costUsd = costTracking.todayCostUsd ?? 0;
  const tokensUsed = costTracking.todayTokens ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centro de Control AI</h1>
          <p className="text-muted-foreground">
            Motor autónomo de contenido y campañas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRunOrchestrator}
            disabled={isRunning || isPaused}
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
            Orquestador
          </Button>
          <Button
            onClick={handleRunLoop}
            disabled={isRunning || isPaused}
          >
            <Play className={`mr-2 h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
            Ejecutar Loop
          </Button>
          <Button
            onClick={handleToggleKillSwitch}
            variant={isPaused ? "default" : "destructive"}
          >
            {isPaused ? (
              <>
                <Play className="mr-2 h-4 w-4" />
                Reanudar
              </>
            ) : (
              <>
                <Pause className="mr-2 h-4 w-4" />
                PARAR AUTOMATIZACIÓN
              </>
            )}
          </Button>
        </div>
      </div>

      {isPaused && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="font-medium text-destructive">Automatización Pausada</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            El sistema está detenido. No se generará ni publicará contenido automáticamente.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado AI</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(integrations.ai as Record<string, unknown>)?.status === "CONFIGURED" ? (
                <Badge variant="default" className="bg-green-500">CONECTADO</Badge>
              ) : (
                <Badge variant="destructive">SIN CLAVE</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {(integrations.ai as Record<string, unknown>)?.provider || "none"} • {(integrations.ai as Record<string, unknown>)?.model || ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buffer</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(integrations.buffer as Record<string, unknown>)?.status === "CONFIGURED" ? (
                <Badge variant="default" className="bg-green-500">CONECTADO</Badge>
              ) : (
                <Badge variant="destructive">SIN CLAVE</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {(integrations.buffer as Record<string, unknown>)?.apiKeyPresent ? "API key configured" : "Placeholder detected"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Hoy</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(costUsd).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">{Number(tokensUsed).toLocaleString()} tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPaused ? (
                <Badge variant="destructive">PARADO</Badge>
              ) : (
                <Badge variant="default" className="bg-green-500">ACTIVO</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Nivel: {autopilotSettings?.level || "OFF"}
            </p>
          </CardContent>
        </Card>
      </div>

      {loopResult && (
        <Card>
          <CardHeader>
            <CardTitle>Último Resultado del Loop</CardTitle>
            <CardDescription>
              {new Date(Number(loopResult.timestamp)).toLocaleString("es-AR")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-sm text-muted-foreground">Campañas</p>
                <p className="text-lg font-bold">{Number(loopResult.campaignsChecked)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Generado</p>
                <p className="text-lg font-bold">{Number(loopResult.contentGenerated)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Programado</p>
                <p className="text-lg font-bold">{Number(loopResult.contentScheduled)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Publicado</p>
                <p className="text-lg font-bold">{Number(loopResult.contentPublished)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Learning</p>
                <p className="text-lg font-bold">{Number(loopResult.learningUpdates)}</p>
              </div>
            </div>
            {(loopResult.details as string[])?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium">Detalles:</p>
                <ul className="mt-1 space-y-1">
                  {(loopResult.details as string[]).map((detail: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground">• {detail}</li>
                  ))}
                </ul>
              </div>
            )}
            {(loopResult.errors as string[])?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-destructive">Errores:</p>
                <ul className="mt-1 space-y-1">
                  {(loopResult.errors as string[]).map((error: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
