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
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ShoppingOutlined,
  StopOutlined,
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
import { getApiErrorMessage } from "@/lib/api/error";

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
  const [activeTab, setActiveTab] = useState("products");
  const [deletingProductIds, setDeletingProductIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [deletingPackageIds, setDeletingPackageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [productPagination, setProductPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [packagePagination, setPackagePagination] = useState({
    current: 1,
    pageSize: 10,
  });
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

  const toggleProduct = async (product: ProductCatalogItem) => {
    try {
      const updated = await productCatalogApi.updateProduct(product.id, {
        isActive: !product.isActive,
      });
      setProducts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      message.success(
        updated.isActive ? "Đã bật hoạt động sản phẩm" : "Đã tắt hoạt động sản phẩm",
      );
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể thay đổi trạng thái sản phẩm"));
    }
  };

  const deleteProduct = async (product: ProductCatalogItem) => {
    if (deletingProductIds.has(product.id)) return;

    setDeletingProductIds((current) => new Set(current).add(product.id));
    try {
      await productCatalogApi.deleteProduct(product.id);
      setProducts((current) => {
        const next = current.filter((item) => item.id !== product.id);
        const maxPage = Math.max(1, Math.ceil(next.length / productPagination.pageSize));
        setProductPagination((pagination) => ({
          ...pagination,
          current: Math.min(pagination.current, maxPage),
        }));
        return next;
      });
      message.success("Đã xóa sản phẩm vĩnh viễn");
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể xóa sản phẩm"));
    } finally {
      setDeletingProductIds((current) => {
        const next = new Set(current);
        next.delete(product.id);
        return next;
      });
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

  const togglePackage = async (productPackage: ProductPackage) => {
    try {
      const updated = await productCatalogApi.updatePackage(productPackage.id, {
        isActive: !productPackage.isActive,
      });
      setPackages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      message.success(
        updated.isActive
          ? "Đã bật hoạt động gói sản phẩm"
          : "Đã tắt hoạt động gói sản phẩm",
      );
    } catch (error) {
      message.error(
        getApiErrorMessage(error, "Không thể thay đổi trạng thái gói sản phẩm"),
      );
    }
  };

  const deletePackage = async (productPackage: ProductPackage) => {
    if (deletingPackageIds.has(productPackage.id)) return;

    setDeletingPackageIds((current) => new Set(current).add(productPackage.id));
    try {
      await productCatalogApi.deletePackage(productPackage.id);
      setPackages((current) => {
        const next = current.filter((item) => item.id !== productPackage.id);
        const maxPage = Math.max(1, Math.ceil(next.length / packagePagination.pageSize));
        setPackagePagination((pagination) => ({
          ...pagination,
          current: Math.min(pagination.current, maxPage),
        }));
        return next;
      });
      message.success("Đã xóa gói sản phẩm vĩnh viễn");
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể xóa gói sản phẩm"));
    } finally {
      setDeletingPackageIds((current) => {
        const next = new Set(current);
        next.delete(productPackage.id);
        return next;
      });
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
      width: 260,
      render: (_, record) => (
        <Space wrap size={4}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditProduct(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title={`${record.isActive ? "Tắt" : "Bật"} hoạt động sản phẩm này?`}
            description={
              record.isActive
                ? "Sản phẩm sẽ không còn xuất hiện trong popup Thêm sản phẩm."
                : "Sản phẩm sẽ có thể được chọn trong nghiệp vụ mới."
            }
            okText={record.isActive ? "Tắt" : "Bật"}
            cancelText="Hủy"
            onConfirm={() => toggleProduct(record)}
          >
            <Button
              size="small"
              danger={record.isActive}
              icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
            >
              {record.isActive ? "Tắt" : "Bật"}
            </Button>
          </Popconfirm>
          {canManage ? (
            <Popconfirm
              title={`Bạn có chắc chắn muốn xóa sản phẩm '${record.name}' không?`}
              description="Hành động này không thể hoàn tác."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{
                danger: true,
                loading: deletingProductIds.has(record.id),
              }}
              onConfirm={() => deleteProduct(record)}
            >
              <Button
                size="small"
                danger
                loading={deletingProductIds.has(record.id)}
                icon={<DeleteOutlined />}
                aria-label={`Xóa sản phẩm ${record.name}`}
              >
                Xóa
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
      width: 260,
      render: (_, record) => (
        <Space wrap size={4}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditPackage(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title={`${record.isActive ? "Tắt" : "Bật"} hoạt động gói sản phẩm này?`}
            description={
              record.isActive
                ? "Gói sẽ không còn xuất hiện trong popup Chọn gói."
                : "Gói sẽ có thể được chọn trong nghiệp vụ mới."
            }
            okText={record.isActive ? "Tắt" : "Bật"}
            cancelText="Hủy"
            onConfirm={() => togglePackage(record)}
          >
            <Button
              size="small"
              danger={record.isActive}
              icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
            >
              {record.isActive ? "Tắt" : "Bật"}
            </Button>
          </Popconfirm>
          {canManage ? (
            <Popconfirm
              title={`Bạn có chắc chắn muốn xóa gói sản phẩm '${record.name}' không?`}
              description="Hành động này không thể hoàn tác."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{
                danger: true,
                loading: deletingPackageIds.has(record.id),
              }}
              onConfirm={() => deletePackage(record)}
            >
              <Button
                size="small"
                danger
                loading={deletingPackageIds.has(record.id)}
                icon={<DeleteOutlined />}
                aria-label={`Xóa gói sản phẩm ${record.name}`}
              >
                Xóa
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
        activeKey={activeTab}
        onChange={setActiveTab}
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
                  pagination={{
                    ...productPagination,
                    showSizeChanger: true,
                    onChange: (current, pageSize) =>
                      setProductPagination({ current, pageSize }),
                  }}
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
                  pagination={{
                    ...packagePagination,
                    showSizeChanger: true,
                    onChange: (current, pageSize) =>
                      setPackagePagination({ current, pageSize }),
                  }}
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
