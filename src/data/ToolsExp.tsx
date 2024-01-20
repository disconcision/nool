import { Exp, atom, comp } from "../syntax/Exp";
import * as Pat from "../syntax/Pat";
import * as Path from "../syntax/Path";
import * as Id from "../syntax/ID";

const exp_comm_plus: Exp = comp([
  atom("="),
  comp([atom("➕"), atom("♫"), atom("♥")]),
  comp([atom("➕"), atom("♥"), atom("♫")]),
]);

const exp_assoc_plus: Exp = comp([
  atom("="),
  comp([atom("➕"), atom("♫"), comp([atom("➕"), atom("♥"), atom("✿")])]),
  comp([atom("➕"), comp([atom("➕"), atom("♫"), atom("♥")]), atom("✿")]),
]);

const exp_id_plus: Exp = comp([
  atom("="),
  atom("♫"),
  comp([atom("➕"), atom("🌑"), atom("♫")]),
]);

const exp_inv_plus: Exp = comp([
  atom("="),
  atom("🌑"),
  comp([atom("➕"), atom("♫"), atom("🌑")]),
]);

const exp_double_neg: Exp = comp([
  atom("="),
  atom("♫"),
  comp([atom("➖"), comp([atom("➖"), atom("♫")])]),
]);

const exp_comm_times: Exp = comp([
  atom("="),
  comp([atom("✖️"), atom("♫"), atom("♥")]),
  comp([atom("✖️"), atom("♥"), atom("♫")]),
]);

const exp_assoc_times: Exp = comp([
  atom("="),
  comp([atom("✖️"), atom("♫"), comp([atom("✖️"), atom("♥"), atom("✿")])]),
  comp([atom("✖️"), comp([atom("✖️"), atom("♫"), atom("♥")]), atom("✿")]),
]);

const exp_id_times: Exp = comp([
  atom("="),
  atom("♫"),
  comp([atom("✖️"), atom("🌑"), atom("♫")]),
]);

export const exp_dist_times_plus: Exp = comp([
  atom("="),
  comp([
    atom("➕"),
    comp([atom("✖️"), atom("♫"), atom("♥")]),
    comp([atom("✖️"), atom("♫"), atom("✿")]),
  ]),
  comp([atom("✖️"), atom("♫"), comp([atom("➕"), atom("♥"), atom("✿")])]),
]);

const box = (es: Exp[]): Exp => comp([atom("📦"), ...es]);

export const init = box([
  exp_comm_plus,
  exp_assoc_plus,
  exp_id_plus,
  exp_inv_plus,
  exp_double_neg,
  exp_comm_times,
  exp_assoc_times,
  exp_id_times,
  exp_dist_times_plus,
]);
