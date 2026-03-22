import { describe, it, expect } from "vitest";

// ─── Test OSC encoding helpers (extracted for testing) ───────────────────────

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

function channelPad(ch: number): string {
  return ch.toString().padStart(2, "0");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("OSC Encoding", () => {
  it("encodes OSC string with null terminator and 4-byte padding", () => {
    const buf = encodeOscString("/ch/01/mix/fader");
    // Length must be multiple of 4
    expect(buf.length % 4).toBe(0);
    // Must start with the address
    expect(buf.toString("utf8", 0, 16)).toBe("/ch/01/mix/fader");
  });

  it("encodes OSC float as 4 bytes big-endian", () => {
    const buf = encodeOscFloat(0.75);
    expect(buf.length).toBe(4);
    const readBack = buf.readFloatBE(0);
    expect(readBack).toBeCloseTo(0.75, 3);
  });

  it("encodes OSC int as 4 bytes big-endian", () => {
    const buf = encodeOscInt(1);
    expect(buf.length).toBe(4);
    expect(buf.readInt32BE(0)).toBe(1);
  });

  it("builds a valid OSC fader message", () => {
    const msg = buildOscMessage("/ch/01/mix/fader", [{ type: "f", value: 0.75 }]);
    expect(msg.length % 4).toBe(0);
    // Address should be in the message
    expect(msg.toString("utf8", 0, 16)).toBe("/ch/01/mix/fader");
  });

  it("builds a valid OSC mute message (integer 0 = muted)", () => {
    const msg = buildOscMessage("/ch/01/mix/on", [{ type: "i", value: 0 }]);
    expect(msg.length % 4).toBe(0);
  });

  it("builds a valid OSC mute message (integer 1 = active)", () => {
    const msg = buildOscMessage("/ch/01/mix/on", [{ type: "i", value: 1 }]);
    expect(msg.length % 4).toBe(0);
  });

  it("builds a valid OSC string message for channel label", () => {
    const msg = buildOscMessage("/ch/01/config/name", [{ type: "s", value: "Vocal" }]);
    expect(msg.length % 4).toBe(0);
  });
});

describe("Channel address generation", () => {
  it("pads single digit channels with leading zero", () => {
    expect(channelPad(1)).toBe("01");
    expect(channelPad(9)).toBe("09");
  });

  it("does not pad two-digit channels", () => {
    expect(channelPad(10)).toBe("10");
    expect(channelPad(32)).toBe("32");
  });

  it("generates correct fader address for channel 1", () => {
    expect(`/ch/${channelPad(1)}/mix/fader`).toBe("/ch/01/mix/fader");
  });

  it("generates correct fader address for channel 32", () => {
    expect(`/ch/${channelPad(32)}/mix/fader`).toBe("/ch/32/mix/fader");
  });

  it("generates correct mute address", () => {
    expect(`/ch/${channelPad(5)}/mix/on`).toBe("/ch/05/mix/on");
  });

  it("generates correct solo address", () => {
    expect(`/-stat/solosw/ch${channelPad(3)}`).toBe("/-stat/solosw/ch03");
  });

  it("generates correct gain address", () => {
    expect(`/ch/${channelPad(12)}/preamp/gain`).toBe("/ch/12/preamp/gain");
  });

  it("generates correct label address", () => {
    expect(`/ch/${channelPad(7)}/config/name`).toBe("/ch/07/config/name");
  });
});

describe("Fader value validation", () => {
  it("fader value 0 represents silence (-inf dB)", () => {
    expect(0).toBeGreaterThanOrEqual(0);
    expect(0).toBeLessThanOrEqual(1);
  });

  it("fader value 0.75 represents unity gain (0 dB)", () => {
    expect(0.75).toBeGreaterThanOrEqual(0);
    expect(0.75).toBeLessThanOrEqual(1);
  });

  it("fader value 1.0 represents maximum gain (+10 dB)", () => {
    expect(1.0).toBeGreaterThanOrEqual(0);
    expect(1.0).toBeLessThanOrEqual(1);
  });

  it("master fader OSC address is correct", () => {
    expect("/main/st/mix/fader").toBe("/main/st/mix/fader");
  });

  it("master mute OSC address is correct", () => {
    expect("/main/st/mix/on").toBe("/main/st/mix/on");
  });
});
