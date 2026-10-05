import { redirect } from "next/navigation";

// El autopublicador es independiente del producto que se promocione.
// Al entrar se va directo a la sección de Campañas (la quiniela es una campaña más).
export default function DashboardPage() {
  redirect("/campaigns");
}
