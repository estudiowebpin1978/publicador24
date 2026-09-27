import { NextRequest, NextResponse } from "next/server";
import { POST as autopilotPost } from "@/app/api/autopilot/route";

/**
 * Alias inteligente del autopilot.
 *
 * Antes tenía su propia lógica y causaba dos problemas: filtraba las campañas
 * con `status = "active"` (la tabla usa `ACTIVE`, así que nunca encontraba
 * ninguna) y vaciaba la cola entera de Buffer sin respetar el mínimo de
 * posts. Ahora delega en el motor principal, que ya tiene cuotas, backoff,
 * rotación de proveedores y limpieza con throttling.
 */
export async function POST(request?: NextRequest) {
  try {
    const req = request ?? new NextRequest("http://internal/api/autopilot");
    return await autopilotPost(req);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
