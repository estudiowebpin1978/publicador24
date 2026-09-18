"use client";

import * as React from "react";
import { Globe, Plus, ExternalLink, Copy, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Campaign {
  id: string;
  name: string;
  description: string;
}

interface LandingPage {
  id: string;
  campaign_id: string | null;
  name: string;
  description: string;
  cta: string;
  slug: string;
  created_at: string;
}

export default function LandingPagesPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [landingPages, setLandingPages] = React.useState<LandingPage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/campaigns").then((r) => r.json()),
      fetch("/api/landing-pages").then((r) => r.json()),
    ])
      .then(([campaignsData, pagesData]) => {
        setCampaigns(campaignsData.campaigns || []);
        setLandingPages(pagesData.landingPages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generatePage = async (campaign: Campaign) => {
    setGenerating(campaign.id);
    try {
      const res = await fetch("/api/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          name: campaign.name,
          description: campaign.description,
          cta: "Conocer mas",
          url: "",
        }),
      });
      const data = await res.json();
      if (data.landingPage) {
        setLandingPages((prev) => [data.landingPage, ...prev]);
      }
    } catch {
    } finally {
      setGenerating(null);
    }
  };

  const copyUrl = (slug: string, id: string) => {
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(`${baseUrl}/lp/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const previewPage = async (id: string) => {
    try {
      const res = await fetch(`/api/landing-pages?id=${id}`);
      const data = await res.json();
      if (data.html) {
        setPreviewHtml(data.html);
      }
    } catch {
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Globe className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Landing Pages</h1>
            <p className="text-sm text-slate-400">Cargando...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="h-48 animate-pulse bg-white/[0.03]" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Globe className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Landing Pages</h1>
          <p className="text-sm text-slate-400">
            Genera landing pages automaticas para tus campanas
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Generar nueva</h2>
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-slate-400">Crea una campana primero para generar una landing page.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const hasPage = landingPages.some((lp) => lp.campaign_id === campaign.id);
              return (
                <Card key={campaign.id} className="hover:border-violet-500/20 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white text-sm truncate">{campaign.name}</h3>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {campaign.description || "Sin descripcion"}
                        </p>
                      </div>
                      {hasPage && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 ml-2">
                          Generada
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant={hasPage ? "outline" : "default"}
                      size="sm"
                      className="w-full mt-3"
                      disabled={generating === campaign.id}
                      onClick={() => generatePage(campaign)}
                    >
                      {generating === campaign.id ? (
                        <>Generando...</>
                      ) : hasPage ? (
                        <>
                          <Sparkles className="size-3.5 mr-1.5" />
                          Regenerar
                        </>
                      ) : (
                        <>
                          <Plus className="size-3.5 mr-1.5" />
                          Generar Landing Page
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Landing Pages generadas</h2>
        {landingPages.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Globe className="size-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Sin landing pages</h3>
              <p className="text-sm text-slate-400">
                Genera tu primera landing page desde una campana.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {landingPages.map((lp) => (
              <Card key={lp.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{lp.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {lp.description || "Sin descripcion"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">
                      {lp.cta}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-xs text-slate-500">
                      /lp/{lp.slug}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => copyUrl(lp.slug, lp.id)}
                      >
                        {copiedId === lp.id ? (
                          <>Copiado ✓</>
                        ) : (
                          <>
                            <Copy className="size-3.5 mr-1" />
                            Copiar URL
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          window.open(`/lp/${lp.slug}`, "_blank");
                        }}
                      >
                        <ExternalLink className="size-3.5 mr-1" />
                        Abrir
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-slate-400"
                      onClick={() => previewPage(lp.id)}
                    >
                      <Eye className="size-3.5 mr-1" />
                      Vista previa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[80vh] bg-white rounded-2xl overflow-hidden relative">
            <button
              className="absolute top-3 right-3 z-10 size-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
              onClick={() => setPreviewHtml(null)}
            >
              ✕
            </button>
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Landing page preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
