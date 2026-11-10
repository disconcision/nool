/**
 * Minimizes the objective function F with respect to a set of inequality constraints CON,
 * and returns the optimal variable array. F and CON may be non-linear, and should preferably be smooth.
 * Calls {@link JXG.Math.Nlp#cobylb}.
 *
 * @param calcfc Interface implementation for calculating objective function and constraints.
 * @param n Number of variables.
 * @param m Number of constraints.
 * @param x On input initial values of the variables (zero-based array). On output
 * optimal values of the variables obtained in the COBYLA minimization.
 * @param rhobeg Initial size of the simplex.
 * @param rhoend Final value of the simplex.
 * @param iprint Print level, 0 <= iprint <= 3, where 0 provides no output and
 * 3 provides full output to the console.
 * @param maxfun Maximum number of function evaluations before terminating.
 * @param [testForRoundingErrors=false]
 * @returns {Number} Exit status of the COBYLA2 optimization.
 */
export function FindMinimum(
  calcfc: (n: number, m: number, x: Float64Array, con: Float64Array) => number,
  n: number,
  m: number,
  x: number[],
  rhobeg: number,
  rhoend: number,
  iprint: number,
  maxfun: number,
): number;
