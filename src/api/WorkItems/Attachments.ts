import axios from "axios";
import { Readable } from "node:stream";
import { BaseResource } from "../BaseResource";
import { Configuration } from "../../Configuration";
import { AttachmentTooLargeError, HttpError } from "../../errors";
import {
  WorkItemAttachment,
  WorkItemAttachmentUploadRequest,
  UpdateWorkItemAttachmentRequest,
} from "../../models/Attachment";

/**
 * WorkItemAttachments API resource
 * Handles all work item attachment operations
 */
export class Attachments extends BaseResource {
  constructor(config: Configuration) {
    super(config);
  }

  /**
   * Retrieve an attachment by ID
   */
  async retrieve(
    workspaceSlug: string,
    projectId: string,
    workItemId: string,
    attachmentId: string
  ): Promise<WorkItemAttachment> {
    return this.get<WorkItemAttachment>(
      `/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/attachments/${attachmentId}/`
    );
  }

  /**
   * List attachments for a work item
   */
  async list(
    workspaceSlug: string,
    projectId: string,
    workItemId: string,
    params?: any
  ): Promise<WorkItemAttachment[]> {
    return this.get<WorkItemAttachment[]>(
      `/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/attachments/`,
      params
    );
  }

  /**
   * Create/upload an attachment for a work item
   */
  async create(
    workspaceSlug: string,
    projectId: string,
    workItemId: string,
    uploadData: WorkItemAttachmentUploadRequest
  ): Promise<WorkItemAttachment> {
    return this.post<WorkItemAttachment>(
      `/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/attachments/`,
      uploadData
    );
  }

  /**
   * Update an attachment
   */
  async update(
    workspaceSlug: string,
    projectId: string,
    workItemId: string,
    attachmentId: string,
    updateData: UpdateWorkItemAttachmentRequest
  ): Promise<WorkItemAttachment> {
    return this.patch<WorkItemAttachment>(
      `/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/attachments/${attachmentId}/`,
      updateData
    );
  }

  /**
   * Delete an attachment
   */
  async delete(workspaceSlug: string, projectId: string, workItemId: string, attachmentId: string): Promise<void> {
    return this.httpDelete(
      `/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/attachments/${attachmentId}/`
    );
  }

  /**
   * The signed storage URL an attachment's bytes live at.
   *
   * The detail route answers a redirect to it; the redirect is read, not followed, so the
   * credentials never travel to storage. Also serves the images embedded in a
   * description, which are assets of the work item too.
   */
  async downloadUrl(
    workspaceSlug: string,
    projectId: string,
    workItemId: string,
    attachmentId: string
  ): Promise<string> {
    let response;
    try {
      // The legacy `issue-attachments` route, not `work-items/.../attachments/`: it is the one
      // known to answer this redirect on self-hosted 1.4.2.
      response = await axios.get(
        this.buildUrl(
          `/workspaces/${workspaceSlug}/projects/${projectId}/issues/${workItemId}/issue-attachments/${attachmentId}/`
        ),
        { headers: this.getHeaders(), maxRedirects: 0, validateStatus: (status) => status < 400 }
      );
    } catch (error) {
      throw this.handleError(error);
    }
    const location = response.headers["location"];
    if (response.status < 300 || typeof location !== "string" || !location) {
      throw new HttpError(
        `Expected a redirect to storage for attachment ${attachmentId}, got ${response.status}.`,
        response.status,
        response.data
      );
    }
    return new URL(location, this.config.baseUrl).href;
  }

  /**
   * An attachment's bytes, fetched from its {@link downloadUrl} without credentials.
   *
   * With `maxBytes`, a larger file is refused with {@link AttachmentTooLargeError}: up front
   * when storage announces its `Content-Length`, otherwise as soon as the body passes the cap.
   */
  async download(
    workspaceSlug: string,
    projectId: string,
    workItemId: string,
    attachmentId: string,
    options: { maxBytes?: number } = {}
  ): Promise<{ data: Buffer; contentType: string }> {
    const url = await this.downloadUrl(workspaceSlug, projectId, workItemId, attachmentId);
    const { maxBytes } = options;
    let response;
    try {
      response = await axios.get<Readable>(url, { responseType: "stream" });
    } catch (error) {
      throw this.handleError(error);
    }
    const tooLarge = (size: number) => maxBytes !== undefined && size > maxBytes;
    if (tooLarge(Number(response.headers["content-length"]))) {
      response.data.destroy();
      throw new AttachmentTooLargeError(attachmentId, maxBytes!);
    }
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for await (const chunk of response.data) {
        size += (chunk as Buffer).length;
        if (tooLarge(size)) {
          response.data.destroy();
          throw new AttachmentTooLargeError(attachmentId, maxBytes!);
        }
        chunks.push(chunk as Buffer);
      }
    } catch (error) {
      if (error instanceof AttachmentTooLargeError) throw error;
      throw new HttpError(
        `Storage download of attachment ${attachmentId} failed: ${error instanceof Error ? error.message : String(error)}`,
        response.status
      );
    }
    const data = Buffer.concat(chunks);
    const contentType = String(response.headers["content-type"] ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    return { data, contentType };
  }
}
