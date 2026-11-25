"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { defineAction, zId } from "@/server/action";
import { RULES } from "@/server/rate-limit";
import * as svc from "./service";

const rate = (_i: unknown, ctx: { viewer: { idStr: string } }) => [[RULES.snippetUser, ctx.viewer.idStr]] as [typeof RULES.snippetUser, string][];

const save = defineAction({ schema: z.object({ id: zId.nullable(), snippet: svc.snippetInput }), rate }, async ({ id, snippet }, { viewer }) =>
  svc.saveSnippet(viewer, id ? new ObjectId(id) : null, snippet),
);
export async function saveSnippetAction(input: unknown) {
  return save(input);
}

const list = defineAction({ schema: z.object({ kind: z.enum(["web", "sql", "python"]) }), rate }, async ({ kind }, { viewer }) => svc.listSnippets(viewer, kind));
export async function listSnippetsAction(input: unknown) {
  return list(input);
}

const get = defineAction({ schema: z.object({ id: zId }), rate }, async ({ id }, { viewer }) => svc.getSnippet(viewer, new ObjectId(id)));
export async function getSnippetAction(input: unknown) {
  return get(input);
}

const del = defineAction({ schema: z.object({ id: zId }), rate }, async ({ id }, { viewer }) => {
  await svc.deleteSnippet(viewer, new ObjectId(id));
  return { ok: true };
});
export async function deleteSnippetAction(input: unknown) {
  return del(input);
}
