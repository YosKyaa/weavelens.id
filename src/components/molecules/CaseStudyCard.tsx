import { caseStudyLabels } from "@/content/case-studies";
import type { CaseStudy } from "@/types";

type CaseStudyCardProps = {
  caseStudy: CaseStudy;
};

export function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  return (
    <article className="glass-gradient flex h-full flex-col rounded-2xl p-6 transition-transform duration-500 hover:-translate-y-1 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl text-ink">{caseStudy.client}</h3>
          <p className="mt-1 text-sm text-ink/80">{caseStudy.project}</p>
        </div>
        <span className="rounded-sm border border-sand-deep bg-sand px-2.5 py-1 font-heading text-xs font-semibold text-ink">
          {caseStudy.service}
        </span>
      </div>
      <dl className="mt-6 grid gap-4 border-t border-line pt-5">
        <div>
          <dt className="font-heading text-sm font-semibold text-primary">
            {caseStudyLabels.challenge}
          </dt>
          <dd className="mt-1">{caseStudy.challenge}</dd>
        </div>
        <div>
          <dt className="font-heading text-sm font-semibold text-primary">
            {caseStudyLabels.result}
          </dt>
          <dd className="mt-1">{caseStudy.result}</dd>
        </div>
      </dl>
    </article>
  );
}
