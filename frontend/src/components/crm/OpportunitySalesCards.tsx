"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tooltip,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
  MoreOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import {
  Contract,
  ContractStatus,
  OpportunityProduct,
  ProductCatalogItem,
  ProductPackage,
  Quote,
  QuoteStatus,
} from "@/features/opportunities/opportunities.types";
import { formatDate, formatDateTime, RelatedEmpty } from "./RecordSections";
import { formatVndAmount } from "@/lib/utils/currency";
import { getApiErrorMessage } from "@/lib/api/error";

type Props = {
  opportunityId: string;
  opportunityName: string;
};

const quoteStatusLabels: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: "Nháp",
  [QuoteStatus.SENT]: "Đã gửi",
  [QuoteStatus.ACCEPTED]: "Đã chấp nhận",
  [QuoteStatus.REJECTED]: "Đã từ chối",
  [QuoteStatus.EXPIRED]: "Hết hạn",
  [QuoteStatus.CANCELLED]: "Đã hủy",
};

const contractStatusLabels: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: "Nháp",
  [ContractStatus.PDF_GENERATED]: "Đã tạo PDF",
  [ContractStatus.SENT]: "Đã gửi khách hàng",
  [ContractStatus.SIGNED]: "Đã ký",
  [ContractStatus.ACTIVE]: "Đang hiệu lực",
  [ContractStatus.CANCELLED]: "Đã hủy",
};

const statusColor = (status: string) => {
  if (["ACCEPTED", "SIGNED", "ACTIVE"].includes(status)) return "green";
  if (["REJECTED", "EXPIRED", "CANCELLED"].includes(status)) return "red";
  if (["SENT", "PDF_GENERATED"].includes(status)) return "blue";
  return "default";
};

const QUOTE_PREVIEW_LIMIT = 3;
const CONTRACT_PREVIEW_LIMIT = 3;

