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
  TrendingUp,
  Clock,
  Target,
  BarChart3,
} from "lucide-react";

export default function AIControlCenterPage() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [loopResult, setLoopResult] = React.useState<any>(null);

  const runOrchestrator = useAction(api.orchestrator.runOrchestrator);
  const runLoop = useAction(api.autonomousLoop.runAutonomousLoop);
  const setKillSwitch = useAction(api.campaignHealth.setGlobalKillSwitch);
  const getGlobalHealth = useAction(api.campaignHealth.getGlobalHealth);
  const checkCosts = useAction(api.costControl.checkCostLimits);

  const [health, setHealth] = React.useState<any>(null);
  const [costs, setCosts] = React.useState<any>(null);
  const [globalStatus, setGlobalStatus] = React.useState<any>(null);

  const autopilotSettings = useQuery(api.autopilot.getSettings);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [healthData, costData] = await Promise.all([
        getGlobalHealth(),
        checkCosts(),
      ]);
      setHealth(healthData);
      setCosts(costData);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const handleRunLoop = async () => {
    setIsRunning(true);
    try {
      const result = await runLoop({});
      setLoopResult(result);
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
      setLoopResult(result);
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
            <div className="text-2xl font-bold">
              {health?.overallScore || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {health?.campaigns?.length || 0} campañas activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Hoy</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${costs?.costUsd?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Límite: ${costs?.costLimit || 1.00}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Hoy</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costs?.tokensUsed?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Límite: {costs?.tokensLimit?.toLocaleString() || 100000}
            </p>
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
              {new Date(loopResult.timestamp).toLocaleString("es-AR")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Campañas</p>
                <p className="text-lg font-bold">{loopResult.campaignsChecked}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contenido Generado</p>
                <p className="text-lg font-bold">{loopResult.contentGenerated}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Programado</p>
                <p className="text-lg font-bold">{loopResult.contentScheduled}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Publicado</p>
                <p className="text-lg font-bold">{loopResult.contentPublished}</p>
              </div>
            </div>
            {loopResult.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-destructive">Errores:</p>
                <ul className="mt-1 space-y-1">
                  {loopResult.errors.map((error: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {health?.campaigns && health.campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Salud por Campaña</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {health.campaigns.map((campaign: any) => (
                <div
                  key={campaign.campaignId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {campaign.status === "HEALTHY" && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {campaign.status === "WARNING" && (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    {campaign.status === "CRITICAL" && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.metrics.contentGenerated} generados •{" "}
                        {campaign.metrics.contentScheduled} programados •{" "}
                        {campaign.metrics.contentPublished} publicados
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        campaign.status === "HEALTHY"
                          ? "default"
                          : campaign.status === "WARNING"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {campaign.healthScore}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
