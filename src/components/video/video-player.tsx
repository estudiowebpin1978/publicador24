"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, SkipForward, SkipBack } from "lucide-react";

interface VideoScene {
  id: number;
  text: string;
  imageUrl: string;
  duration: number;
  transition: string;
}

interface VideoPlayerProps {
  scenes: VideoScene[];
  narrationUrl?: string | null;
  title?: string;
  totalDuration?: number;
}

export function VideoPlayer({
  scenes,
  narrationUrl,
  title,
  totalDuration,
}: VideoPlayerProps) {
  const [currentScene, setCurrentScene] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const scene = scenes[currentScene];

  React.useEffect(() => {
    if (isPlaying && scene) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 100 / (scene.duration * 10);
          if (newProgress >= 100) {
            if (currentScene < scenes.length - 1) {
              setCurrentScene((s) => s + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 100;
            }
          }
          return newProgress;
        });
      }, 100);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentScene, scene, scenes.length]);

  React.useEffect(() => {
    setProgress(0);
  }, [currentScene]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      audioRef.current?.pause();
    } else {
      setIsPlaying(true);
      audioRef.current?.play().catch(() => {});
    }
  };

  const goNext = () => {
    if (currentScene < scenes.length - 1) {
      setCurrentScene((s) => s + 1);
      setProgress(0);
    }
  };

  const goPrev = () => {
    if (currentScene > 0) {
      setCurrentScene((s) => s - 1);
      setProgress(0);
    }
  };

  const downloadScene = () => {
    if (!scene) return;
    const link = document.createElement("a");
    link.href = scene.imageUrl;
    link.download = `scene-${scene.id + 1}.png`;
    link.click();
  };

  if (!scene) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <p className="text-muted-foreground">No hay escenas para mostrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {narrationUrl && (
        <audio ref={audioRef} src={narrationUrl} preload="auto" />
      )}

      <div className="relative aspect-[9/16] max-h-[500px] mx-auto bg-black rounded-lg overflow-hidden">
        <img
          src={scene.imageUrl}
          alt={`Escena ${scene.id + 1}`}
          className="w-full h-full object-cover"
        />

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-white text-sm font-medium text-center">
            {scene.text}
          </p>
        </div>

        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-black/50 text-white">
            {scene.id + 1} / {scenes.length}
          </Badge>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={goPrev} disabled={currentScene === 0}>
          <SkipBack className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={togglePlay}>
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button variant="outline" size="icon-sm" onClick={goNext} disabled={currentScene === scenes.length - 1}>
          <SkipForward className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={downloadScene}>
          <Download className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setCurrentScene(i); setProgress(0); }}
            className={`w-12 h-20 rounded overflow-hidden border-2 transition-colors ${
              i === currentScene ? "border-primary" : "border-muted"
            }`}
          >
            <img
              src={s.imageUrl}
              alt={`Escena ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {totalDuration && (
        <p className="text-center text-sm text-muted-foreground">
          Duración total: ~{totalDuration}s
        </p>
      )}
    </div>
  );
}