export function OpportunitySalesCards({ opportunityId, opportunityName }: Props) {
  const { message, modal } = App.useApp();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [packages, setPackages] = useState<ProductPackage[]>([]);
  const [rows, setRows] = useState<OpportunityProduct[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [allQuotesOpen, setAllQuotesOpen] = useState(false);
  const [allContractsOpen, setAllContractsOpen] = useState(false);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [quoteToRename, setQuoteToRename] = useState<Quote | null>(null);
  const [selectedProductForForm, setSelectedProductForForm] =
    useState<ProductCatalogItem | null>(null);
  const [productForm] = Form.useForm();
  const [packageForm] = Form.useForm();
  const [quoteForm] = Form.useForm();
  const [renameQuoteForm] = Form.useForm();
  const [contractForm] = Form.useForm();
  const watchedQuantity = Form.useWatch("quantity", productForm);
  const watchedUnitPrice = Form.useWatch("unitPrice", productForm);
  const watchedDiscountAmount = Form.useWatch("discountAmount", productForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, packageData, rowData, quoteData, contractData] =
        await Promise.all([
          opportunitiesApi.getProductsCatalog(),
          opportunitiesApi.getProductPackages(),
          opportunitiesApi.getOpportunityProducts(opportunityId),
          opportunitiesApi.getQuotes(opportunityId),
          opportunitiesApi.getContracts(opportunityId),
        ]);
      setProducts(catalog);
      setPackages(packageData);
      setRows(rowData);
      setQuotes(quoteData);
      setContracts(contractData);
    } catch {
      message.error("Không thể tải dữ liệu sản phẩm, báo giá và hợp đồng");
    } finally {
      setLoading(false);
    }
  }, [message, opportunityId]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const productTotal = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.lineTotal || 0), 0),
    [rows],
  );

  const productLinePreview = useMemo(() => {
    const quantity = Number(watchedQuantity || 0);
    const unitPrice = Number(watchedUnitPrice || 0);
    const discount = Number(watchedDiscountAmount || 0);
    return Math.max(quantity * unitPrice - discount, 0);
  }, [watchedDiscountAmount, watchedQuantity, watchedUnitPrice]);

  const acceptedQuotes = useMemo(
    () => quotes.filter((quote) => quote.status === QuoteStatus.ACCEPTED),
    [quotes],
  );
  const visibleQuotes = useMemo(
    () => quotes.slice(0, QUOTE_PREVIEW_LIMIT),
    [quotes],
  );
  const visibleContracts = useMemo(
    () => contracts.slice(0, CONTRACT_PREVIEW_LIMIT),
    [contracts],
  );

  const handleAddProduct = async (values: {
    productId: string;
    quantity: number;
    unitPrice?: number;
    discountAmount?: number;
  }) => {
    try {
      await opportunitiesApi.addOpportunityProduct(opportunityId, values);
      message.success("Đã thêm sản phẩm vào cơ hội");
      productForm.resetFields();
      setSelectedProductForForm(null);
      setProductModalOpen(false);
      load();
    } catch {
      message.error("Không thể thêm sản phẩm");
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    setSelectedProductForForm(product || null);
    productForm.setFieldsValue({
      productId,
      unitPrice: product?.defaultPrice ?? 0,
    });
  };

  const handleAddPackage = async (values: { packageId: string }) => {
    try {
      await opportunitiesApi.addOpportunityPackage(opportunityId, values.packageId);
      message.success("Đã thêm gói sản phẩm vào cơ hội");
      packageForm.resetFields();
      setPackageModalOpen(false);
      load();
    } catch {
      message.error("Không thể thêm gói sản phẩm");
    }
  };

  const handleRemoveProduct = async (rowId: string) => {
    try {
      await opportunitiesApi.removeOpportunityProduct(opportunityId, rowId);
      message.success("Đã xóa sản phẩm khỏi cơ hội");
      load();
    } catch {
      message.error("Không thể xóa sản phẩm");
    }
  };

  const handleCreateQuote = async (values: {
    name: string;
    expiresAt?: dayjs.Dayjs;
    notes?: string;
    paymentTerms?: string;
  }) => {
    if (quoteSubmitting) return;
    setQuoteSubmitting(true);
    try {
      await opportunitiesApi.createQuote(opportunityId, {
        ...values,
        name: values.name.trim(),
        expiresAt: values.expiresAt?.toISOString(),
      });
      message.success("Đã tạo báo giá");
      quoteForm.resetFields();
      setQuoteModalOpen(false);
      load();
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          "Không thể tạo báo giá. Vui lòng kiểm tra sản phẩm đã chọn.",
        ),
      );
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const openCreateQuoteModal = () => {
    quoteForm.resetFields();
    quoteForm.setFieldsValue({
      name: `Báo giá - ${opportunityName}`.slice(0, 200),
    });
    setQuoteModalOpen(true);
  };

  const closeCreateQuoteModal = () => {
    quoteForm.resetFields();
    setQuoteModalOpen(false);
  };

  const openRenameQuoteModal = (quote: Quote) => {
    setQuoteToRename(quote);
    renameQuoteForm.setFieldsValue({
      name: quote.name || `Báo giá ${quote.quoteNumber}`,
    });
  };

  const closeRenameQuoteModal = () => {
    renameQuoteForm.resetFields();
    setQuoteToRename(null);
  };

  const handleRenameQuote = async (values: { name: string }) => {
    if (!quoteToRename || renameSubmitting) return;

    setRenameSubmitting(true);
    try {
      const updated = await opportunitiesApi.updateQuote(
        opportunityId,
        quoteToRename.id,
        { name: values.name.trim() },
      );
      setQuotes((current) =>
        current.map((quote) => (quote.id === updated.id ? updated : quote)),
      );
      message.success("Đã đổi tên báo giá");
      closeRenameQuoteModal();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể đổi tên báo giá"));
    } finally {
      setRenameSubmitting(false);
    }
  };

  const handleQuoteStatus = async (quoteId: string, status: QuoteStatus) => {
    try {
      await opportunitiesApi.updateQuoteStatus(opportunityId, quoteId, status);
      message.success("Đã cập nhật trạng thái báo giá");
      load();
    } catch {
      message.error("Không thể cập nhật trạng thái báo giá");
    }
  };

  const handleQuotePdf = async (quote: Quote) => {
    try {
      const updated = quote.pdfGeneratedAt
        ? quote
        : await opportunitiesApi.generateQuotePdf(opportunityId, quote.id);
      const url = await opportunitiesApi.getQuotePdfUrl(opportunityId, updated.id);
      window.open(url, "_blank", "noopener,noreferrer");
      load();
    } catch {
      message.error("Không thể xuất hoặc mở PDF báo giá");
    }
  };

  const confirmDeleteQuote = (quote: Quote) => {
    modal.confirm({
      title: "Xóa báo giá nháp?",
      content: `Bạn có chắc muốn xóa báo giá nháp ${quote.quoteNumber} không?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await opportunitiesApi.deleteQuote(opportunityId, quote.id);
          message.success("Đã xóa báo giá nháp");
          load();
        } catch {
          message.error("Không thể xóa báo giá. Báo giá có lịch sử nên hãy dùng chức năng hủy.");
        }
      },
    });
  };

  const confirmCancelQuote = (quote: Quote) => {
    modal.confirm({
      title: "Hủy báo giá?",
      content:
        "Báo giá sẽ được chuyển sang trạng thái Đã hủy. File PDF và hợp đồng đã tạo sẽ được giữ lại để bảo toàn lịch sử.",
      okText: "Hủy báo giá",
      cancelText: "Đóng",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await opportunitiesApi.cancelQuote(opportunityId, quote.id);
          message.success("Đã hủy báo giá");
          load();
        } catch {
          message.error("Không thể hủy báo giá");
        }
      },
    });
  };

  const handleCreateContract = async (values: {
    quoteId: string;
    name?: string;
    startDate?: dayjs.Dayjs;
    endDate?: dayjs.Dayjs;
    paymentTerms?: string;
    terms?: string;
  }) => {
    try {
      await opportunitiesApi.createContract(opportunityId, {
        ...values,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
      });
      message.success("Đã tạo hợp đồng từ báo giá đã chấp nhận");
      contractForm.resetFields();
      setContractModalOpen(false);
      load();
    } catch {
      message.error("Không thể tạo hợp đồng. Cần có báo giá đã chấp nhận.");
    }
  };

  const handleContractPdf = async (contract: Contract) => {
    try {
      const updated = contract.pdfGeneratedAt
        ? contract
        : await opportunitiesApi.generateContractPdf(opportunityId, contract.id);
      const url = await opportunitiesApi.getContractPdfUrl(opportunityId, updated.id);
      window.open(url, "_blank", "noopener,noreferrer");
      load();
    } catch {
      message.error("Không thể xuất hoặc mở PDF hợp đồng");
    }
  };

  const confirmDeleteContract = (contract: Contract) => {
    modal.confirm({
      title: "Xóa hợp đồng nháp?",
      content: `Bạn có chắc muốn xóa hợp đồng nháp ${contract.contractNumber} không?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await opportunitiesApi.deleteContract(opportunityId, contract.id);
          message.success("Đã xóa hợp đồng nháp");
          load();
        } catch {
          message.error("Không thể xóa hợp đồng. Hợp đồng có lịch sử nên hãy dùng chức năng hủy.");
        }
      },
    });
  };

  const confirmCancelContract = (contract: Contract) => {
    modal.confirm({
      title: "Hủy hợp đồng?",
      content:
        "Hợp đồng sẽ được chuyển sang trạng thái Đã hủy. File PDF sẽ được giữ lại để bảo toàn lịch sử.",
      okText: "Hủy hợp đồng",
      cancelText: "Đóng",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await opportunitiesApi.cancelContract(opportunityId, contract.id);
          message.success("Đã hủy hợp đồng");
          load();
        } catch {
          message.error("Không thể hủy hợp đồng");
        }
      },
    });
  };

  const quoteStatusOptions = Object.values(QuoteStatus)
    .filter((status) => status !== QuoteStatus.CANCELLED)
    .map((status) => ({
      value: status,
      label: quoteStatusLabels[status],
    }));

  const renderQuoteItem = (quote: Quote) => {
    const shouldDelete = quote.status === QuoteStatus.DRAFT && !quote.pdfGeneratedAt;
    const canRename = quote.status === QuoteStatus.DRAFT && !quote.pdfGeneratedAt;
    const quoteName = quote.name || `Báo giá ${quote.quoteNumber}`;
    const actionItems: MenuProps["items"] = [
      {
        key: "rename",
        label: "Đổi tên báo giá",
        icon: <EditOutlined />,
        disabled: !canRename,
      },
      {
        key: "pdf",
        label: quote.pdfGeneratedAt ? "Xem / tải PDF" : "Xuất PDF",
        icon: <FilePdfOutlined />,
      },
      {
        key: shouldDelete ? "delete" : "cancel",
        label: shouldDelete ? "Xóa báo giá nháp" : "Hủy báo giá",
        danger: true,
        icon: <DeleteOutlined />,
      },
    ];

    return (
      <List.Item>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Tooltip title={quoteName}>
              <div className="break-words font-semibold leading-5 text-gray-900">
                {quoteName}
              </div>
            </Tooltip>
            <div className="mt-0.5 break-all text-sm text-gray-500">
              Mã: {quote.quoteNumber}
            </div>
            <div className="text-sm text-gray-500">
              Hết hạn: {formatDate(quote.expiresAt)}
            </div>
          </div>
          <Space size={4}>
            <Tag color={statusColor(quote.status)}>
              {quoteStatusLabels[quote.status]}
            </Tag>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: actionItems,
                onClick: ({ key }) => {
                  if (key === "rename") openRenameQuoteModal(quote);
                  if (key === "pdf") handleQuotePdf(quote);
                  if (key === "delete") confirmDeleteQuote(quote);
                  if (key === "cancel") confirmCancelQuote(quote);
                },
              }}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        </div>
        <div className="mt-2 text-sm font-semibold">
          {formatVndAmount(quote.totalAmount)}
        </div>
        <Space className="mt-3" wrap size={6}>
          <Select
            size="small"
            value={quote.status}
            onChange={(status) => handleQuoteStatus(quote.id, status)}
            options={quoteStatusOptions}
            className="min-w-32"
          />
          <Button
            size="small"
            icon={<FilePdfOutlined />}
            onClick={() => handleQuotePdf(quote)}
          >
            {quote.pdfGeneratedAt ? "Tải PDF" : "Xuất PDF"}
          </Button>
        </Space>
        {quote.pdfGeneratedAt ? (
          <div className="mt-2 text-xs text-gray-500">
            PDF: {formatDateTime(quote.pdfGeneratedAt)}
          </div>
        ) : null}
      </List.Item>
    );
  };

  const renderContractItem = (contract: Contract) => {
    const shouldDelete =
      contract.status === ContractStatus.DRAFT && !contract.pdfGeneratedAt;
    const actionItems: MenuProps["items"] = [
      {
        key: "pdf",
        label: contract.pdfGeneratedAt ? "Xem / tải PDF" : "Xuất PDF",
        icon: <FilePdfOutlined />,
      },
      {
        key: shouldDelete ? "delete" : "cancel",
        label: shouldDelete ? "Xóa hợp đồng nháp" : "Hủy hợp đồng",
        danger: true,
        icon: <DeleteOutlined />,
      },
    ];

    return (
      <List.Item>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-semibold text-gray-900">
              {contract.name}
            </div>
            <div className="text-sm text-gray-500">
              {contract.contractNumber}
            </div>
          </div>
          <Space size={4}>
            <Tag color={statusColor(contract.status)}>
              {contractStatusLabels[contract.status]}
            </Tag>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: actionItems,
                onClick: ({ key }) => {
                  if (key === "pdf") handleContractPdf(contract);
                  if (key === "delete") confirmDeleteContract(contract);
                  if (key === "cancel") confirmCancelContract(contract);
                },
              }}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        </div>
        <div className="mt-2 text-sm">
          Hiệu lực: {formatDate(contract.startDate)}
          {contract.endDate ? ` - ${formatDate(contract.endDate)}` : ""}
        </div>
        <div className="mt-1 font-semibold">
          {formatVndAmount(contract.totalAmount)}
        </div>
        <Button
          className="mt-3"
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() => handleContractPdf(contract)}
        >
          {contract.pdfGeneratedAt ? "Tải PDF" : "Xuất PDF"}
        </Button>
      </List.Item>
    );
  };

  return (
    <>
      <Card
        title="Sản phẩm liên quan"
        size="small"
        className="shadow-sm"
        loading={loading}
        extra={
          <Space size={4}>
            <Button
              size="small"
            icon={<PlusOutlined />}
              onClick={() => {
                setSelectedProductForForm(null);
                setProductModalOpen(true);
              }}
            >
              Thêm
            </Button>
            <Button size="small" onClick={() => setPackageModalOpen(true)}>
              Chọn gói
            </Button>
          </Space>
        }
      >
        {rows.length ? (
          <>
            <List
              itemLayout="vertical"
              dataSource={rows}
              renderItem={(row) => (
                <List.Item
                  actions={[
                    <Popconfirm
                      key="delete"
                      title="Xóa sản phẩm khỏi cơ hội?"
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleRemoveProduct(row.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />}>
                        Xóa
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<ShoppingCartOutlined className="text-blue-600" />}
                    title={row.productName}
                    description={`${row.productCode} · ${row.quantity} ${row.unit || ""}`}
                  />
                  <div className="text-sm text-gray-600">
                    Đơn giá {formatVndAmount(row.unitPrice)}
                    {row.discountAmount > 0
                      ? ` · Giảm ${formatVndAmount(row.discountAmount)}`
                      : ""}
                  </div>
                  <div className="mt-1 font-semibold text-gray-900">
                    {formatVndAmount(row.lineTotal)}
                  </div>
                </List.Item>
              )}
            />
            <Divider className="my-3" />
            <div className="flex justify-between text-sm font-semibold">
              <span>Tổng sản phẩm</span>
              <span>{formatVndAmount(productTotal)}</span>
            </div>
          </>
        ) : (
          <RelatedEmpty description="Chưa có sản phẩm trong cơ hội này." />
        )}
      </Card>

      <Card
        title={`Báo giá (${quotes.length})`}
        size="small"
        className="shadow-sm"
        extra={
          <Space size={4}>
            {quotes.length > QUOTE_PREVIEW_LIMIT ? (
              <Button size="small" onClick={() => setAllQuotesOpen(true)}>
                Xem tất cả
              </Button>
            ) : null}
            {rows.length > 0 ? (
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={openCreateQuoteModal}
              >
                Tạo báo giá
              </Button>
            ) : null}
          </Space>
        }
      >
        {quotes.length ? (
          <List
            itemLayout="vertical"
            dataSource={visibleQuotes}
            renderItem={renderQuoteItem}
          />
        ) : (
          <RelatedEmpty description="Chưa có báo giá cho cơ hội này." />
        )}
      </Card>

      <Card
        title={`Hợp đồng (${contracts.length})`}
        size="small"
        className="shadow-sm"
        extra={
          <Space size={4}>
            {contracts.length > CONTRACT_PREVIEW_LIMIT ? (
              <Button size="small" onClick={() => setAllContractsOpen(true)}>
                Xem tất cả
              </Button>
            ) : null}
            {acceptedQuotes.length > 0 ? (
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setContractModalOpen(true)}
              >
                Tạo hợp đồng
              </Button>
            ) : null}
          </Space>
        }
      >
        {contracts.length ? (
          <List
            itemLayout="vertical"
            dataSource={visibleContracts}
            renderItem={renderContractItem}
          />
        ) : (
          <RelatedEmpty description="Chưa có hợp đồng từ báo giá đã chấp nhận." />
        )}
      </Card>

      <Modal
        title={`Tất cả báo giá (${quotes.length})`}
        open={allQuotesOpen}
        onCancel={() => setAllQuotesOpen(false)}
        footer={null}
        width={720}
      >
        {quotes.length ? (
          <List
            itemLayout="vertical"
            dataSource={quotes}
            renderItem={renderQuoteItem}
          />
        ) : (
          <RelatedEmpty description="Chưa có báo giá cho cơ hội này." />
        )}
      </Modal>

      <Modal
        title={`Tất cả hợp đồng (${contracts.length})`}
        open={allContractsOpen}
        onCancel={() => setAllContractsOpen(false)}
        footer={null}
        width={720}
      >
        {contracts.length ? (
          <List
            itemLayout="vertical"
            dataSource={contracts}
            renderItem={renderContractItem}
          />
        ) : (
          <RelatedEmpty description="Chưa có hợp đồng từ báo giá đã chấp nhận." />
        )}
      </Modal>

      <Modal
        title="Thêm sản phẩm"
        open={productModalOpen}
        onCancel={() => {
          setSelectedProductForForm(null);
          setProductModalOpen(false);
        }}
        onOk={() => productForm.submit()}
        okText="Thêm sản phẩm"
        cancelText="Hủy"
      >
        <Form
          form={productForm}
          layout="vertical"
          onFinish={handleAddProduct}
          initialValues={{ quantity: 1, discountAmount: 0 }}
        >
          <Form.Item name="productId" label="Sản phẩm" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Chọn sản phẩm"
              optionFilterProp="label"
              onChange={handleProductChange}
              options={products.map((product) => ({
                value: product.id,
                label: `${product.name} (${product.code})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0.01} />
          </Form.Item>
          {selectedProductForForm ? (
            <div className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Giá mặc định:{" "}
              {formatVndAmount(selectedProductForForm.defaultPrice || 0)}
            </div>
          ) : null}
          <Form.Item name="unitPrice" label="Đơn giá áp dụng (VNĐ)">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item name="discountAmount" label="Giảm giá (VNĐ)">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-500">Tạm tính: </span>
            <span className="font-semibold text-gray-900">
              {formatVndAmount(productLinePreview)}
            </span>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Chọn gói sản phẩm"
        open={packageModalOpen}
        onCancel={() => setPackageModalOpen(false)}
        onOk={() => packageForm.submit()}
        okText="Thêm gói"
        cancelText="Hủy"
      >
        <Form form={packageForm} layout="vertical" onFinish={handleAddPackage}>
          <Form.Item name="packageId" label="Gói sản phẩm" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Chọn gói"
              optionFilterProp="label"
              options={packages.map((item) => ({
                value: item.id,
                label: `${item.name} (${item.items.length} sản phẩm)`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Tạo báo giá"
        open={quoteModalOpen}
        onCancel={closeCreateQuoteModal}
        onOk={() => quoteForm.submit()}
        okText="Tạo báo giá"
        cancelText="Hủy"
        confirmLoading={quoteSubmitting}
        okButtonProps={{ disabled: quoteSubmitting }}
      >
        <Form form={quoteForm} layout="vertical" onFinish={handleCreateQuote}>
          <Form.Item
            name="name"
            label="Tên báo giá"
            required
            rules={[
              { required: true, whitespace: true, message: "Tên báo giá là bắt buộc." },
              { max: 200, message: "Tên báo giá không được vượt quá 200 ký tự." },
            ]}
          >
            <Input
              autoFocus
              maxLength={200}
              showCount
              placeholder="Ví dụ: Báo giá gói nhượng quyền tiêu chuẩn"
            />
          </Form.Item>
          <Form.Item name="expiresAt" label="Ngày hết hạn">
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="paymentTerms" label="Điều khoản thanh toán">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Đổi tên báo giá"
        open={Boolean(quoteToRename)}
        onCancel={closeRenameQuoteModal}
        onOk={() => renameQuoteForm.submit()}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={renameSubmitting}
        okButtonProps={{ disabled: renameSubmitting }}
        destroyOnHidden
      >
        <Form
          form={renameQuoteForm}
          layout="vertical"
          onFinish={handleRenameQuote}
        >
          <Form.Item
            name="name"
            label="Tên báo giá"
            required
            rules={[
              { required: true, whitespace: true, message: "Tên báo giá là bắt buộc." },
              { max: 200, message: "Tên báo giá không được vượt quá 200 ký tự." },
            ]}
          >
            <Input autoFocus maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Tạo hợp đồng"
        open={contractModalOpen}
        onCancel={() => setContractModalOpen(false)}
        onOk={() => contractForm.submit()}
        okText="Tạo hợp đồng"
        cancelText="Hủy"
      >
        <Form
          form={contractForm}
          layout="vertical"
          onFinish={handleCreateContract}
          initialValues={{ startDate: dayjs() }}
        >
          <Form.Item
            name="quoteId"
            label="Báo giá đã chấp nhận"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn báo giá"
              options={acceptedQuotes.map((quote) => ({
                value: quote.id,
                label: `${quote.name || `Báo giá ${quote.quoteNumber}`} — ${quote.quoteNumber} - ${formatVndAmount(quote.totalAmount)}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="name" label="Tên hợp đồng">
            <Input />
          </Form.Item>
          <Form.Item name="startDate" label="Ngày bắt đầu">
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="endDate" label="Ngày kết thúc">
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="paymentTerms" label="Điều khoản thanh toán">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="terms" label="Nội dung / điều khoản">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
