import { useState } from "react";
import { User, Truck, Settings, ArrowRight, ArrowDown, CheckCircle, ChevronRight } from "lucide-react";

type Lane = "customer" | "operator" | "courier";

interface Node {
  id: string;
  lane: Lane;
  label: string;
  sub?: string;
  type: "start" | "action" | "system" | "decision" | "end";
  step?: number;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
  cross?: boolean;
}

const LANE_CONFIG: Record<Lane, { color: string; bg: string; border: string; icon: typeof User; name: string; textColor: string }> = {
  customer: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: User,
    name: "Хэрэглэгч",
    textColor: "text-blue-300",
  },
  operator: {
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    icon: Settings,
    name: "Оператор",
    textColor: "text-purple-300",
  },
  courier: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: Truck,
    name: "Куриер",
    textColor: "text-orange-300",
  },
};

const TYPE_STYLE: Record<Node["type"], string> = {
  start: "rounded-full",
  action: "rounded-xl",
  system: "rounded-xl border-dashed",
  decision: "rounded-xl rotate-0",
  end: "rounded-full",
};

const steps: { row: number; nodes: Node[]; edges?: Edge[]; crossEdges?: { label: string; from: Lane; to: Lane; fromLabel: string; toLabel: string }[] }[] = [
  {
    row: 1,
    nodes: [
      { id: "c1", lane: "customer", label: "Нүүр хуудас", sub: "hvrgelt.mn-рүү орно", type: "start", step: 1 },
      { id: "o1", lane: "operator", label: "Нүүр хуудас", sub: "hvrgelt.mn-рүү орно", type: "start", step: 1 },
      { id: "cr1", lane: "courier", label: "Нүүр хуудас", sub: "hvrgelt.mn-рүү орно", type: "start", step: 1 },
    ],
  },
  {
    row: 2,
    nodes: [
      { id: "c2", lane: "customer", label: "Бүртгүүлэх / нэвтрэх", sub: "Нэр, утас, нууц үг", type: "action", step: 2 },
      { id: "o2", lane: "operator", label: "Нэвтрэх", sub: "Нэр + байгууллагын код", type: "action", step: 2 },
      { id: "cr2", lane: "courier", label: "Нэвтрэх", sub: "Бүртгэлтэй утасны дугаар", type: "action", step: 2 },
    ],
  },
  {
    row: 3,
    nodes: [
      { id: "c3", lane: "customer", label: "Хаяг оруулах", sub: "Авах → Хүргэх хаяг + тэмдэглэл", type: "action", step: 3 },
      { id: "o3", lane: "operator", label: "Захиалгын жагсаалт", sub: "Шинэ захиалга дуут мэдэгдэлтэй орж ирнэ", type: "system", step: 3 },
      { id: "cr3", lane: "courier", label: "Идэвхтэй захиалгууд", sub: "Томилогдсон захиалга харагдана", type: "system", step: 3 },
    ],
  },
  {
    row: 4,
    nodes: [
      { id: "c4", lane: "customer", label: "Үнэ шалгах", sub: "Зай тооцож үнэ автоматаар гарна", type: "system", step: 4 },
      { id: "o4", lane: "operator", label: "Захиалгыг нээх", sub: "Дэлгэрэнгүй хаяг, тэмдэглэл харна", type: "action", step: 4 },
      { id: "cr4", lane: "courier", label: "Авах хаяг руу явах", sub: "Google Maps холбоостой", type: "action", step: 4 },
    ],
  },
  {
    row: 5,
    nodes: [
      { id: "c5", lane: "customer", label: "Захиалах", sub: "\"Захиалах\" товч дарна", type: "action", step: 5 },
      { id: "o5", lane: "operator", label: "Куриер томилох", sub: "Чөлөөт куриерийн жагсаалтаас нэгийг сонгоно", type: "action", step: 5 },
      { id: "cr5", lane: "courier", label: "\"Ачаа авлаа\"", sub: "Нэг товч → системд бүртгэгдэнэ", type: "action", step: 5 },
    ],
  },
  {
    row: 6,
    nodes: [
      { id: "c6", lane: "customer", label: "Захиалга хүлээж байна", sub: "Оператор хүлээж авна гэсэн мэдэгдэл", type: "system", step: 6 },
      { id: "o6", lane: "operator", label: "Куриерт мэдэгдэнэ", sub: "Томилогдсон захиалга куриерт харагдана", type: "system", step: 6 },
      { id: "cr6", lane: "courier", label: "Хүргэх хаяс руу явах", sub: "Google Maps холбоостой", type: "action", step: 6 },
    ],
  },
  {
    row: 7,
    nodes: [
      { id: "c7", lane: "customer", label: "Куриерийн мэдээлэл харагдана", sub: "Нэр, утас, хүргэх цаг", type: "system", step: 7 },
      { id: "o7", lane: "operator", label: "Явцыг хянах", sub: "Бүх идэвхтэй захиалгыг нэг дэлгэцэнд", type: "action", step: 7 },
      { id: "cr7", lane: "courier", label: "\"Хүргэлт дуусгах\"", sub: "Нэг товч → орлого нэмэгдэнэ", type: "action", step: 7 },
    ],
  },
  {
    row: 8,
    nodes: [
      { id: "c8", lane: "customer", label: "Явцыг бодит цагаар хянах", sub: "Томилогдсон → Авсан → Хүргэгдсэн", type: "system", step: 8 },
      { id: "o8", lane: "operator", label: "Дараагийн захиалга", sub: "Дахин захиалга хүлээнэ", type: "end", step: 8 },
      { id: "cr8", lane: "courier", label: "Дараагийн захиалга", sub: "Куриер чөлөөтэй болно", type: "end", step: 8 },
    ],
  },
  {
    row: 9,
    nodes: [
      { id: "c9", lane: "customer", label: "Хүргэгдсэн!", sub: "Дахин захиалах боломжтой", type: "end", step: 9 },
    ],
  },
];

