"use client";

import { useState } from "react";
import { Button, Modal, Space, Typography, Upload, App } from "antd";
import type { UploadProps } from "antd";
import { DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import { httpClient } from "@/lib/api/http-client";
import { getApiErrorMessage } from "@/lib/api/error";
import { ImportErrorTable } from "./ImportErrorTable";
import { ImportResultSummary } from "./ImportResultSummary";
import type { ImportCsvResult } from "./types";

type CsvImportModalProps = {
  open: boolean;
  entityName: string;
  importEndpoint: string;
  sampleCsvColumns: string[];
  templateFileName: string;
  onCancel: () => void;
  onSuccess: () => void;
};

export function CsvImportModal({
  open,
  entityName,
  importEndpoint,
  sampleCsvColumns,
  templateFileName,
  onCancel,
  onSuccess,
}: CsvImportModalProps) {
  const { message } = App.useApp();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportCsvResult | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setLoading(false);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const uploadProps: UploadProps = {
    accept: ".csv",
    maxCount: 1,
    beforeUpload: (selectedFile) => {
      if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
        message.error("Vui lòng chọn file .csv");
        return Upload.LIST_IGNORE;
      }
      setFile(selectedFile);
      setResult(null);
      return false;
    },
    onRemove: () => {
      setFile(null);
      setResult(null);
    },
    fileList: file
      ? [
          {
            uid: file.name,
            name: file.name,
            status: "done",
          },
        ]
      : [],
  };

  const downloadTemplate = () => {
    const content = `${sampleCsvColumns.join(",")}\n`;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = templateFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) {
      message.warning("Vui lòng chọn file CSV trước khi import");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const { data } = await httpClient.post<ImportCsvResult>(
        importEndpoint,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setResult(data);
      if (data.successCount > 0) {
        onSuccess();
      }
      if (data.failedCount > 0 || data.skippedCount > 0) {
        message.warning(
          `Đã import ${data.successCount} dòng, ${data.skippedCount} dòng bị bỏ qua, ${data.failedCount} dòng lỗi.`,
        );
      } else {
        message.success(`Đã import ${data.successCount} dòng ${entityName}`);
      }
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể import CSV"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Import CSV - ${entityName}`}
      open={open}
      onCancel={handleCancel}
      width={760}
      footer={[
        <Button key="template" icon={<DownloadOutlined />} onClick={downloadTemplate}>
          Tải file mẫu CSV
        </Button>,
        <Button key="cancel" onClick={handleCancel}>
          Hủy
        </Button>,
        <Button key="import" type="primary" loading={loading} onClick={handleImport}>
          Import
        </Button>,
      ]}
    >
      <Space direction="vertical" size="middle" className="w-full">
        <Typography.Paragraph className="mb-0 text-gray-600">
          Chọn file CSV đúng định dạng. Hệ thống sẽ import từng dòng độc lập;
          dòng lỗi hoặc trùng dữ liệu sẽ được báo trong bảng kết quả.
        </Typography.Paragraph>
        <Typography.Text type="secondary">
          Cột mẫu: {sampleCsvColumns.join(", ")}
        </Typography.Text>
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Bấm hoặc kéo file CSV vào đây</p>
          <p className="ant-upload-hint">Chỉ nhận file .csv, tối đa 5MB.</p>
        </Upload.Dragger>
        {result && (
          <Space direction="vertical" size="middle" className="w-full">
            <ImportResultSummary result={result} />
            <ImportErrorTable errors={result.errors} />
          </Space>
        )}
      </Space>
    </Modal>
  );
}
