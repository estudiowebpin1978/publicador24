"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ContentInput, type ContentInputData } from "@/components/content/content-input"
import { AIAnalysis, type AIAnalysisResult } from "@/components/content/ai-analysis"
import { HookGenerator, type Hook } from "@/components/content/hook-generator"
import { TitleGenerator, type Title } from "@/components/content/title-generator"
import { CaptionGenerator, type CaptionVariant } from "@/components/content/caption-generator"
import { PlatformAdaptation, type PlatformAdaptation as PlatformAdaptType } from "@/components/content/platform-adaptation"
import { ContentScoring, type ContentScore } from "@/components/content/content-scoring"
import { SchedulePanel, type BestTimeRecommendation } from "@/components/content/schedule-panel"
import { ReviewPanel, type PlatformPreview } from "@/components/content/review-panel"
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Send,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import type { SocialPlatform, SpamRiskLevel } from "@/types"
import { useMutation, useAction } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"

const STEPS = [
  "Ingresar Contenido",
  "Análisis IA",
  "Generar",
  "Adaptación por Plataforma",
  "Puntaje y Seguridad",
  "Programar",
  "Revisar y Publicar",
] as const

interface WizardState {
  currentStep: number
  input: ContentInputData
  analysis: AIAnalysisResult | null
  hooks: Hook[]
  titles: Title[]
  captions: CaptionVariant[]
  selectedHookId: string | null
  selectedTitleId: string | null
  selectedCaptionId: string | null
  adaptations: PlatformAdaptType[]
  score: ContentScore | null
  recommendations: BestTimeRecommendation[]
  previews: PlatformPreview[]
  decision: "approved" | "rejected" | null
}

const initialState: WizardState = {
  currentStep: 0,
  input: { text: "", url: "", productName: "", image: null, video: null },
  analysis: null,
  hooks: [],
  titles: [],
  captions: [],
  selectedHookId: null,
  selectedTitleId: null,
  selectedCaptionId: null,
  adaptations: [],
  score: null,
  recommendations: [],
  previews: [],
  decision: null,
}

