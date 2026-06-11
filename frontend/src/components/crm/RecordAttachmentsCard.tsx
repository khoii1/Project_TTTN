"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Empty,
  Image,
  Popconfirm,
  Spin,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { OpportunityAttachment } from "@/features/opportunities/opportunities.types";
import { getApiErrorMessage } from "@/lib/api/error";
import { useAuthStore } from "@/features/auth/auth.store";
import { formatDateTime } from "./RecordSections";

const { Text } = Typography;

type RecordAttachmentsCardProps = {
  entityType: "OPPORTUNITY";
  recordId: string;
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
]);
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const getExtension = (fileName: string) =>
  fileName.split(".").pop()?.toLowerCase() || "";

const isAllowedFile = (file: File) =>
  allowedExtensions.has(getExtension(file.name)) &&
  (!file.type || allowedTypes.has(file.type));

export function RecordAttachmentsCard({
  entityType,
  recordId,
}: RecordAttachmentsCardProps) {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [attachments, setAttachments] = useState<OpportunityAttachment[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedFiles = useMemo(
    () => fileList.map((item) => item.originFileObj).filter(Boolean) as File[],
    [fileList],
  );

  const fetchAttachments = useCallback(async () => {
    if (entityType !== "OPPORTUNITY") return;

    try {
      setLoading(true);
      setAttachments(await opportunitiesApi.getAttachments(recordId));
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tải tệp đính kèm"));
    } finally {
      setLoading(false);
    }
  }, [entityType, message, recordId]);

  useEffect(() => {
    const timer = window.setTimeout(fetchAttachments, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAttachments]);

  const beforeUpload = (file: File) => {
    if (fileList.length >= MAX_FILES) {
      message.error(`Chỉ được chọn tối đa ${MAX_FILES} file mỗi lần.`);
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_FILE_SIZE) {
      message.error(`File "${file.name}" vượt quá giới hạn 5MB.`);
      return Upload.LIST_IGNORE;
    }

    if (!isAllowedFile(file)) {
      message.error(`File "${file.name}" không đúng định dạng được hỗ trợ.`);
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      message.warning("Vui lòng chọn file cần tải lên.");
      return;
    }

    try {
      setUploading(true);
      await opportunitiesApi.uploadAttachments(recordId, selectedFiles);
      message.success("Đã tải tệp lên");
      setFileList([]);
      await fetchAttachments();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tải tệp lên"));
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (attachment: OpportunityAttachment) => {
    try {
      const signedUrl =
        attachment.signedUrl ||
        (await opportunitiesApi.getAttachmentSignedUrl(recordId, attachment.id));
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể mở tệp đính kèm"));
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      setDeletingId(attachmentId);
      await opportunitiesApi.deleteAttachment(recordId, attachmentId);
      message.success("Đã xóa tệp đính kèm");
      await fetchAttachments();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể xóa tệp đính kèm"));
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (attachment: OpportunityAttachment) =>
    user?.role === "ADMIN" ||
    user?.role === "MANAGER" ||
    attachment.uploadedById === user?.id;

  return (
    <Card
      title={`Tệp đính kèm (${attachments.length})`}
      size="small"
      className="shadow-sm"
      extra={
        <Upload
          multiple
          showUploadList={false}
          beforeUpload={beforeUpload}
          fileList={fileList}
          onChange={({ fileList: nextFileList }) =>
            setFileList(nextFileList.slice(0, MAX_FILES))
          }
        >
          <Button size="small" icon={<UploadOutlined />}>
            Tải tệp lên
          </Button>
        </Upload>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="py-6 text-center">
            <Spin />
          </div>
        ) : attachments.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có tệp đính kèm cho cơ hội này."
          />
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="rounded-md border border-gray-200 bg-white p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <FileOutlined />
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleOpen(attachment)}
                      className="block max-w-full truncate text-left font-semibold text-blue-700 hover:text-blue-800"
                      title={attachment.originalName}
                    >
                      {attachment.originalName}
                    </button>
                    <div className="mt-1 text-xs text-gray-500">
                      {formatFileSize(attachment.fileSize)} •{" "}
                      {attachment.mimeType || "File"} •{" "}
                      {formatDateTime(attachment.createdAt)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Tải lên bởi {attachment.uploadedByName}
                    </div>
                  </div>
                </div>

                {attachment.isImage && attachment.signedUrl && (
                  <Image
                    src={attachment.signedUrl}
                    alt={attachment.originalName}
                    width="100%"
                    height={112}
                    className="mt-3 rounded object-cover"
                  />
                )}

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => handleOpen(attachment)}
                  >
                    Xem / tải
                  </Button>
                  {canDelete(attachment) && (
                    <Popconfirm
                      title="Xóa tệp đính kèm"
                      description="Bạn có chắc muốn xóa tệp này không?"
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDelete(attachment.id)}
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        loading={deletingId === attachment.id}
                      >
                        Xóa
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {fileList.length > 0 && (
          <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
            <Text strong>File đã chọn</Text>
            <div className="mt-2 space-y-2">
              {fileList.map((file) => (
                <div
                  key={file.uid}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">{file.name}</span>
                  <Button
                    size="small"
                    type="link"
                    onClick={() =>
                      setFileList((current) =>
                        current.filter((item) => item.uid !== file.uid),
                      )
                    }
                  >
                    Bỏ chọn
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="primary"
              className="mt-3 w-full"
              icon={<UploadOutlined />}
              loading={uploading}
              onClick={handleUpload}
            >
              Tải {fileList.length} file lên
            </Button>
          </div>
        )}

        <Text type="secondary" className="block text-xs">
          Tối đa 5 file mỗi lần, mỗi file 5MB. Hỗ trợ ảnh, PDF, Word, Excel và
          CSV.
        </Text>
      </div>
    </Card>
  );
}
