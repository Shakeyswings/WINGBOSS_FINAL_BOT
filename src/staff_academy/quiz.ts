import type { AcademyModule } from "./modules.ts";

export function grade(module: AcademyModule, answerId: string): number {
  const opt = module.quiz.options.find((o) => o.id === answerId);
  return opt?.correct ? 100 : 0;
}
