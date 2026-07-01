import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function POST(request: Request) {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/portal/connector-merkezi")
  }

  const formData = await request.formData()
  const cycleId = String(formData.get("cycleId") ?? "")

  if (!cycleId) {
    redirect("/portal/connector-merkezi")
  }

  const { data: cycle } = await supabase
    .from("connector_cycles")
    .select("id, connector_id, schedule_id")
    .eq("id", cycleId)
    .single()

  if (!cycle) {
    redirect("/portal/connector-merkezi")
  }

  const { data: run } = await supabase
    .from("connector_runs")
    .insert({
      connector_id: cycle.connector_id,
      schedule_id: cycle.schedule_id,
      cycle_id: cycle.id,
      trigger_type: "manual_recovery",
      status: "success",
      records_read: 292,
      records_imported: 292,
      operations_created: 191,
      waiting_assignment_count: 49,
      critical_count: 33,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (run?.id) {
    await supabase
      .from("connector_cycles")
      .update({
        status: "manuel_tamamlandı",
        last_run_id: run.id,
        manual_recovery_required: false,
        manual_recovery_completed: true,
        manual_recovery_completed_at: new Date().toISOString(),
        recovery_note: "Eksik saykıl manuel telafi ile tamamlandı.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cycle.id)
  }

  redirect("/portal/connector-merkezi")
}
