export const HCM_PROVINCE_NAME = "Thành phố Hồ Chí Minh";

export const HCM_WARDS = [
  "Phường Sài Gòn",
  "Phường Tân Định",
  "Phường Bến Thành",
  "Phường Cầu Ông Lãnh",
  "Phường Bàn Cờ",
  "Phường Xuân Hòa",
  "Phường Nhiêu Lộc",
  "Phường Xóm Chiếu",
  "Phường Khánh Hội",
  "Phường Vĩnh Hội",
  "Phường Chợ Quán",
  "Phường An Đông",
  "Phường Chợ Lớn",
  "Phường Bình Tây",
  "Phường Bình Tiên",
  "Phường Bình Phú",
  "Phường Phú Lâm",
  "Phường Tân Thuận",
  "Phường Phú Thuận",
  "Phường Tân Mỹ",
  "Phường Tân Hưng",
  "Phường Chánh Hưng",
  "Phường Phú Định",
  "Phường Bình Đông",
  "Phường Diên Hồng",
  "Phường Vườn Lài",
  "Phường Hòa Hưng",
  "Phường Minh Phụng",
  "Phường Bình Thới",
  "Phường Hòa Bình",
  "Phường Phú Thọ",
  "Phường Đông Hưng Thuận",
  "Phường Trung Mỹ Tây",
  "Phường Tân Thới Hiệp",
  "Phường Thới An",
  "Phường An Phú Đông",
  "Phường An Lạc",
  "Phường Bình Tân",
  "Phường Tân Tạo",
  "Phường Bình Trị Đông",
  "Phường Bình Hưng Hòa",
  "Phường Gia Định",
  "Phường Bình Thạnh",
  "Phường Bình Lợi Trung",
  "Phường Thạnh Mỹ Tây",
  "Phường Bình Quới",
  "Phường Hạnh Thông",
  "Phường An Nhơn",
  "Phường Gò Vấp",
  "Phường An Hội Đông",
  "Phường Thông Tây Hội",
  "Phường An Hội Tây",
  "Phường Đức Nhuận",
  "Phường Cầu Kiệu",
  "Phường Phú Nhuận",
  "Phường Tân Sơn Hòa",
  "Phường Tân Sơn Nhất",
  "Phường Tân Hòa",
  "Phường Bảy Hiền",
  "Phường Tân Bình",
  "Phường Tân Sơn",
  "Phường Tây Thạnh",
  "Phường Tân Sơn Nhì",
  "Phường Phú Thọ Hòa",
  "Phường Tân Phú",
  "Phường Phú Thạnh",
  "Phường Hiệp Bình",
  "Phường Thủ Đức",
  "Phường Tam Bình",
  "Phường Linh Xuân",
  "Phường Tăng Nhơn Phú",
  "Phường Long Bình",
  "Phường Long Phước",
  "Phường Long Trường",
  "Phường Cát Lái",
  "Phường Bình Trưng",
  "Phường Phước Long",
  "Phường An Khánh",
  "Xã Vĩnh Lộc",
  "Xã Tân Vĩnh Lộc",
  "Xã Bình Lợi",
  "Xã Tân Nhựt",
  "Xã Bình Chánh",
  "Xã Hưng Long",
  "Xã Bình Hưng",
  "Xã Bình Khánh",
  "Xã An Thới Đông",
  "Xã Cần Giờ",
  "Xã Củ Chi",
  "Xã Tân An Hội",
  "Xã Thái Mỹ",
  "Xã An Nhơn Tây",
  "Xã Nhuận Đức",
  "Xã Phú Hòa Đông",
  "Xã Bình Mỹ",
  "Xã Đông Thạnh",
  "Xã Hóc Môn",
  "Xã Xuân Thới Sơn",
  "Xã Bà Điểm",
  "Xã Nhà Bè",
  "Xã Hiệp Phước",
  "Xã Thạnh An",
];

export const normalizeVietnameseSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

export const HCM_WARD_OPTIONS = HCM_WARDS.map((wardName) => ({
  value: wardName,
  label: wardName,
  searchValue: normalizeVietnameseSearch(wardName),
}));

export const filterHcmWardOption = (
  input: string,
  option?: { label?: unknown; searchValue?: string },
) => {
  const normalizedInput = normalizeVietnameseSearch(input);
  const normalizedLabel =
    option?.searchValue ||
    normalizeVietnameseSearch(String(option?.label ?? ""));

  return normalizedLabel.includes(normalizedInput);
};
