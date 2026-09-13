"use client";

import * as React from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  Zap,
  Image as ImageIcon,
  Hash,
  Target,
  CheckCircle2,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: {
    campaignId?: string;
    campaignName?: string;
    piecesGenerated?: number;
    imagesGenerated?: number;
    hashtags?: string[];
    actions?: string[];
  };
  timestamp: Date;
}

const SUGGESTIONS = [
  "Quiero conseguir clientes para mi negocio de climatización de piscinas",
  "Necesito contenido para mi marca de ropa deportiva",
  "Creamos una campaña para promocionar nuestro curso de programación",
  "Quiero vender más de nuestros productos de skincare natural",
];

export default function ChatPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const processMessage = useAction(api.chatAI.processMessage);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await processMessage({ message: messageText });

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.response,
        data: {
          campaignId: result.campaignId,
          campaignName: result.campaignName,
          piecesGenerated: result.piecesGenerated,
          imagesGenerated: result.imagesGenerated,
          hashtags: result.hashtags,
          actions: result.actions,
        },
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Hubo un error al procesar tu mensaje. Intentá de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
              <Sparkles className="size-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              ¿Qué querés promocionar?
            </h1>
            <p className="text-slate-400 mb-8 max-w-md">
              Decime tu idea y yo me encargo de todo: estrategia, contenido, imágenes, hashtags y publicación automática.
            </p>

            <div className="grid gap-3 w-full max-w-lg">
              {SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(suggestion)}
                  className="text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/30 transition-all text-sm text-slate-300 hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="size-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-white/5 border border-white/10 text-slate-200"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>

                  {message.data && (
                    <div className="mt-4 space-y-3">
                      {message.data.campaignName && (
                        <div className="flex items-center gap-2">
                          <Target className="size-4 text-violet-400" />
                          <span className="text-sm font-medium text-violet-400">
                            {message.data.campaignName}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {message.data.piecesGenerated && message.data.piecesGenerated > 0 && (
                          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                            <Sparkles className="size-3 mr-1" />
                            {message.data.piecesGenerated} piezas
                          </Badge>
                        )}
                        {message.data.hashtags && message.data.hashtags.length > 0 && (
                          <Badge className="bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30">
                            <Hash className="size-3 mr-1" />
                            {message.data.hashtags.length} hashtags
                          </Badge>
                        )}
                      </div>

                      {message.data.hashtags && message.data.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {message.data.hashtags.map((tag, i) => (
                            <span key={i} className="text-xs text-slate-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {message.data.campaignId && (
                        <a
                          href={`/campaigns/${message.data.campaignId}`}
                          className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-2"
                        >
                          <CheckCircle2 className="size-3" />
                          Ver campaña completa
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-slate-500">
                    {message.timestamp.toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="size-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <User className="size-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="size-4 text-white" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/5 bg-[#0a0a14]/80 backdrop-blur-xl p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-3xl mx-auto flex gap-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Decime qué querés promocionar..."
            disabled={isLoading}
            className="flex-1 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="lg"
            className="h-12 px-6"
          >
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
