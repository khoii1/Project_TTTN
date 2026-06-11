"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
} from "antd";
import {
  DeleteOutlined,
  FilePdfOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
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

type Props = {
  opportunityId: string;
};

const quoteStatusLabels: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: "Nháp",
  [QuoteStatus.SENT]: "Đã gửi",
  [QuoteStatus.ACCEPTED]: "Đã chấp nhận",
  [QuoteStatus.REJECTED]: "Đã từ chối",
  [QuoteStatus.EXPIRED]: "Hết hạn",
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

export function OpportunitySalesCards({ opportunityId }: Props) {
  const { message } = App.useApp();
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
  const [productForm] = Form.useForm();
  const [packageForm] = Form.useForm();
  const [quoteForm] = Form.useForm();
  const [contractForm] = Form.useForm();

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

  const acceptedQuotes = useMemo(
    () => quotes.filter((quote) => quote.status === QuoteStatus.ACCEPTED),
    [quotes],
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
      setProductModalOpen(false);
      load();
    } catch {
      message.error("Không thể thêm sản phẩm");
    }
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
    expiresAt?: dayjs.Dayjs;
    notes?: string;
    paymentTerms?: string;
  }) => {
    try {
      await opportunitiesApi.createQuote(opportunityId, {
        ...values,
        expiresAt: values.expiresAt?.toISOString(),
      });
      message.success("Đã tạo báo giá");
      quoteForm.resetFields();
      setQuoteModalOpen(false);
      load();
    } catch {
      message.error("Không thể tạo báo giá. Vui lòng kiểm tra sản phẩm đã chọn.");
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
              onClick={() => setProductModalOpen(true)}
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
          rows.length > 0 ? (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setQuoteModalOpen(true)}
            >
              Tạo báo giá
            </Button>
          ) : null
        }
      >
        {quotes.length ? (
          <List
            itemLayout="vertical"
            dataSource={quotes}
            renderItem={(quote) => (
              <List.Item>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {quote.quoteNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      Hết hạn: {formatDate(quote.expiresAt)}
                    </div>
                  </div>
                  <Tag color={statusColor(quote.status)}>
                    {quoteStatusLabels[quote.status]}
                  </Tag>
                </div>
                <div className="mt-2 text-sm font-semibold">
                  {formatVndAmount(quote.totalAmount)}
                </div>
                <Space className="mt-3" wrap size={6}>
                  <Select
                    size="small"
                    value={quote.status}
                    onChange={(status) => handleQuoteStatus(quote.id, status)}
                    options={Object.values(QuoteStatus).map((status) => ({
                      value: status,
                      label: quoteStatusLabels[status],
                    }))}
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
            )}
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
          acceptedQuotes.length > 0 ? (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setContractModalOpen(true)}
            >
              Tạo hợp đồng
            </Button>
          ) : null
        }
      >
        {contracts.length ? (
          <List
            itemLayout="vertical"
            dataSource={contracts}
            renderItem={(contract) => (
              <List.Item>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {contract.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {contract.contractNumber}
                    </div>
                  </div>
                  <Tag color={statusColor(contract.status)}>
                    {contractStatusLabels[contract.status]}
                  </Tag>
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
            )}
          />
        ) : (
          <RelatedEmpty description="Chưa có hợp đồng từ báo giá đã chấp nhận." />
        )}
      </Card>

      <Modal
        title="Thêm sản phẩm"
        open={productModalOpen}
        onCancel={() => setProductModalOpen(false)}
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
              options={products.map((product) => ({
                value: product.id,
                label: `${product.name} (${product.code})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0.01} />
          </Form.Item>
          <Form.Item name="unitPrice" label="Đơn giá tùy chỉnh">
            <InputNumber className="w-full" min={0} addonAfter="VNĐ" />
          </Form.Item>
          <Form.Item name="discountAmount" label="Giảm giá">
            <InputNumber className="w-full" min={0} addonAfter="VNĐ" />
          </Form.Item>
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
        onCancel={() => setQuoteModalOpen(false)}
        onOk={() => quoteForm.submit()}
        okText="Tạo báo giá"
        cancelText="Hủy"
      >
        <Form form={quoteForm} layout="vertical" onFinish={handleCreateQuote}>
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
              placeholder="Chọn báo giá"
              options={acceptedQuotes.map((quote) => ({
                value: quote.id,
                label: `${quote.quoteNumber} - ${formatVndAmount(quote.totalAmount)}`,
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
