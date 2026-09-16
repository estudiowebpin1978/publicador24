"use client"
export const dynamic = 'force-dynamic'

import * as React from "react"
import { AccountCard } from "@/components/social/account-card"
import { ConnectDialog } from "@/components/social/connect-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Users, AlertCircle } from "lucide-react"

interface SocialAccount {
  _id: string
  platform: string
  displayName?: string
  username?: string
  avatarUrl?: string
  status: string
  tokenStatus?: string
  lastPostAt?: number
  permissions?: string[]
}

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<SocialAccount[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/social-accounts")
      .then((res) => res.json())
      .then((data) => setAccounts(data.accounts || data || []))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false))
  }, [])

  const handleConnect = async (platform: string) => {
    window.open("/setup", "_self")
  }

  const handleReconnect = async (platform: string) => {
    console.log("Reconnect:", platform)
  }

  const handleDisconnect = async (platform: string) => {
    const account = accounts.find((a) => a.platform === platform)
    if (account) {
      try {
        await fetch("/api/social-accounts", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: account._id }),
        })
        setAccounts((prev) => prev.filter((a) => a._id !== account._id))
      } catch (error) {
        console.error("Failed to disconnect:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cuentas Sociales</h1>
            <p className="text-muted-foreground">Gestioná tus cuentas de redes sociales conectadas.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="h-20 animate-pulse bg-muted" /></Card>
          <Card><CardContent className="h-20 animate-pulse bg-muted" /></Card>
          <Card><CardContent className="h-20 animate-pulse bg-muted" /></Card>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-40" /></Card>
          ))}
        </div>
      </div>
    )
  }

  const connectedCount = accounts.filter((a) => a.status === "connected").length
  const errorCount = accounts.filter((a) => a.status === "error" || a.tokenStatus === "expired").length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cuentas Sociales</h1>
          <p className="text-muted-foreground">Gestioná tus cuentas de redes sociales conectadas.</p>
        </div>
        <ConnectDialog onConnect={handleConnect} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-blue-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Cuentas</p>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-green-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conectado</p>
              <p className="text-2xl font-bold">{connectedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-red-600">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Problemas</p>
              <p className="text-2xl font-bold">{errorCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Ninguna cuenta conectada. Hacé clic en "Conectar Nueva Cuenta" para empezar.
          </div>
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account._id}
              platform={account.platform}
              name={account.displayName || account.username}
              username={account.username}
              avatar={account.avatarUrl}
              status={account.status as "connected" | "disconnected" | "error"}
              tokenStatus={account.tokenStatus as "valid" | "expiring" | "expired"}
              lastPost={account.lastPostAt ? formatRelativeTime(account.lastPostAt) : undefined}
              permissions={account.permissions}
              onConnect={() => handleConnect(account.platform)}
              onReconnect={() => handleReconnect(account.platform)}
              onDisconnect={() => handleDisconnect(account.platform)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "ahora mismo"
  if (minutes < 60) return `${minutes}m hace`
  if (hours < 24) return `${hours}h hace`
  if (days < 7) return `${days}d hace`
  return new Date(timestamp).toLocaleDateString()
}
