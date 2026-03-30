import { StandardSchemaV1 } from "@standard-schema/spec";
import { AsyncLocalStorage } from "async_hooks";

// TODO: add cookies back once cookie parsing is fixed
export type IncomingPacket = {
  payload: unknown;
  headers: Record<string, string>;
  ip: string;
  action: string;
  url: URL;
};

export type PacketSchema = {
  payload?: StandardSchemaV1;
  headers?: StandardSchemaV1;
};

export type ValidatedPacket<T extends PacketSchema> = {
  payload: T["payload"] extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T["payload"]> : unknown;
  headers: T["headers"] extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T["headers"]> : Record<string, string>;
};

export const packetStorage = new AsyncLocalStorage<IncomingPacket>();

async function runSchema<S extends StandardSchemaV1>(
  schema: S,
  value: unknown
): Promise<StandardSchemaV1.InferOutput<S>> {
  let result = schema["~standard"].validate(value);
  if (result instanceof Promise) result = await result;
  if (result.issues) throw new Error(JSON.stringify(result.issues, null, 2));
  return result.value;
}

export function receive(): IncomingPacket {
  const packet = packetStorage.getStore();
  if (!packet) throw new Error("[aromix] No active packet. Ensure the adapter is running.");
  return packet;
}

export namespace receive {
  export async function validate<T extends PacketSchema>(schema: T): Promise<ValidatedPacket<T>> {
    const packet = packetStorage.getStore();
    if (!packet) throw new Error("[aromix] No active packet. Ensure the adapter is running.");

    const [payload, headers] = await Promise.all([
      schema.payload ? runSchema(schema.payload, packet.payload) : Promise.resolve(packet.payload),
      schema.headers ? runSchema(schema.headers, packet.headers) : Promise.resolve(packet.headers),
    ]);

    return { payload, headers } as ValidatedPacket<T>;
  }
}