function generateMockData(input: ContentInputData) {
  const topic = input.productName || input.text?.slice(0, 50) || "Social Media Strategy"

  const analysis: AIAnalysisResult = {
    topic: `Content Strategy: ${topic}`,
    entities: ["Marketing", "Social Media", "Content Creation", "Brand Strategy"],
    keywords: ["engagement", "growth", "viral", "trending", "audience"],
    intent: "Engagement & Awareness",
    sentiment: "positive",
    audience: "Digital marketers, entrepreneurs, content creators",
    category: "Marketing & Business",
  }

  const hooks: Hook[] = [
    { id: "h1", text: `Stop scrolling — this changes how you think about ${topic}`, type: "Curiosity", score: 92 },
    { id: "h2", text: `What if I told you ${topic} could 10x your results?`, type: "Question", score: 87 },
    { id: "h3", text: `Everyone gets ${topic} wrong. Here's why.`, type: "Contrarian", score: 85 },
    { id: "h4", text: `The #1 benefit of ${topic} that nobody talks about`, type: "Benefit", score: 83 },
    { id: "h5", text: `How we went from 0 to 100K using ${topic}`, type: "Story", score: 80 },
  ]

  const titles: Title[] = [
    {
      id: "t1",
      text: `The Ultimate Guide to ${topic} in 2026`,
      score: 91,
      breakdown: { clarity: 95, curiosity: 85, relevance: 92, length: 88, platformFit: 95 },
    },
    {
      id: "t2",
      text: `Why ${topic} Is the Secret Weapon You're Missing`,
      score: 86,
      breakdown: { clarity: 82, curiosity: 94, relevance: 85, length: 80, platformFit: 90 },
    },
    {
      id: "t3",
      text: `${topic}: What Nobody Tells You (But Should)`,
      score: 82,
      breakdown: { clarity: 78, curiosity: 90, relevance: 80, length: 85, platformFit: 78 },
    },
  ]

  const captions: CaptionVariant[] = [
    {
      id: "c1",
      style: "Original",
      text: `Discover the power of ${topic}. Our latest approach combines cutting-edge strategy with proven techniques to help you achieve remarkable results. Whether you're just starting out or looking to scale, this is for you.\n\nReady to transform your approach? Let's get started.`,
      wordCount: 48,
      score: 88,
    },
    {
      id: "c2",
      style: "Short",
      text: `${topic} just got easier. Here's how to use it to your advantage.`,
      wordCount: 12,
      score: 79,
    },
    {
      id: "c3",
      style: "Long",
      text: `In today's fast-paced digital landscape, mastering ${topic} has become essential for anyone looking to make an impact.\n\nHere's what we've learned after working with hundreds of brands:\n\n1. Consistency beats perfection every single time\n2. Understanding your audience is non-negotiable\n3. The best content comes from genuine experience\n4. Data should inform, not dictate, your creative process\n5. Community building is the ultimate long-term play\n\nThe brands that win aren't just posting — they're connecting. They're creating content that resonates, educates, and inspires action.\n\nWhich tip resonates most with you? Drop a comment below.`,
      wordCount: 124,
      score: 93,
    },
    {
      id: "c4",
      style: "Storytelling",
      text: `Six months ago, we were struggling with ${topic}. Nothing seemed to work.\n\nThen we made one simple shift that changed everything.\n\nWe stopped trying to be perfect and started being real.\n\nThe result? A 340% increase in engagement and a community that actually cares.\n\nThis is that story — and the exact playbook we used.`,
      wordCount: 56,
      score: 90,
    },
    {
      id: "c5",
      style: "Educational",
      text: `Quick breakdown on ${topic}:\n\nWhat it is: A strategic approach to creating and distributing valuable content\nWhy it matters: It builds trust, drives traffic, and converts followers into customers\nHow to start: Focus on one platform, post consistently, and engage with your audience\n\nPro tip: Track your metrics weekly, but don't obsess over vanity numbers.`,
      wordCount: 52,
      score: 85,
    },
    {
      id: "c6",
      style: "Promotional",
      text: `🚀 Ready to level up your ${topic} game?\n\nWe just launched our new framework and the results speak for themselves:\n\n✅ 3x more engagement\n✅ 50% less time creating\n✅ Content that actually converts\n\nLimited spots available. Link in bio.`,
      wordCount: 38,
      score: 81,
    },
  ]

  const platforms: SocialPlatform[] = ["tiktok", "instagram", "facebook", "x", "youtube", "linkedin"]
  const adaptations: PlatformAdaptType[] = platforms.map((platform) => ({
    platform,
    hook: hooks[0].text,
    caption: captions[0].text,
    hashtags: ["#marketing", "#growth", "#socialmedia", "#tips", "#contentcreator"],
    cta: "Follow for more",
    score: Math.floor(Math.random() * 15) + 80,
  }))

  const score: ContentScore = {
    overall: 87,
    breakdown: {
      hook: 92,
      relevance: 88,
      clarity: 85,
      emotion: 82,
      trend: 90,
      hashtags: 78,
      platform_fit: 91,
      cta: 85,
    },
    spamRisk: "LOW" as SpamRiskLevel,
    platformValidation: platforms.map((p) => ({
      platform: p,
      valid: true,
      issues: [],
    })),
    explanation:
      "This content scores well across all dimensions. The hook is compelling, the message is clear, and the tone matches the target audience. Hashtag strategy could be slightly more niche-specific.",
    suggestions: [
      "Add 2-3 niche-specific hashtags to improve discoverability",
      "Include a stronger emotional trigger in the opening line",
      "Consider adding a user-generated content element for social proof",
    ],
  }

  const recommendations: BestTimeRecommendation[] = [
    { platform: "instagram", bestTimes: ["9:00 AM", "12:30 PM", "7:00 PM"], frequency: "1-2x/day" },
    { platform: "tiktok", bestTimes: ["7:00 AM", "12:00 PM", "7:00 PM"], frequency: "3-5x/day" },
    { platform: "facebook", bestTimes: ["9:00 AM", "1:00 PM"], frequency: "1x/day" },
    { platform: "x", bestTimes: ["8:00 AM", "12:00 PM", "5:00 PM"], frequency: "3-5x/day" },
    { platform: "youtube", bestTimes: ["2:00 PM", "4:00 PM"], frequency: "1-2x/week" },
    { platform: "linkedin", bestTimes: ["7:30 AM", "12:00 PM"], frequency: "1x/day" },
  ]

  const previews: PlatformPreview[] = [
    {
      platform: "instagram",
      hook: hooks[0].text,
      caption: captions[2].text,
      hashtags: ["#marketing", "#growth", "#socialmedia", "#tips", "#contentcreator"],
      cta: "Follow for more",
    },
    {
      platform: "tiktok",
      hook: hooks[0].text,
      caption: captions[1].text,
      hashtags: ["#fyp", "#marketing", "#growth", "#viral"],
      cta: "Follow for more",
    },
    {
      platform: "x",
      hook: hooks[0].text,
      caption: captions[1].text,
      hashtags: ["#marketing", "#growth"],
      cta: "What do you think?",
    },
    {
      platform: "facebook",
      hook: hooks[0].text,
      caption: captions[0].text,
      hashtags: ["#marketing", "#growth", "#socialmedia"],
      cta: "Share your thoughts",
    },
  ]

  return { analysis, hooks, titles, captions, adaptations, score, recommendations, previews }
}

