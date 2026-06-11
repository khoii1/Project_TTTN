"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuthStore } from "@/features/auth/auth.store";
import { productCatalogApi } from "@/features/product-catalog/product-catalog.api";
import {
  ProductCatalogItem,
  ProductPackage,
  ProductPackagePayload,
  ProductPayload,
  ProductType,
} from "@/features/product-catalog/product-catalog.types";
import { formatVndAmount } from "@/lib/utils/currency";

const productTypeLabels: Record<ProductType, string> = {
  [ProductType.PRODUCT]: "Sản phẩm",
  [ProductType.SERVICE]: "Dịch vụ",
  [ProductType.PACKAGE]: "Gói",
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "-";

export default function ProductsPage() {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [packages, setPackages] = useState<ProductPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<ProductCatalogItem | null>(null);
  const [editingPackage, setEditingPackage] = useState<ProductPackage | null>(
    null,
  );
  const [productForm] = Form.useForm<ProductPayload>();
  const [packageForm] = Form.useForm<ProductPackagePayload>();

  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [productData, packageData] = await Promise.all([
        productCatalogApi.getProducts(),
        productCatalogApi.getPackages(),
      ]);
      setProducts(productData);
      setPackages(packageData);
    } catch {
      message.error("Không thể tải danh mục sản phẩm");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (!canManage) {
      return;
    }

    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [canManage, loadData]);

  const activeProductOptions = useMemo(
    () =>
      products
        .filter((product) => product.isActive)
        .map((product) => ({
          value: product.id,
          label: `${product.name} (${product.code})`,
        })),
    [products],
  );

  const openCreateProduct = () => {
    setEditingProduct(null);
    productForm.resetFields();
    productForm.setFieldsValue({
      type: ProductType.PRODUCT,
      defaultPrice: 0,
      isActive: true,
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (product: ProductCatalogItem) => {
    setEditingProduct(product);
    productForm.setFieldsValue(product);
    setProductModalOpen(true);
  };

  const submitProduct = async (values: ProductPayload) => {
    try {
      if (editingProduct) {
        await productCatalogApi.updateProduct(editingProduct.id, values);
        message.success("Đã cập nhật sản phẩm");
      } else {
        await productCatalogApi.createProduct(values);
        message.success("Đã tạo sản phẩm");
      }
      setProductModalOpen(false);
      loadData();
    } catch {
      message.error("Không thể lưu sản phẩm");
    }
  };

  const deactivateProduct = async (product: ProductCatalogItem) => {
    try {
      await productCatalogApi.deactivateProduct(product.id);
      message.success("Đã tắt hoạt động sản phẩm");
      loadData();
    } catch {
      message.error("Không thể tắt hoạt động sản phẩm");
    }
  };

  const openCreatePackage = () => {
    setEditingPackage(null);
    packageForm.resetFields();
    packageForm.setFieldsValue({
      isActive: true,
      items: [{ quantity: 1 }],
    });
    setPackageModalOpen(true);
  };

  const openEditPackage = (productPackage: ProductPackage) => {
    setEditingPackage(productPackage);
    packageForm.setFieldsValue({
      name: productPackage.name,
      code: productPackage.code,
      description: productPackage.description,
      isActive: productPackage.isActive,
      items: productPackage.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        note: item.note,
      })),
    });
    setPackageModalOpen(true);
  };

  const submitPackage = async (values: ProductPackagePayload) => {
    try {
      const payload = {
        ...values,
        items: values.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity || 1),
          unitPrice:
            item.unitPrice === undefined ? undefined : Number(item.unitPrice),
        })),
      };
      if (editingPackage) {
        await productCatalogApi.updatePackage(editingPackage.id, payload);
        message.success("Đã cập nhật gói sản phẩm");
      } else {
        await productCatalogApi.createPackage(payload);
        message.success("Đã tạo gói sản phẩm");
      }
      setPackageModalOpen(false);
      loadData();
    } catch {
      message.error("Không thể lưu gói sản phẩm");
    }
  };

  const deactivatePackage = async (productPackage: ProductPackage) => {
    try {
      await productCatalogApi.deactivatePackage(productPackage.id);
      message.success("Đã tắt hoạt động gói sản phẩm");
      loadData();
    } catch {
      message.error("Không thể tắt hoạt động gói sản phẩm");
    }
  };

  const productColumns: TableColumnsType<ProductCatalogItem> = [
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      render: (value: string, record) => (
        <div>
          <div className="font-semibold text-gray-900">{value}</div>
          {record.description ? (
            <div className="text-sm text-gray-500">{record.description}</div>
          ) : null}
        </div>
      ),
    },
    { title: "Mã sản phẩm", dataIndex: "code", key: "code" },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      render: (type: ProductType) => productTypeLabels[type],
    },
    { title: "Đơn vị tính", dataIndex: "unit", key: "unit", render: (v) => v || "-" },
    {
      title: "Giá mặc định",
      dataIndex: "defaultPrice",
      key: "defaultPrice",
      render: (value: number) => formatVndAmount(value),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>
          {isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
        </Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: formatDate,
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditProduct(record)}
          >
            Sửa
          </Button>
          {record.isActive ? (
            <Popconfirm
              title="Tắt hoạt động sản phẩm này?"
              description="Sản phẩm sẽ không còn xuất hiện trong popup Thêm sản phẩm."
              okText="Tắt"
              cancelText="Hủy"
              onConfirm={() => deactivateProduct(record)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Tắt
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  const packageColumns: TableColumnsType<ProductPackage> = [
    {
      title: "Tên gói",
      dataIndex: "name",
      key: "name",
      render: (value: string, record) => (
        <div>
          <div className="font-semibold text-gray-900">{value}</div>
          {record.description ? (
            <div className="text-sm text-gray-500">{record.description}</div>
          ) : null}
        </div>
      ),
    },
    { title: "Mã gói", dataIndex: "code", key: "code" },
    {
      title: "Số lượng sản phẩm",
      dataIndex: "itemCount",
      key: "itemCount",
    },
    {
      title: "Tổng giá trị dự kiến",
      dataIndex: "estimatedTotal",
      key: "estimatedTotal",
      render: (value: number) => formatVndAmount(value),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>
          {isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditPackage(record)}
          >
            Sửa
          </Button>
          {record.isActive ? (
            <Popconfirm
              title="Tắt hoạt động gói sản phẩm này?"
              description="Gói sẽ không còn xuất hiện trong popup Chọn gói."
              okText="Tắt"
              cancelText="Hủy"
              onConfirm={() => deactivatePackage(record)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Tắt
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  if (!canManage) {
    return (
      <Card>
        <div className="text-center text-gray-600">
          Bạn không có quyền quản lý danh mục sản phẩm.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sản phẩm"
        subtitle="Quản lý danh mục sản phẩm, dịch vụ và gói sản phẩm dùng trong cơ hội bán hàng."
      />

      <Tabs
        items={[
          {
            key: "products",
            label: "Sản phẩm",
            children: (
              <Card
                className="shadow-sm"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreateProduct}
                  >
                    Thêm sản phẩm
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  columns={productColumns}
                  dataSource={products}
                  loading={loading}
                  scroll={{ x: 1100 }}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                />
              </Card>
            ),
          },
          {
            key: "packages",
            label: "Gói sản phẩm",
            children: (
              <Card
                className="shadow-sm"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreatePackage}
                  >
                    Thêm gói sản phẩm
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  columns={packageColumns}
                  dataSource={packages}
                  loading={loading}
                  scroll={{ x: 1000 }}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}
        open={productModalOpen}
        onCancel={() => setProductModalOpen(false)}
        onOk={() => productForm.submit()}
        okText={editingProduct ? "Lưu thay đổi" : "Thêm sản phẩm"}
        cancelText="Hủy"
      >
        <Form form={productForm} layout="vertical" onFinish={submitProduct}>
          <Form.Item
            name="name"
            label="Tên sản phẩm"
            rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="code"
            label="Mã sản phẩm"
            rules={[{ required: true, message: "Vui lòng nhập mã sản phẩm" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="type"
            label="Loại"
            rules={[{ required: true, message: "Vui lòng chọn loại" }]}
          >
            <Select
              options={Object.values(ProductType).map((type) => ({
                value: type,
                label: productTypeLabels[type],
              }))}
            />
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị tính">
            <Input placeholder="bộ, gói, khóa..." />
          </Form.Item>
          <Form.Item name="defaultPrice" label="Giá mặc định">
            <InputNumber className="w-full" min={0} addonAfter="VNĐ" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="Trạng thái hoạt động"
            valuePropName="checked"
          >
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingPackage ? "Sửa gói sản phẩm" : "Thêm gói sản phẩm"}
        open={packageModalOpen}
        onCancel={() => setPackageModalOpen(false)}
        onOk={() => packageForm.submit()}
        width={900}
        okText={editingPackage ? "Lưu thay đổi" : "Thêm gói"}
        cancelText="Hủy"
      >
        <Form form={packageForm} layout="vertical" onFinish={submitPackage}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="Tên gói"
              rules={[{ required: true, message: "Vui lòng nhập tên gói" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="code"
              label="Mã gói"
              rules={[{ required: true, message: "Vui lòng nhập mã gói" }]}
            >
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="Trạng thái hoạt động"
            valuePropName="checked"
          >
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>

          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold text-gray-900">
              Danh sách sản phẩm trong gói
            </div>
          </div>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map((field) => (
                  <div
                    key={field.key}
                    className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 p-3 md:grid-cols-[minmax(220px,1.5fr)_120px_160px_minmax(160px,1fr)_auto]"
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, "productId"]}
                      label="Sản phẩm"
                      rules={[
                        { required: true, message: "Vui lòng chọn sản phẩm" },
                      ]}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Chọn sản phẩm"
                        options={activeProductOptions}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "quantity"]}
                      label="Số lượng"
                      rules={[
                        { required: true, message: "Nhập số lượng" },
                      ]}
                    >
                      <InputNumber className="w-full" min={0.01} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "unitPrice"]}
                      label="Đơn giá trong gói"
                    >
                      <InputNumber className="w-full" min={0} addonAfter="VNĐ" />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, "note"]} label="Ghi chú">
                      <Input />
                    </Form.Item>
                    <div className="flex items-end pb-6">
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    </div>
                  </div>
                ))}
                <Button
                  icon={<ShoppingOutlined />}
                  onClick={() => add({ quantity: 1 })}
                >
                  Thêm dòng sản phẩm
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