const crossEdges = [
  { fromRow: 5, toRow: 6, fromLane: "customer" as Lane, toLane: "operator" as Lane, label: "Захиалга илгээгдэнэ" },
  { fromRow: 5, toRow: 6, fromLane: "operator" as Lane, toLane: "courier" as Lane, label: "Куриер томилогдоно" },
  { fromRow: 7, toRow: 7, fromLane: "courier" as Lane, toLane: "customer" as Lane, label: "Хүргэгдсэн мэдэгдэл" },
];

const LANES: Lane[] = ["customer", "operator", "courier"];

export function FlowDiagram() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="min-h-dvh bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold" style={{ fontFamily: "'Roboto Slab', serif", fontSize: "1.1rem" }}>
              hvrgelt.mn — Системийн урсгал
            </h1>
            <p className="text-xs text-muted-foreground">Хэрэглэгч · Оператор · Куриер</p>
          </div>
          <div className="flex gap-2">
            {LANES.map((lane) => {
              const cfg = LANE_CONFIG[lane];
              const Icon = cfg.icon;
              return (
                <div key={lane} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border}`}>
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                  <span className={`text-xs ${cfg.color}`}>{cfg.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 overflow-x-auto">
        {/* Lane headers */}
        <div className="grid grid-cols-3 gap-3 mb-2 min-w-[600px]">
          {LANES.map((lane) => {
            const cfg = LANE_CONFIG[lane];
            const Icon = cfg.icon;
            return (
              <div key={lane} className={`flex items-center justify-center gap-2 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
                <span className={`font-semibold ${cfg.color}`} style={{ fontFamily: "'Roboto Slab', serif" }}>{cfg.name}</span>
              </div>
            );
          })}
        </div>

        {/* Flow rows */}
        <div className="min-w-[600px] space-y-0">
          {steps.map((row, rowIdx) => {
            const isLast = rowIdx === steps.length - 1;

            // Build node lookup by lane for this row
            const byLane: Partial<Record<Lane, Node>> = {};
            row.nodes.forEach((n) => { byLane[n.lane] = n; });

            // Check cross-edge coming OUT of this row
            const outCross = crossEdges.filter((e) => e.fromRow === row.row);

            return (
              <div key={row.row}>
                {/* Step number badge */}
                <div className="flex items-center gap-2 mb-2 mt-3">
                  <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-mono">{row.row}</span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* 3-column node row */}
                <div className="grid grid-cols-3 gap-3">
                  {LANES.map((lane) => {
                    const node = byLane[lane];
                    const cfg = LANE_CONFIG[lane];
                    if (!node) {
                      return <div key={lane} className="flex items-center justify-center"><div className="w-px h-12 bg-border/40" /></div>;
                    }

                    return (
                      <div key={lane} className="flex flex-col items-center">
                        <button
                          onClick={() => setActiveStep(activeStep === node.step ? null : (node.step ?? null))}
                          className={`w-full border rounded-xl p-3 text-left transition-all hover:shadow-md ${
                            node.type === "start" || node.type === "end"
                              ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                              : node.type === "system"
                              ? "bg-secondary/50 border-border border-dashed"
                              : `bg-card border-border hover:${cfg.border}`
                          } ${activeStep === node.step ? `ring-1 ring-offset-1 ring-offset-background ${cfg.border.replace("border-", "ring-")}` : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium leading-tight ${node.type === "start" || node.type === "end" ? cfg.color : "text-foreground"}`}>
                                {node.label}
                              </p>
                              {node.sub && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{node.sub}</p>
                              )}
                            </div>
                            {(node.type === "action") && (
                              <div className={`w-5 h-5 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0 mt-0.5`}>
                                <CheckCircle className={`w-3 h-3 ${cfg.color}`} />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Cross-lane edges */}
                {outCross.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {outCross.map((edge, i) => {
                      const fromIdx = LANES.indexOf(edge.fromLane);
                      const toIdx = LANES.indexOf(edge.toLane);
                      const goingRight = toIdx > fromIdx;
                      return (
                        <div key={i} className="flex items-center gap-1 px-2">
                          <div style={{ flex: fromIdx }} />
                          <div className="flex items-center gap-2 flex-1">
                            <div className={`flex-1 h-px border-t border-dashed ${LANE_CONFIG[edge.fromLane].border}`} />
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs ${LANE_CONFIG[edge.toLane].bg} ${LANE_CONFIG[edge.toLane].border} ${LANE_CONFIG[edge.toLane].color} whitespace-nowrap`}>
                              <ArrowRight className="w-3 h-3" />
                              {edge.label}
                            </div>
                            <div className={`flex-1 h-px border-t border-dashed ${LANE_CONFIG[edge.toLane].border}`} />
                          </div>
                          <div style={{ flex: LANES.length - 1 - toIdx }} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Downward arrows between rows */}
                {!isLast && (
                  <div className="grid grid-cols-3 gap-3 py-1">
                    {LANES.map((lane) => {
                      const hasNode = !!byLane[lane];
                      const nextRow = steps[rowIdx + 1];
                      const nextHas = nextRow?.nodes.some((n) => n.lane === lane);
                      return (
                        <div key={lane} className="flex justify-center">
                          {hasNode && nextHas && (
                            <div className={`w-px h-5 ${LANE_CONFIG[lane].border.replace("border-", "bg-").replace("/30", "/50")}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground w-full mb-1">Тайлбар</p>
          {[
            { style: "bg-card border-border border-solid", label: "Хэрэглэгчийн үйлдэл" },
            { style: "bg-secondary/50 border-border border-dashed", label: "Системийн үйл явдал" },
            { style: "bg-blue-500/10 border-blue-500/30", label: "Эхлэл / Төгсгөл" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <div className={`w-8 h-5 rounded border ${l.style}`} />
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-8 h-px border-t border-dashed border-purple-500/50" />
            <span className="text-xs text-muted-foreground">Портал хоорондын урсгал</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              lane: "customer" as Lane,
              steps: ["Нэвтрэх", "Хаяг оруулах", "Үнэ шалгах", "\"Захиалах\" дарах", "Явцыг хянах"],
              highlight: "5 алхам · ~30 секунд",
            },
            {
              lane: "operator" as Lane,
              steps: ["Нэвтрэх (нэр+код)", "Захиалга хүлээн авах", "Куриер томилох", "Явцыг хянах"],
              highlight: "4 алхам · 1 товч томилолт",
            },
            {
              lane: "courier" as Lane,
              steps: ["Нэвтрэх (утас)", "Захиалга харах", "\"Ачаа авлаа\" товч", "\"Хүргэлт дуусгах\" товч"],
              highlight: "4 алхам · 2 товч л дардаг",
            },
          ].map(({ lane, steps: s, highlight }) => {
            const cfg = LANE_CONFIG[lane];
            const Icon = cfg.icon;
            return (
              <div key={lane} className={`${cfg.bg} border ${cfg.border} rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                  <span className={`font-semibold text-sm ${cfg.color}`} style={{ fontFamily: "'Roboto Slab', serif" }}>{cfg.name}</span>
                </div>
                <div className="space-y-1.5 mb-3">
                  {s.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`w-4 h-4 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center ${cfg.color} shrink-0`} style={{ fontSize: "0.6rem" }}>{i + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>
                <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} border ${cfg.border} ${cfg.color} text-center`}>
                  {highlight}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
