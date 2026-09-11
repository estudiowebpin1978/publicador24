"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload } from "lucide-react"

interface CSVImportProps {
  onImport?: (data: CSVRow[]) => void
  className?: string
}

interface CSVRow {
  [key: string]: string
}

interface ColumnMapping {
  csvColumn: string
  field: string | null
}

export function CSVImport({ onImport, className }: CSVImportProps) {
  const [step, setStep] = React.useState<"upload" | "mapping" | "preview">("upload")
  const [, setFile] = React.useState<File | null>(null)
  const [, setHeaders] = React.useState<string[]>([])
  const [rows, setRows] = React.useState<CSVRow[]>([])
  const [mappings, setMappings] = React.useState<ColumnMapping[]>([])

  const fields = ["title", "content", "platform", "hashtags", "schedule_date", "schedule_time"]

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())
      if (lines.length < 2) return

      const csvHeaders = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      const csvRows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
        const row: CSVRow = {}
        csvHeaders.forEach((header, i) => {
          row[header] = values[i] || ""
        })
        return row
      })

      setHeaders(csvHeaders)
      setRows(csvRows)
      setMappings(csvHeaders.map((h) => ({ csvColumn: h, field: "" })))
      setStep("mapping")
    }
    reader.readAsText(uploadedFile)
  }

  const updateMapping = (index: number, field: string | null) => {
    setMappings((prev) => {
      const newMappings = [...prev]
      newMappings[index] = { ...newMappings[index], field }
      return newMappings
    })
  }

  const handleImport = () => {
    onImport?.(rows)
    setStep("upload")
    setFile(null)
    setHeaders([])
    setRows([])
    setMappings([])
  }

  if (step === "upload") {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-12">
          <div
            className="rounded-xl border-2 border-dashed p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("csv-upload")?.click()}
          >
            <Upload className="mx-auto size-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">Subir Archivo CSV</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Arrastrá y soltá tu archivo CSV acá, o hacé clic para buscar
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Admite archivos .csv de hasta 10MB
            </p>
          </div>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
        </CardContent>
      </Card>
    )
  }

  if (step === "mapping") {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Mapear Columnas</span>
            <Badge variant="secondary">{rows.length} filas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mapeá las columnas de tu CSV con los campos correspondientes
          </p>
          <div className="space-y-3">
            {mappings.map((mapping, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <Badge variant="outline" className="font-mono">
                    {mapping.csvColumn}
                  </Badge>
                </div>
                <span className="text-muted-foreground">→</span>
                <Select
                  value={mapping.field}
                  onValueChange={(v) => updateMapping(index, v)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Atrás
            </Button>
            <Button onClick={() => setStep("preview")}>Vista Previa</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Vista Previa de Datos</span>
          <Badge variant="secondary">{rows.length} filas</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {mappings
                  .filter((m): m is ColumnMapping & { field: string } => m.field !== null)
                  .map((m) => (
                    <TableHead key={m.csvColumn}>
                      {m.field.replace(/_/g, " ")}
                    </TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 5).map((row, i) => (
                <TableRow key={i}>
                  {mappings
                    .filter((m) => m.field)
                    .map((m) => (
                      <TableCell key={m.csvColumn} className="max-w-[200px] truncate">
                        {row[m.csvColumn]}
                      </TableCell>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {rows.length > 5 && (
          <p className="text-center text-sm text-muted-foreground">
            Mostrando 5 de {rows.length} filas
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setStep("mapping")}>
            Atrás
          </Button>
          <Button onClick={handleImport}>
            Importar {rows.length} Filas
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
