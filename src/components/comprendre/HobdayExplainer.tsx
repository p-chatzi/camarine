// Text + table explaining the Hobday categories.
import { AlertTriangle } from 'lucide-react';
import { BASELINE } from '../../config';

const ROWS = [
  { name: 'I - Modérée', color: 'text-amber-600', range: "1× à 2× l'écart", impact: 'Stress léger sur les espèces locales.' },
  { name: 'II - Forte', color: 'text-orange-500', range: "2× à 3× l'écart", impact: 'Blanchiment initial, déplacements.' },
  { name: 'III - Sévère', color: 'text-rose-600', range: "3× à 4× l'écart", impact: "Mortalité massive d'espèces immobiles." },
  { name: 'IV - Extrême', color: 'text-fuchsia-900', range: "> 4× l'écart", impact: "Effondrement d'écosystèmes entiers." },
];

export function HobdayExplainer() {
  return (
    <div className="bg-white border border-sky-200/80 rounded-2xl p-6 shadow-xs flex flex-col xl:flex-row gap-6">
      <div className="flex-1 space-y-4">
        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          Protocole de Catégorisation de Hobday (2018)
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Conformément aux normes internationales de l'OMM, la période de référence (climatologie) est calculée dynamiquement sur les 30 années
          précédant votre sélection :{' '}
          <strong>
            de {BASELINE.start} à {BASELINE.end}
          </strong>
          . Le seuil se déclenche lorsque la température dépasse le <strong>90e percentile</strong> de cette période historique pendant au moins 5
          jours.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          L'intensité est calculée en multipliant l'écart entre la normale de ces 30 ans et ce seuil critique (1×). Plus la température s'envole, plus
          la catégorie augmente.
        </p>
      </div>
      <div className="flex-1">
        <table className="w-full text-left border-collapse text-xs shadow-sm rounded-lg overflow-hidden border border-slate-200">
          <thead>
            <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider">
              <th className="p-2 border-b">Catégorie</th>
              <th className="p-2 border-b">Intensité</th>
              <th className="p-2 border-b">Impacts Biologiques</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ROWS.map((row) => (
              <tr key={row.name}>
                <td className={`p-2 font-bold ${row.color}`}>{row.name}</td>
                <td className="p-2 font-mono text-slate-500">{row.range}</td>
                <td className="p-2 text-slate-600">{row.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
