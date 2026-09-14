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
  CheckCircle,
  XCircle,
  Target,
  BarChart3,
} from "lucide-react";

export default function AIControlCenterPage() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [loopResult, setLoopResult] = React.useState<Record<string, unknown> | null>(null);

  const runOrchestrator = useAction(api.orchestrator.runOrchestrator);
  const runLoop = useAction(api.autonomousLoop.runAutonomousLoop);
  const setKillSwitch = useAction(api.campaignHealth.setGlobalKillSwitch);
  const getGlobalHealth = useAction(api.campaignHealth.getGlobalHealth);
  const checkCosts = useAction(api.campaignHealth.checkCostLimits);

  const [health, setHealth] = React.useState<Record<string, unknown> | null>(null);
  const [costs, setCosts] = React.useState<Record<string, unknown> | null>(null);

  const autopilotSettings = useQuery(api.autopilot.getSettings);

  const loadData = React.useCallback(async () => {
    try {
      const [healthData, costData] = await Promise.allSettled([
        getGlobalHealth(),
        checkCosts(),
      ]);
      if (healthData.status === "fulfilled") setHealth(healthData.value);
      if (costData.status === "fulfilled") setCosts(costData.value);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }, [getGlobalHealth, checkCosts]);

  React.useEffect(() => {
    let cancelled = false;
    loadData().then(() => {});
    return () => { cancelled = true; };
  }, [loadData]);

  const handleRunLoop = async () => {
    setIsRunning(true);
    try {
      const result = await runLoop({});
      setLoopResult(result as Record<string, unknown>);
      await loadData();
    } catch (error) {
      console.error("Loop failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunOrchestrator = async () => {
    setIsRunning(true);
    try {
      const result = await runOrchestrator({});
      setLoopResult(result as Record<string, unknown>);
      await loadData();
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
  const overallScore = (health as Record<string, unknown>)?.overallScore ?? 0;
  const campaignList = ((health as Record<string, unknown>)?.campaigns ?? []) as Array<Record<string, unknown>>;
  const costUsd = (costs as Record<string, unknown>)?.costUsd ?? 0;
  const costLimit = (costs as Record<string, unknown>)?.costLimit ?? 1.00;
  const tokensUsed = (costs as Record<string, unknown>)?.tokensUsed ?? 0;
  const tokensLimit = (costs as Record<string, unknown>)?.tokensLimit ?? 100000;

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
            <CardTitle className="text-sm font-medium">Salud General</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallScore}%</div>
            <p className="text-xs text-muted-foreground">{campaignList.length} campañas activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Hoy</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(costUsd).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Límite: ${Number(costLimit)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Hoy</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(tokensUsed).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Límite: {Number(tokensLimit).toLocaleString()}</p>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Campañas</p>
                <p className="text-lg font-bold">{Number(loopResult.campaignsChecked)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contenido Generado</p>
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
            </div>
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

      {campaignList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Salud por Campaña</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaignList.map((campaign) => {
                const status = campaign.status as string;
                const metrics = campaign.metrics as Record<string, unknown> || {};
                return (
                  <div key={campaign.campaignId as string} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      {status === "HEALTHY" && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {status === "WARNING" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                      {status === "CRITICAL" && <XCircle className="h-5 w-5 text-red-500" />}
                      <div>
                        <p className="font-medium">{campaign.name as string}</p>
                        <p className="text-sm text-muted-foreground">
                          {Number(metrics.contentGenerated || 0)} generados •{" "}
                          {Number(metrics.contentScheduled || 0)} programados •{" "}
                          {Number(metrics.contentPublished || 0)} publicados
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status === "HEALTHY" ? "default" : status === "WARNING" ? "secondary" : "destructive"}>
                        {campaign.healthScore as number}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
