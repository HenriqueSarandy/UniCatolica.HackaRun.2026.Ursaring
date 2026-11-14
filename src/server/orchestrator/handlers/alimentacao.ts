import { R } from "../replies";
import type { Ctx } from "../states";
import { amenityFlow } from "./amenity";

export const alimentacao = (ctx: Ctx) => amenityFlow(ctx, "praca_alimentacao", R.alimentacao);
