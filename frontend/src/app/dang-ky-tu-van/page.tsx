"use client";

import {
  BarChartOutlined,
  CheckCircleOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import axios from "axios";
import { useState } from "react";

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

type LeadCaptureFormValues = {
  fullName: string;
  phone?: string;
  email?: string;
  company: string;
  title?: string;
  website?: string;
  industry?: string;
  provinceName?: string;
  wardName?: string;
  addressDetail?: string;
  companySize?: string;
  preferredContactTime?: string;
  message: string;
  companyFaxHidden?: string;
};

type LeadCaptureResponse = {
  message?: string;
};

const successMessage =
  "Cảm ơn bạn đã đăng ký tư vấn. Chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.";

const benefits = [
  {
    icon: <TeamOutlined />,
    title: "Quản lý khách hàng tập trung",
    description: "Lưu trữ Lead, Account, Contact và lịch sử chăm sóc trong một nơi.",
  },
  {
    icon: <BarChartOutlined />,
    title: "Theo dõi cơ hội bán hàng",
    description: "Nắm pipeline, giá trị cơ hội và giai đoạn bán hàng theo thời gian thực.",
  },
  {
    icon: <CustomerServiceOutlined />,
    title: "Nhắc việc chăm sóc khách hàng",
    description: "Tạo task, ghi chú và case hỗ trợ để đội ngũ không bỏ sót việc quan trọng.",
  },
];

const getFriendlyErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return "Không thể gửi đăng ký lúc này. Vui lòng thử lại sau.";
  }

  const message = error.response?.data?.message;

  if (Array.isArray(message)) {
    return message[0] || "Thông tin đăng ký chưa hợp lệ.";
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return "Không thể gửi đăng ký lúc này. Vui lòng thử lại sau.";
};

export default function LeadCapturePage() {
  const [form] = Form.useForm<LeadCaptureFormValues>();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: LeadCaptureFormValues) => {
    const hasEmail = Boolean(values.email?.trim());
    const hasPhone = Boolean(values.phone?.trim());

    if (!hasEmail && !hasPhone) {
      message.error("Vui lòng nhập email hoặc số điện thoại.");
      return;
    }

    try {
      setSubmitting(true);
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const { data } = await axios.post<LeadCaptureResponse>(
        `${apiBaseUrl}/public/lead-capture`,
        values,
      );

      message.success(data.message || successMessage);
      form.resetFields();
    } catch (error) {
      message.error(getFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="pt-4 lg:pt-12">
          <Text className="font-semibold uppercase tracking-wide text-blue-600">
            CRM cho đội kinh doanh
          </Text>
          <Title className="mt-3 !mb-4 !text-4xl !leading-tight sm:!text-5xl">
            Đăng ký tư vấn giải pháp CRM
          </Title>
          <Paragraph className="max-w-xl !text-base !leading-7 text-slate-600">
            Vui lòng để lại thông tin, đội ngũ tư vấn sẽ liên hệ với bạn trong
            thời gian sớm nhất.
          </Paragraph>

          <div className="mt-8 grid gap-4">
            {benefits.map((item) => (
              <div
                key={item.title}
                className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-600">
                  {item.icon}
                </div>
                <div>
                  <Text strong>{item.title}</Text>
                  <Paragraph className="!mb-0 !mt-1 text-slate-600">
                    {item.description}
                  </Paragraph>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Card className="shadow-sm" styles={{ body: { padding: 28 } }}>
          <Space direction="vertical" size={4} className="mb-6 w-full">
            <Title level={3} className="!mb-0">
              Thông tin đăng ký
            </Title>
            <Text type="secondary">
              Các trường có dấu * là bắt buộc. Bạn chỉ cần cung cấp email hoặc
              số điện thoại.
            </Text>
          </Space>

          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            onFinish={handleSubmit}
          >
            <Form.Item name="companyFaxHidden" className="hidden" style={{ display: "none" }}>
              <Input tabIndex={-1} autoComplete="off" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="fullName"
                  label="Họ và tên"
                  rules={[{ required: true, message: "Vui lòng nhập họ và tên." }]}
                >
                  <Input placeholder="Nguyễn Minh An" maxLength={120} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="company"
                  label="Tên công ty"
                  rules={[{ required: true, message: "Vui lòng nhập tên công ty." }]}
                >
                  <Input placeholder="Công ty TNHH Nội Thất An Phát" maxLength={160} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="phone" label="Số điện thoại">
                  <Input placeholder="0908456789" maxLength={30} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ type: "email", message: "Email không hợp lệ." }]}
                >
                  <Input placeholder="an.nguyen@congty.vn" maxLength={160} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="title" label="Chức vụ">
                  <Input placeholder="Giám đốc kinh doanh" maxLength={120} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="website" label="Website công ty">
                  <Input placeholder="https://congty.vn" maxLength={180} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="industry" label="Lĩnh vực hoạt động">
                  <Input placeholder="Nội thất, bán lẻ, dịch vụ..." maxLength={120} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="companySize" label="Quy mô công ty">
                  <Select
                    placeholder="Chọn quy mô"
                    allowClear
                    options={[
                      { value: "1-10 nhân sự", label: "1-10 nhân sự" },
                      { value: "20-50 nhân sự", label: "20-50 nhân sự" },
                      { value: "50-100 nhân sự", label: "50-100 nhân sự" },
                      { value: "Trên 100 nhân sự", label: "Trên 100 nhân sự" },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="provinceName" label="Tỉnh/Thành phố">
                  <Input placeholder="TP. Hồ Chí Minh" maxLength={120} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="wardName" label="Phường/Xã">
                  <Input placeholder="Phường Bến Nghé" maxLength={120} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="addressDetail" label="Địa chỉ chi tiết">
              <Input placeholder="Số nhà, tên đường, tòa nhà..." maxLength={240} />
            </Form.Item>

            <Form.Item name="preferredContactTime" label="Thời gian muốn được liên hệ">
              <Select
                placeholder="Chọn thời gian phù hợp"
                allowClear
                options={[
                  { value: "Buổi sáng", label: "Buổi sáng" },
                  { value: "Buổi chiều", label: "Buổi chiều" },
                  { value: "Ngoài giờ hành chính", label: "Ngoài giờ hành chính" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="message"
              label="Nhu cầu tư vấn"
              rules={[{ required: true, message: "Vui lòng nhập nhu cầu tư vấn." }]}
            >
              <TextArea
                rows={5}
                maxLength={1000}
                showCount
                placeholder="Tôi muốn được tư vấn hệ thống CRM để quản lý khách hàng và đội kinh doanh."
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              icon={<CheckCircleOutlined />}
              loading={submitting}
            >
              Gửi đăng ký tư vấn
            </Button>
          </Form>
        </Card>
      </div>
    </main>
  );
}
