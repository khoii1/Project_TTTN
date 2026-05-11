export const ENTITY_LABELS = {
  dashboard: "Tổng quan",
  lead: "Khách hàng tiềm năng",
  leads: "Khách hàng tiềm năng",
  account: "Khách hàng / Công ty",
  accounts: "Khách hàng / Công ty",
  contact: "Người liên hệ",
  contacts: "Người liên hệ",
  opportunity: "Cơ hội bán hàng",
  opportunities: "Cơ hội bán hàng",
  task: "Công việc",
  tasks: "Công việc",
  case: "Yêu cầu hỗ trợ",
  cases: "Yêu cầu hỗ trợ",
  user: "Người dùng",
  users: "Người dùng",
  settings: "Cài đặt",
  organization: "Tổ chức",
  recycleBin: "Thùng rác",
  note: "Ghi chú",
  notes: "Ghi chú",
} as const;

export const ACTION_LABELS = {
  create: "Tạo mới",
  new: "Mới",
  add: "Thêm",
  edit: "Chỉnh sửa",
  update: "Cập nhật",
  delete: "Xóa",
  restore: "Khôi phục",
  permanentDelete: "Xóa vĩnh viễn",
  save: "Lưu",
  cancel: "Hủy",
  back: "Quay lại",
  view: "Xem",
  search: "Tìm kiếm",
  filter: "Lọc",
  clear: "Xóa lọc",
  refresh: "Làm mới",
  submit: "Xác nhận",
  confirm: "Xác nhận",
  close: "Đóng",
  complete: "Hoàn thành",
  markComplete: "Đánh dấu hoàn thành",
  logout: "Đăng xuất",
  login: "Đăng nhập",
  register: "Đăng ký",
  convertLead: "Chuyển đổi khách hàng tiềm năng",
} as const;

export const FIELD_LABELS = {
  name: "Tên",
  firstName: "Tên",
  lastName: "Họ",
  company: "Công ty",
  title: "Chức danh",
  email: "Email",
  phone: "Số điện thoại",
  website: "Website",
  subject: "Tiêu đề",
  description: "Mô tả",
  amount: "Giá trị",
  closeDate: "Ngày chốt dự kiến",
  dueDate: "Hạn hoàn thành",
  nextStep: "Bước tiếp theo",
  status: "Trạng thái",
  stage: "Giai đoạn",
  priority: "Mức độ ưu tiên",
  type: "Loại",
  source: "Nguồn",
  sourceDetail: "Chi tiết nguồn",
  owner: "Người phụ trách",
  assignedTo: "Người được giao",
  relatedTo: "Liên quan đến",
  relatedRecord: "Bản ghi liên quan",
  createdAt: "Ngày tạo",
  updatedAt: "Ngày cập nhật",
  deletedAt: "Ngày xóa",
  billingAddress: "Địa chỉ thanh toán",
  shippingAddress: "Địa chỉ giao hàng",
  mailingAddress: "Địa chỉ liên hệ",
  country: "Quốc gia",
  street: "Đường / Địa chỉ",
  city: "Thành phố",
  state: "Tỉnh / Bang",
  postalCode: "Mã bưu chính",
  role: "Vai trò",
  password: "Mật khẩu",
  organizationName: "Tên tổ chức",
  account: "Khách hàng / Công ty",
  contact: "Người liên hệ",
  opportunity: "Cơ hội bán hàng",
} as const;

export const SECTION_LABELS = {
  details: "Chi tiết",
  related: "Liên quan",
  activity: "Hoạt động",
  about: "Thông tin chung",
  contactInformation: "Thông tin liên hệ",
  addressInformation: "Thông tin địa chỉ",
  sourceInformation: "Thông tin nguồn",
  systemInformation: "Thông tin hệ thống",
  relatedContacts: "Người liên hệ liên quan",
  relatedOpportunities: "Cơ hội liên quan",
  relatedCases: "Yêu cầu hỗ trợ liên quan",
  relatedTasks: "Công việc liên quan",
  activityTimeline: "Dòng hoạt động",
  convertedRecords: "Bản ghi đã chuyển đổi",
  conversionSuggestions: "Gợi ý chuyển đổi",
  possibleExistingRecords: "Bản ghi có thể đã tồn tại",
} as const;

export const STATUS_LABELS: Record<string, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  NURTURING: "Đang chăm sóc",
  QUALIFIED: "Đủ điều kiện",
  UNQUALIFIED: "Không đủ điều kiện",
  CONVERTED: "Đã chuyển đổi",
  QUALIFY: "Xác định nhu cầu",
  PROPOSE: "Đề xuất",
  NEGOTIATE: "Đàm phán",
  CLOSED_WON: "Chốt thành công",
  CLOSED_LOST: "Chốt thất bại",
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  WORKING: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
  CLOSED: "Đã đóng",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

export const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Nhập thủ công",
  WEBSITE: "Website",
  FACEBOOK: "Facebook",
  GOOGLE_ADS: "Google Ads",
  ZALO: "Zalo",
  EMAIL: "Email",
  PHONE: "Gọi điện",
  REFERRAL: "Giới thiệu",
  EVENT: "Sự kiện",
  IMPORT_CSV: "Nhập từ CSV",
  CHATBOT: "Chatbot",
  API: "API",
  CONVERTED_LEAD: "Chuyển đổi từ khách hàng tiềm năng",
  OTHER: "Khác",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  SALES: "Nhân viên bán hàng",
  SUPPORT: "Nhân viên hỗ trợ",
};

export const EMPTY_STATE_LABELS = {
  noResults: "Không tìm thấy kết quả",
  noRecords: "Không có bản ghi",
  noDeletedRecords: "Không có bản ghi đã xóa",
  recordNotFound: "Không tìm thấy bản ghi",
  unknownUser: "Người dùng không xác định",
  unknownRecord: "Bản ghi không xác định",
  loading: "Đang tải...",
  noUpcomingTasks: "Không có công việc sắp đến hạn",
  noRecentLeads: "Không có khách hàng tiềm năng gần đây",
} as const;

export const FEEDBACK_LABELS = {
  cannotUndo: "Hành động này không thể hoàn tác.",
  deleteConfirm: "Bạn có chắc muốn xóa bản ghi này không?",
  restoreConfirm: "Bạn có muốn khôi phục bản ghi này không?",
  created: "Tạo thành công",
  updated: "Cập nhật thành công",
  deleted: "Xóa thành công",
  restored: "Khôi phục thành công",
  loadError: "Không thể tải dữ liệu",
  createError: "Không thể tạo bản ghi",
  updateError: "Không thể cập nhật bản ghi",
  deleteError: "Không thể xóa bản ghi",
  restoreError: "Không thể khôi phục bản ghi",
} as const;

export const getStatusLabel = (value?: string | null) =>
  value ? STATUS_LABELS[value] || value : "-";

export const getPriorityLabel = (value?: string | null) =>
  value ? PRIORITY_LABELS[value] || value : "-";

export const getSourceLabel = (value?: string | null) =>
  value ? SOURCE_LABELS[value] || value : "-";

export const getRoleLabel = (value?: string | null) =>
  value ? ROLE_LABELS[value] || value : "-";
