"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Avatar,
  Button,
  Card,
  Dropdown,
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
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileOutlined,
  MoreOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { tasksApi } from "@/features/tasks/tasks.api";
import { TaskComment } from "@/features/tasks/tasks.types";
import { formatDateTime } from "./RecordSections";
import { getApiErrorMessage } from "@/lib/api/error";
import { useAuthStore } from "@/features/auth/auth.store";

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
  const { message, modal } = App.useApp();
  const { user } = useAuthStore();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [content, setContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

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

  const canDeleteOther = user?.role === "ADMIN" || user?.role === "MANAGER";

  const startEdit = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content || "");
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async (commentId: string) => {
    const trimmedContent = editingContent.trim();
    if (!trimmedContent) {
      message.warning("Nội dung bình luận không được để trống.");
      return;
    }

    try {
      setSavingCommentId(commentId);
      await tasksApi.updateComment(taskId, commentId, trimmedContent);
      message.success("Đã cập nhật bình luận");
      cancelEdit();
      await fetchComments();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể cập nhật bình luận"));
    } finally {
      setSavingCommentId(null);
    }
  };

  const confirmDelete = (comment: TaskComment) => {
    modal.confirm({
      title: "Xóa bình luận",
      content: "Bạn có chắc muốn xóa bình luận này không?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setDeletingCommentId(comment.id);
          await tasksApi.deleteComment(taskId, comment.id);
          message.success("Đã xóa bình luận");
          await fetchComments();
        } catch (error: unknown) {
          message.error(getApiErrorMessage(error, "Không thể xóa bình luận"));
        } finally {
          setDeletingCommentId(null);
        }
      },
    });
  };

  const getCommentActions = (comment: TaskComment) => {
    if (!user || comment.isDeleted) return [];

    const isOwnComment = comment.authorId === user.id;
    const items = [];

    if (isOwnComment) {
      items.push({
        key: "edit",
        icon: <EditOutlined />,
        label: "Chỉnh sửa",
        onClick: () => startEdit(comment),
      });
      items.push({
        key: "delete",
        icon: <DeleteOutlined />,
        label: "Xóa",
        danger: true,
        onClick: () => confirmDelete(comment),
      });
    } else if (canDeleteOther) {
      items.push({
        key: "delete",
        icon: <DeleteOutlined />,
        label: "Xóa",
        danger: true,
        onClick: () => confirmDelete(comment),
      });
    }

    return items;
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
            renderItem={(comment) => {
              const actions = getCommentActions(comment);
              const isEditing = editingCommentId === comment.id;

              return (
                <List.Item key={comment.id}>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={
                      <div className="flex items-start justify-between gap-3">
                        <Space wrap>
                          <Text strong>{comment.authorName}</Text>
                          <Text type="secondary">{comment.authorEmail}</Text>
                        </Space>
                        {actions.length > 0 && (
                          <Dropdown
                            menu={{ items: actions }}
                            trigger={["click"]}
                            placement="bottomRight"
                          >
                            <Button
                              aria-label="Thao tác bình luận"
                              type="text"
                              size="small"
                              icon={<MoreOutlined />}
                              loading={deletingCommentId === comment.id}
                            />
                          </Dropdown>
                        )}
                      </div>
                    }
                    description={
                      <Space size="small" wrap>
                        <Text type="secondary">{formatDateTime(comment.createdAt)}</Text>
                        {comment.isEdited && (
                          <Text type="secondary" className="text-xs">
                            Đã chỉnh sửa
                          </Text>
                        )}
                      </Space>
                    }
                  />

                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        className="min-h-24 w-full rounded border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        maxLength={5000}
                      />
                      <Space>
                        <Button
                          type="primary"
                          loading={savingCommentId === comment.id}
                          onClick={() => handleSaveEdit(comment.id)}
                        >
                          Lưu
                        </Button>
                        <Button onClick={cancelEdit}>Hủy</Button>
                      </Space>
                    </div>
                  ) : (
                    comment.content && (
                      <Paragraph
                        className={
                          comment.isDeleted
                            ? "whitespace-pre-wrap italic text-gray-500"
                            : "whitespace-pre-wrap"
                        }
                      >
                        {comment.content}
                      </Paragraph>
                    )
                  )}

                  {!comment.isDeleted && comment.attachments.length > 0 && (
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
              );
            }}
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
