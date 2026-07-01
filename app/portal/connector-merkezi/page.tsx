import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type ConnectorRun = {
  id: string
  trigger_type: string
  status: string
  records_read: number
  records_imported: number
  operations_created: number
  waiting_assignment_count: number
  critical_count: number
  created_at: string
}

type ConnectorCycle = {
  id: string
  cycle_date: string
  cycle_time: string
  status: string
  planned_at: string
  last_run_id: string | null
  manual_recovery_required: boolean | null
  manual_recovery_completed: boolean | null
  recovery_note: string | null
}

function formatStatus(status?: string | null) {
  if (!status) return "Bilinmiyor"

  const map: Record<string, string> = {
    active: "Aktif",
    success: "Başarılı",
    failed: "Hatalı",
    running: "Çalışıyor",
    bekliyor: "Bekliyor",
    başarılı: "Başarılı",
    başarısız: "Başarısız",
    manuel_bekliyor: "Manuel Bekliyor",
    manuel_tamamlandı: "Manuel Tamamlandı",
  }

  return map[status] ?? status
}

export default async function ConnectorMerkeziPage() {
  const supabase = await createClient()

  if (!supabase) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Connector Merkezi</h1>
        <p className="mt-4 text-red-600">Supabase bağlantısı bulunamadı.</p>
      </div>
    )
  }

  const { data: connectors } = await supabase
    .from("connector_definitions")
    .select("id, connector_code, connector_name, source_name, status")
    .eq("connector_code", "ARON")
    .limit(1)

  const connector = connectors?.[0]

  const { data: schedules } = connector
    ? await supabase
        .from("connector_schedules")
        .select("id, schedule_name, run_times, timezone, active, manual_recovery_enabled")
        .eq("connector_id", connector.id)
        .limit(1)
    : { data: [] }

  const schedule = schedules?.[0]

  const { data: cyclesRaw } = schedule
    ? await supabase
        .from("connector_cycles")
        .select("id, cycle_date, cycle_time, status, planned_at, last_run_id, manual_recovery_required, manual_recovery_completed, recovery_note")
        .eq("schedule_id", schedule.id)
        .order("planned_at", { ascending: false })
        .limit(10)
    : { data: [] }

  const cycles = (cyclesRaw ?? []) as ConnectorCycle[]

  const { data: runsRaw } = connector
    ? await supabase
        .from("connector_runs")
        .select("id, trigger_type, status, records_read, records_imported, operations_created, waiting_assignment_count, critical_count, created_at")
        .eq("connector_id", connector.id)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] }

  const runs = (runsRaw ?? []) as ConnectorRun[]

  const { data: alerts } = connector
    ? await supabase
        .from("connector_alerts")
        .select("id, status")
        .eq("connector_id", connector.id)
        .eq("status", "open")
    : { data: [] }

  const latestRun = runs[0] ?? null
  const today = "2026-06-23"

  const todayCycles = cycles.filter((cycle) => cycle.cycle_date === today)
  const sevenCycle = todayCycles.find((cycle) => cycle.cycle_time === "07:00")
  const nineteenCycle = todayCycles.find((cycle) => cycle.cycle_time === "19:00")

  const missingCycles = todayCycles.filter(
    (cycle) =>
      cycle.manual_recovery_required ||
      ["başarısız", "manuel_bekliyor", "failed"].includes(cycle.status),
  )

  const healthy =
    connector?.status === "active" &&
    todayCycles.length >= 2 &&
    todayCycles.every((cycle) => ["başarılı", "manuel_tamamlandı"].includes(cycle.status)) &&
    missingCycles.length === 0

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Connector Merkezi</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold">Aktif Connector</h3>
          <p className="text-2xl">{connector?.status === "active" ? 1 : 0}</p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold">Sağlıklı Connector</h3>
          <p className={`text-2xl ${healthy ? "text-green-600" : "text-red-600"}`}>
            {healthy ? 1 : 0}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold">Eksik Saykıl</h3>
          <p className={`text-2xl ${missingCycles.length > 0 ? "text-red-600" : ""}`}>
            {missingCycles.length}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold">Açık Uyarı</h3>
          <p className="text-2xl">{alerts?.length ?? 0}</p>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">{connector?.connector_name ?? "ARON"}</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><strong>Kaynak:</strong> {connector?.source_name ?? "Açık Fişler"}</div>
          <div><strong>Durum:</strong> {formatStatus(connector?.status)}</div>

          <div>
            <strong>Planlı Saatler:</strong>{" "}
            {Array.isArray(schedule?.run_times) ? schedule.run_times.join(", ") : "07:00, 19:00"}
          </div>

          <div>
            <strong>Manuel Telafi:</strong>{" "}
            {schedule?.manual_recovery_enabled ? "Açık" : "Kapalı"}
          </div>

          <div><strong>07:00 Saykılı:</strong> {formatStatus(sevenCycle?.status)}</div>
          <div><strong>19:00 Saykılı:</strong> {formatStatus(nineteenCycle?.status)}</div>

          <div>
            <strong>Son Çalışma:</strong>{" "}
            {latestRun?.created_at ? new Date(latestRun.created_at).toLocaleString("tr-TR") : "Yok"}
          </div>

          <div><strong>Sonuç:</strong> {formatStatus(latestRun?.status)}</div>
          <div><strong>Okunan Kayıt:</strong> {latestRun?.records_read ?? 0}</div>
          <div><strong>Aktarılan Kayıt:</strong> {latestRun?.records_imported ?? 0}</div>
          <div><strong>Operasyon:</strong> {latestRun?.operations_created ?? 0}</div>
          <div><strong>Atama Bekleyen:</strong> {latestRun?.waiting_assignment_count ?? 0}</div>
          <div><strong>Kritik:</strong> {latestRun?.critical_count ?? 0}</div>

          <div>
            <strong>Atama Motoru:</strong>{" "}
            <span className={healthy ? "text-green-600" : "text-red-600"}>
              {healthy ? "Açık" : "Kilitli"}
            </span>
          </div>
        </div>
      </div>

      {missingCycles.length > 0 && (
        <div className="border border-red-500 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-red-600">Eksik Saykıllar</h2>

          <div className="space-y-3">
            {missingCycles.map((cycle) => (
              <div key={cycle.id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <div className="font-semibold">
                    ARON Açık Fişler — {cycle.cycle_date} {cycle.cycle_time}
                  </div>
                  <div className="text-sm opacity-80">
                    Durum: {formatStatus(cycle.status)}
                    {cycle.recovery_note ? ` — ${cycle.recovery_note}` : ""}
                  </div>
                </div>

                <form action="/api/connectors/aron/recover" method="post">
                  <input type="hidden" name="cycleId" value={cycle.id} />
                  <button
                    type="submit"
                    className="rounded-md border px-4 py-2 hover:bg-zinc-800"
                  >
                    Eksik Saykılı Çek
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Son Saykıllar</h2>

        <div className="space-y-2">
          {cycles.map((cycle) => (
            <div key={cycle.id} className="flex items-center justify-between border-b py-2">
              <span>
                {cycle.cycle_date} {cycle.cycle_time}
              </span>
              <span>{formatStatus(cycle.status)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
