// Stage quality governor (D7, show gate). Downgrade-only: two consecutive
// slow 5 s windows (p95 frame interval above 1.6× the 60 Hz budget) first
// lower a ray-marched family's step budget 96 → 64 → 40, remembered per
// family for the rest of the night, and only then the pixel budget.
export const RAY_STEPS = [96, 64, 40];
const SLOW_MS = (1000 / 60) * 1.6;

export class Governor {
  constructor(budgets, budget) {
    this.budgets = budgets; // ascending megapixels
    this.budget = budget;
    this.raySteps = new Map(); // family id → step budget
    this.slow = 0;
    this.downgrades = 0;
    this.stepReductions = 0;
  }

  steps(scene) {
    return this.raySteps.get(scene) ?? RAY_STEPS[0];
  }

  // p95: frame-interval p95 of the last window in ms; scene: the live
  // family; rayMarched: whether its shader uses the engine step budget.
  // Returns { steps } or { budget } when something was lowered, else null.
  assess(p95, scene, rayMarched) {
    this.slow = p95 > SLOW_MS ? this.slow + 1 : 0;
    if (this.slow < 2) return null;
    const step = RAY_STEPS.indexOf(this.steps(scene));
    if (rayMarched && step < RAY_STEPS.length - 1) {
      this.slow = 0;
      this.stepReductions++;
      this.raySteps.set(scene, RAY_STEPS[step + 1]);
      return { steps: RAY_STEPS[step + 1] };
    }
    const index = this.budgets.indexOf(this.budget);
    if (index <= 0) return null;
    this.slow = 0;
    this.downgrades++;
    this.budget = this.budgets[index - 1];
    return { budget: this.budget };
  }
}