export default function CreateContentPage() {
  const [state, setState] = React.useState<WizardState>(initialState)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)

  const generateContent = useAction(api.generateContent.generateFullContent)
  const createContent = useMutation(api.content.create)

  const setStep = (step: number) =>
    setState((prev) => ({ ...prev, currentStep: Math.max(0, Math.min(step, STEPS.length - 1)) }))

  const handleInputSubmit = async (data: ContentInputData) => {
    setIsAnalyzing(true)
    setState((prev) => ({ ...prev, input: data }))
    
    try {
      const result = await generateContent({
        topic: data.productName || data.text || "Content",
        audience: "general audience",
        platforms: ["instagram", "x", "facebook"],
        tone: "professional",
        language: "en",
        brandVoice: { tone: "professional", style: "conversational" },
      })
      
      setState((prev) => ({
        ...prev,
        analysis: {
          topic: result.title,
          entities: [],
          keywords: [],
          intent: "Engagement & Awareness",
          sentiment: "positive",
          audience: "general audience",
          category: "Marketing & Business",
        },
        currentStep: 1,
      }))
    } catch (error) {
      console.error("Failed to generate content:", error)
      const mock = generateMockData(data)
      setState((prev) => ({
        ...prev,
        analysis: mock.analysis,
        currentStep: 1,
      }))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      const mock = generateMockData(state.input)
      setState((prev) => ({
        ...prev,
        hooks: mock.hooks,
        titles: mock.titles,
        captions: mock.captions,
        currentStep: 2,
      }))
      setIsGenerating(false)
    }, 2000)
  }

  const handleGenerateAdaptations = () => {
    setIsGenerating(true)
    setTimeout(() => {
      const mock = generateMockData(state.input)
      setState((prev) => ({
        ...prev,
        adaptations: mock.adaptations,
        currentStep: 3,
      }))
      setIsGenerating(false)
    }, 1500)
  }

  const handleGenerateScore = () => {
    setIsGenerating(true)
    setTimeout(() => {
      const mock = generateMockData(state.input)
      setState((prev) => ({
        ...prev,
        score: mock.score,
        currentStep: 4,
      }))
      setIsGenerating(false)
    }, 1000)
  }

  const handleGenerateSchedule = () => {
    const mock = generateMockData(state.input)
    setState((prev) => ({
      ...prev,
      recommendations: mock.recommendations,
      currentStep: 5,
    }))
  }

  const handleGenerateReview = () => {
    const mock = generateMockData(state.input)
    setState((prev) => ({
      ...prev,
      previews: mock.previews,
      currentStep: 6,
    }))
  }

  const handleApprove = () =>
    setState((prev) => ({ ...prev, decision: "approved" }))
  const handleReject = () =>
    setState((prev) => ({ ...prev, decision: "rejected" }))

  const handlePublish = async () => {
    if (state.decision === "approved") {
      try {
        await createContent({
          title: state.titles.find(t => t.id === state.selectedTitleId)?.text || "Generated Content",
          description: state.captions.find(c => c.id === state.selectedCaptionId)?.text || "",
          contentType: "post",
          language: "en",
          targetPlatforms: state.adaptations.map(a => a.platform),
          brandVoice: { tone: "professional", style: "conversational" },
          metadata: {
            generatedFrom: "wizard",
            hooks: state.hooks,
            selectedHook: state.hooks.find(h => h.id === state.selectedHookId),
            selectedTitle: state.titles.find(t => t.id === state.selectedTitleId),
            selectedCaption: state.captions.find(c => c.id === state.selectedCaptionId),
          },
        })
        alert("¡Contenido publicado con éxito!")
      } catch (error) {
        console.error("Failed to publish:", error)
        alert("Error al publicar el contenido")
      }
    }
  }

  const canGoNext = () => {
    switch (state.currentStep) {
      case 0:
        return !!(state.input.text || state.input.url || state.input.productName)
      case 1:
        return !!state.analysis
      case 2:
        return !!(state.selectedHookId && state.selectedTitleId && state.selectedCaptionId)
      case 3:
        return state.adaptations.length > 0
      case 4:
        return !!state.score
      case 5:
        return true
      default:
        return false
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/content">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crear Contenido</h1>
          <p className="text-muted-foreground">
            Asistente de 7 pasos para crear contenido con IA
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <button
              onClick={() => i <= state.currentStep && setStep(i)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                i === state.currentStep
                  ? "bg-primary text-primary-foreground"
                  : i < state.currentStep
                    ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                    : "text-muted-foreground cursor-default"
              )}
              disabled={i > state.currentStep}
            >
              {i < state.currentStep ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <span className="flex size-5 items-center justify-center rounded-full bg-background/20 text-xs">
                  {i + 1}
                </span>
              )}
              <span className="hidden sm:inline">{step}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-4 flex-shrink-0",
                  i < state.currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="min-h-[500px]">
        {state.currentStep === 0 && (
          <ContentInput
            onSubmit={handleInputSubmit}
            isAnalyzing={isAnalyzing}
          />
        )}

        {state.currentStep === 1 && (
          <AIAnalysis analysis={state.analysis} />
        )}

        {state.currentStep === 2 && (
          <div className="grid gap-6 lg:grid-cols-3">
            <HookGenerator
              hooks={state.hooks}
              selectedHookId={state.selectedHookId ?? undefined}
              onSelect={(h) => setState((p) => ({ ...p, selectedHookId: h.id }))}
              onRegenerate={handleGenerate}
              isGenerating={isGenerating}
            />
            <TitleGenerator
              titles={state.titles}
              selectedTitleId={state.selectedTitleId ?? undefined}
              onSelect={(t) => setState((p) => ({ ...p, selectedTitleId: t.id }))}
              onRegenerate={handleGenerate}
              isGenerating={isGenerating}
            />
            <CaptionGenerator
              captions={state.captions}
              selectedCaptionId={state.selectedCaptionId ?? undefined}
              onSelect={(c) => setState((p) => ({ ...p, selectedCaptionId: c.id }))}
            />
          </div>
        )}

        {state.currentStep === 3 && (
          <PlatformAdaptation adaptations={state.adaptations} />
        )}

        {state.currentStep === 4 && state.score && (
          <ContentScoring score={state.score} />
        )}

        {state.currentStep === 5 && (
          <SchedulePanel
            recommendations={state.recommendations}
            onPublishNow={handleGenerateReview}
            onSchedule={handleGenerateReview}
          />
        )}

        {state.currentStep === 6 && (
          <ReviewPanel
            previews={state.previews}
            decision={state.decision}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={() => setStep(0)}
          />
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(state.currentStep - 1)}
          disabled={state.currentStep === 0}
        >
          <ArrowLeft className="size-4" />
          Atrás
        </Button>

        <div className="flex gap-2">
          {state.currentStep === 0 && (
            <Button onClick={() => handleInputSubmit(state.input)} disabled={isAnalyzing}>
              <Sparkles className="size-4" />
              Analizar
            </Button>
          )}

          {state.currentStep === 1 && (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles className="size-4" />
              {isGenerating ? "Generando..." : "Generar Contenido"}
            </Button>
          )}

          {state.currentStep === 2 && (
            <Button onClick={handleGenerateAdaptations} disabled={!canGoNext() || isGenerating}>
              <Sparkles className="size-4" />
              {isGenerating ? "Adaptando..." : "Adaptar para Plataformas"}
            </Button>
          )}

          {state.currentStep === 3 && (
            <Button onClick={handleGenerateScore} disabled={isGenerating}>
              <Sparkles className="size-4" />
              {isGenerating ? "Evaluando..." : "Evaluar Contenido"}
            </Button>
          )}

          {state.currentStep === 4 && (
            <Button onClick={handleGenerateSchedule}>
              <ArrowRight className="size-4" />
              Programar
            </Button>
          )}

          {state.currentStep === 5 && (
            <Button onClick={handleGenerateReview}>
              <ArrowRight className="size-4" />
              Revisar
            </Button>
          )}

          {state.currentStep === 6 && state.decision === "approved" && (
            <Button onClick={handlePublish}>
              <Send className="size-4" />
              Publicar
            </Button>
          )}

          {state.currentStep < 6 && state.currentStep > 0 && state.currentStep !== 2 && (
            <Button onClick={() => setStep(state.currentStep + 1)} disabled={!canGoNext()}>
              <ArrowRight className="size-4" />
              Siguiente
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}