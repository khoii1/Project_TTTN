"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Avatar,
  Button,
  Card,
  Empty,
  Image,
  List,
  Space,
  Spin,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import {
  DownloadOutlined,
  FileOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { tasksApi } from "@/features/tasks/tasks.api";
import { TaskComment } from "@/features/tasks/tasks.types";
import { formatDateTime } from "./RecordSections";
import { getApiErrorMessage } from "@/lib/api/error";

const { Text, Paragraph } = Typography;

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
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

type TaskCommentsProps = {
  taskId: string;
};

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { message } = App.useApp();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [content, setContent] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const files = useMemo(
    () => fileList.map((item) => item.originFileObj).filter(Boolean) as File[],
    [fileList],
  );

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setComments(await tasksApi.getComments(taskId));
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tải trao đổi công việc"));
    } finally {
      setLoading(false);
    }
  }, [message, taskId]);

  useEffect(() => {
    const timer = window.setTimeout(fetchComments, 0);
    return () => window.clearTimeout(timer);
  }, [fetchComments]);

  const beforeUpload = (file: File) => {
    if (fileList.length >= MAX_FILES) {
      message.error(`Chỉ được chọn tối đa ${MAX_FILES} file.`);
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_FILE_SIZE) {
      message.error(`File "${file.name}" vượt quá giới hạn 5MB.`);
      return Upload.LIST_IGNORE;
    }

    if (!allowedTypes.has(file.type)) {
      message.error(`File "${file.name}" không đúng định dạng được hỗ trợ.`);
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && files.length === 0) {
      message.warning("Vui lòng nhập nội dung hoặc chọn file đính kèm.");
      return;
    }

    try {
      setSubmitting(true);
      await tasksApi.createComment(taskId, {
        content: trimmedContent,
        files,
      });
      message.success("Đã gửi bình luận");
      setContent("");
      setFileList([]);
      await fetchComments();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể gửi bình luận"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Trao đổi công việc" className="shadow-sm">
      <div className="space-y-4">
        {loading ? (
          <div className="py-8 text-center">
            <Spin />
          </div>
        ) : comments.length === 0 ? (
          <Empty description="Chưa có bình luận nào cho công việc này." />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={comments}
            renderItem={(comment) => (
              <List.Item key={comment.id}>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <Space wrap>
                      <Text strong>{comment.authorName}</Text>
                      <Text type="secondary">{comment.authorEmail}</Text>
                    </Space>
                  }
                  description={formatDateTime(comment.createdAt)}
                />
                {comment.content && (
                  <Paragraph className="whitespace-pre-wrap">
                    {comment.content}
                  </Paragraph>
                )}
                {comment.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {comment.attachments.map((attachment) =>
                      attachment.isImage && attachment.signedUrl ? (
                        <div
                          key={attachment.id}
                          className="w-36 rounded border border-gray-200 p-2"
                        >
                          <Image
                            src={attachment.signedUrl}
                            alt={attachment.originalName}
                            width="100%"
                            height={88}
                            className="object-cover"
                          />
                          <Text
                            className="mt-2 block truncate text-xs"
                            title={attachment.originalName}
                          >
                            {attachment.originalName}
                          </Text>
                        </div>
                      ) : (
                        <a
                          key={attachment.id}
                          href={attachment.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex max-w-xs items-center gap-2 rounded border border-gray-200 px-3 py-2 text-gray-700 hover:border-blue-400"
                        >
                          <FileOutlined />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">
                              {attachment.originalName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(attachment.fileSize)}
                            </span>
                          </span>
                          <DownloadOutlined />
                        </a>
                      ),
                    )}
                  </div>
                )}
              </List.Item>
            )}
          />
        )}

        <div className="rounded border border-gray-200 bg-gray-50 p-4">
          <Typography.Text strong>Gửi bình luận</Typography.Text>
          <textarea
            className="mt-3 min-h-24 w-full rounded border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            placeholder="Nhập nội dung trao đổi..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={5000}
          />
          <div className="mt-3">
            <Upload
              multiple
              beforeUpload={beforeUpload}
              fileList={fileList}
              onChange={({ fileList: nextFileList }) =>
                setFileList(nextFileList.slice(0, MAX_FILES))
              }
              onRemove={(file) => {
                setFileList((current) =>
                  current.filter((item) => item.uid !== file.uid),
                );
              }}
            >
              <Button>Chọn file đính kèm</Button>
            </Upload>
            <Text type="secondary" className="mt-2 block text-xs">
              Tối đa 5 file, mỗi file 5MB. Hỗ trợ ảnh, PDF, Word, Excel và CSV.
            </Text>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleSubmit}
            >
              Gửi bình luận
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
