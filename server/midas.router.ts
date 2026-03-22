import { getDb } from "./db";
import { channelConfigs, mixerConnections, presets } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import dgram from "dgram";

// ─── OSC helpers ────────────────────────────────────────────────────────────

function padTo4(buf: Buffer): Buffer {
  const pad = (4 - (buf.length % 4)) % 4;
  return Buffer.concat([buf, Buffer.alloc(pad)]);
}

function encodeOscString(str: string): Buffer {
  const buf = Buffer.from(str + "\0", "utf8");
  return padTo4(buf);
}

function encodeOscFloat(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(value, 0);
  return buf;
}

function encodeOscInt(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(value, 0);
  return buf;
}

function buildOscMessage(
  address: string,
  args: { type: "f" | "i" | "s"; value: number | string }[]
): Buffer {
  const addrBuf = encodeOscString(address);
  const typeTags = "," + args.map((a) => a.type).join("");
  const typeTagBuf = encodeOscString(typeTags);
  const argBufs = args.map((a) => {
    if (a.type === "f") return encodeOscFloat(a.value as number);
    if (a.type === "i") return encodeOscInt(a.value as number);
    return encodeOscString(a.value as string);
  });
  return Buffer.concat([addrBuf, typeTagBuf, ...argBufs]);
}

async function sendOscMessage(
  ip: string,
  port: number,
  address: string,
  args: { type: "f" | "i" | "s"; value: number | string }[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket("udp4");
    const msg = buildOscMessage(address, args);
    const timeout = setTimeout(() => {
      client.close();
      resolve(); // UDP is fire-and-forget; timeout is not an error
    }, 2000);
    client.send(msg, 0, msg.length, port, ip, (err) => {
      clearTimeout(timeout);
      client.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

function channelPad(ch: number): string {
  return ch.toString().padStart(2, "0");
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const midasRouter = router({
  // ── Conexões ──────────────────────────────────────────────────────────────
  connection: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(mixerConnections)
        .where(eq(mixerConnections.userId, ctx.user.id));
    }),

    save: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().min(1),
          ipAddress: z.string().min(7),
          port: z.number().default(10023),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (input.id) {
          await db
            .update(mixerConnections)
            .set({ name: input.name, ipAddress: input.ipAddress, port: input.port })
            .where(
              and(
                eq(mixerConnections.id, input.id),
                eq(mixerConnections.userId, ctx.user.id)
              )
            );
          return { id: input.id };
        }
        const [result] = await db.insert(mixerConnections).values({
          userId: ctx.user.id,
          name: input.name,
          ipAddress: input.ipAddress,
          port: input.port,
          isActive: false,
        });
        return { id: (result as any).insertId as number };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db
          .delete(mixerConnections)
          .where(
            and(
              eq(mixerConnections.id, input.id),
              eq(mixerConnections.userId, ctx.user.id)
            )
          );
        return { success: true };
      }),

    ping: protectedProcedure
      .input(z.object({ ip: z.string(), port: z.number().default(10023) }))
      .mutation(async ({ input }) => {
        try {
          await sendOscMessage(input.ip, input.port, "/xinfo", []);
          return { success: true };
        } catch {
          return { success: false };
        }
      }),
  }),

  // ── Controle de canais ────────────────────────────────────────────────────
  channel: router({
    setFader: protectedProcedure
      .input(
        z.object({
          ip: z.string(),
          port: z.number().default(10023),
          channel: z.number().min(1).max(32),
          value: z.number().min(0).max(1),
        })
      )
      .mutation(async ({ input }) => {
        const address = `/ch/${channelPad(input.channel)}/mix/fader`;
        await sendOscMessage(input.ip, input.port, address, [
          { type: "f", value: input.value },
        ]);
        return { success: true };
      }),

    setMute: protectedProcedure
      .input(
        z.object({
          ip: z.string(),
          port: z.number().default(10023),
          channel: z.number().min(1).max(32),
          muted: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        const address = `/ch/${channelPad(input.channel)}/mix/on`;
        // Midas/X32: 0 = muted, 1 = on (ativo)
        await sendOscMessage(input.ip, input.port, address, [
          { type: "i", value: input.muted ? 0 : 1 },
        ]);
        return { success: true };
      }),

    setSolo: protectedProcedure
      .input(
        z.object({
          ip: z.string(),
          port: z.number().default(10023),
          channel: z.number().min(1).max(32),
          solo: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        const address = `/-stat/solosw/ch${channelPad(input.channel)}`;
        await sendOscMessage(input.ip, input.port, address, [
          { type: "i", value: input.solo ? 1 : 0 },
        ]);
        return { success: true };
      }),

    setGain: protectedProcedure
      .input(
        z.object({
          ip: z.string(),
          port: z.number().default(10023),
          channel: z.number().min(1).max(32),
          value: z.number().min(0).max(1),
        })
      )
      .mutation(async ({ input }) => {
        const address = `/ch/${channelPad(input.channel)}/preamp/gain`;
        await sendOscMessage(input.ip, input.port, address, [
          { type: "f", value: input.value },
        ]);
        return { success: true };
      }),

    setLabel: protectedProcedure
      .input(
        z.object({
          ip: z.string(),
          port: z.number().default(10023),
          channel: z.number().min(1).max(32),
          label: z.string().max(12),
        })
      )
      .mutation(async ({ input }) => {
        const address = `/ch/${channelPad(input.channel)}/config/name`;
        await sendOscMessage(input.ip, input.port, address, [
          { type: "s", value: input.label },
        ]);
        return { success: true };
      }),
  }),

  // ── Master fader ──────────────────────────────────────────────────────────
  master: router({
    setFader: protectedProcedure
      .input(
        z.object({
          ip: z.string(),
          port: z.number().default(10023),
          value: z.number().min(0).max(1),
        })
      )
      .mutation(async ({ input }) => {
        await sendOscMessage(input.ip, input.port, "/main/st/mix/fader", [
          { type: "f", value: input.value },
        ]);
        return { success: true };
      }),

    setMute: protectedProcedure
      .input(
        z.object({
          ip: z.string(),
          port: z.number().default(10023),
          muted: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        await sendOscMessage(input.ip, input.port, "/main/st/mix/on", [
          { type: "i", value: input.muted ? 0 : 1 },
        ]);
        return { success: true };
      }),
  }),

  // ── Presets ───────────────────────────────────────────────────────────────
  preset: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(presets)
        .where(eq(presets.userId, ctx.user.id));
    }),

    save: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().min(1),
          description: z.string().optional(),
          data: z.any(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (input.id) {
          await db
            .update(presets)
            .set({
              name: input.name,
              description: input.description ?? null,
              data: input.data,
            })
            .where(
              and(eq(presets.id, input.id), eq(presets.userId, ctx.user.id))
            );
          return { id: input.id };
        }
        const [result] = await db.insert(presets).values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          data: input.data,
        });
        return { id: (result as any).insertId as number };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db
          .delete(presets)
          .where(and(eq(presets.id, input.id), eq(presets.userId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ── Configurações locais de canais ────────────────────────────────────────
  channelConfig: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(channelConfigs)
        .where(eq(channelConfigs.userId, ctx.user.id));
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          channelIndex: z.number().min(1).max(32),
          label: z.string().optional(),
          color: z.string().optional(),
          faderValue: z.number().min(0).max(1).optional(),
          isMuted: z.boolean().optional(),
          isSolo: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const existing = await db
          .select()
          .from(channelConfigs)
          .where(
            and(
              eq(channelConfigs.userId, ctx.user.id),
              eq(channelConfigs.channelIndex, input.channelIndex)
            )
          );

        if (existing.length > 0) {
          await db
            .update(channelConfigs)
            .set({
              label: input.label ?? existing[0].label,
              color: input.color ?? existing[0].color,
              faderValue: input.faderValue ?? existing[0].faderValue,
              isMuted: input.isMuted ?? existing[0].isMuted,
              isSolo: input.isSolo ?? existing[0].isSolo,
            })
            .where(
              and(
                eq(channelConfigs.userId, ctx.user.id),
                eq(channelConfigs.channelIndex, input.channelIndex)
              )
            );
        } else {
          await db.insert(channelConfigs).values({
            userId: ctx.user.id,
            channelIndex: input.channelIndex,
            label: input.label ?? `CH ${input.channelIndex}`,
            color: input.color ?? "#3b82f6",
            faderValue: input.faderValue ?? 0.75,
            isMuted: input.isMuted ?? false,
            isSolo: input.isSolo ?? false,
          });
        }
        return { success: true };
      }),
  }),
});
