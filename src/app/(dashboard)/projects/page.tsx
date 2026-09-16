"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Briefcase, FolderOpen } from "lucide-react";

interface Project {
  _id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  status: string;
  campaignCount?: number;
}

function RefreshCw(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const deleteProject = async (id: string) => {
    try {
      await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground">
            Organizá tus campañas por proyecto
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay proyectos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Creá tu primer proyecto para organizar tus campañas
            </p>
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Proyecto
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-violet-500" />
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                  </div>
                  <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
                    {project.status === "ACTIVE" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                {project.description && (
                  <CardDescription>{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {project.industry && (
                    <p className="text-sm text-muted-foreground">
                      Industria: {project.industry}
                    </p>
                  )}
                  {project.website && (
                    <p className="text-sm text-muted-foreground">
                      Web: {project.website}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Campañas: {project.campaignCount}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/campaigns?projectId=${project._id}`}>
                    <Button variant="outline" size="sm">
                      Ver Campañas
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProject(project._id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
