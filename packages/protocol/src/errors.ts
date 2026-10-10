export type ProtocolValidationCode =
  | "INVALID_MESSAGE"
  | "PROTOCOL_MISMATCH"
  | "LIMIT_EXCEEDED"
  | "SESSION_MISMATCH"
  | "SEQUENCE_ERROR"
  | "OWNERSHIP_ERROR"
  | "EVENT_LIMIT";

export class ProtocolValidationError extends Error {
  public readonly code: ProtocolValidationCode;
  public readonly path: string;

  public constructor(code: ProtocolValidationCode, message: string, path = "$") {
    super(message);
    this.name = "ProtocolValidationError";
    this.code = code;
    this.path = path;
  }
}

