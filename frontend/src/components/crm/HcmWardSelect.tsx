import { Select } from "antd";
import type { SelectProps } from "antd";
import {
  filterHcmWardOption,
  HCM_WARD_OPTIONS,
} from "@/lib/constants/hcm-wards";

type HcmWardSelectProps = Omit<SelectProps<string>, "options" | "showSearch">;

export const HcmWardSelect = (props: HcmWardSelectProps) => (
  <Select
    {...props}
    showSearch
    allowClear={props.allowClear ?? true}
    placeholder={props.placeholder ?? "Chọn phường/xã"}
    optionFilterProp="label"
    filterOption={filterHcmWardOption}
    options={HCM_WARD_OPTIONS}
  />
);
