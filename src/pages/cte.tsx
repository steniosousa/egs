import { ArrowRight, Calendar, FileCode2, MapPin } from "lucide-react";
import { Card, EmptyState } from "../components/ui";
import { CteListItem } from "../services/cteService";

export default function CTEView({ ctes, buscarCteEscolhida }: { ctes: CteListItem[], buscarCteEscolhida: (cte: string) => void }) {
  return (
    <Card className="animate-fade-in">
      <h2 className="mb-5 text-lg font-semibold text-slate-900">Selecione um CT-e</h2>

      {ctes.length > 0 ? (
        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {ctes.map((cte) => (
            <button
              key={cte.IDCTE}
              type="button"
              onClick={() => buscarCteEscolhida(String(cte.IDCTE))}
              className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-all duration-150 hover:border-brand-300 hover:bg-white hover:shadow-card-hover"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  <FileCode2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-800">CT-e {cte.IDCTE}</p>
                  <p className="text-sm text-slate-500">Remetente: {cte.REM_NOME}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5" />
                    {cte.NOMECIDADEEMISSAO} → {cte.NOMECIDADEFIMSERV}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(cte.DATACREATE).toLocaleDateString('pt-BR')}
                </p>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileCode2}
          title="Nenhum CT-e encontrado"
          description="Assim que houver notas disponíveis para esta empresa, elas aparecerão aqui."
        />
      )}
    </Card>
  )
}
