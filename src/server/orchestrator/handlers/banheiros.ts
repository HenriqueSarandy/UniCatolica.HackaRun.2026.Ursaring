import { R } from "../replies";
import type { Ctx } from "../states";
import { amenityFlow } from "./amenity";

export const banheiros = (ctx: Ctx) => amenityFlow(ctx, "banheiro_fraldario", R.banheiro);
