"use client";

import { useState } from "react";
import { Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { CsvImportModal } from "./CsvImportModal";

type CsvImportButtonProps = {
  entityName: string;
  importEndpoint: string;
  sampleCsvColumns: string[];
  templateFileName: string;
  onSuccess: () => void;
};

export function CsvImportButton(props: CsvImportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button icon={<UploadOutlined />} onClick={() => setOpen(true)}>
        Import CSV
      </Button>
      <CsvImportModal
        {...props}
        open={open}
        onCancel={() => setOpen(false)}
        onSuccess={props.onSuccess}
      />
    </>
  );
}
