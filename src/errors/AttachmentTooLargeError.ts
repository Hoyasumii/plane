import { PlaneError } from "./PlaneError";

/** Thrown by `workItems.attachments.download` when the file exceeds the `maxBytes` the caller set. */
export class AttachmentTooLargeError extends PlaneError {
  constructor(
    public readonly attachmentId: string,
    public readonly maxBytes: number
  ) {
    super(`Attachment ${attachmentId} is larger than ${maxBytes} bytes.`);
    this.name = "AttachmentTooLargeError";
  }
}
