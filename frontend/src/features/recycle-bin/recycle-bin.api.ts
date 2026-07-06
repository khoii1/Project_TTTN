import { httpClient } from "@/lib/api/http-client";

export type PermanentDeleteEntity =
  | "lead"
  | "account"
  | "contact"
  | "opportunity"
  | "task"
  | "case";

export const recycleBinApi = {
  permanentDelete: async (entity: PermanentDeleteEntity, id: string) => {
    const { data } = await httpClient.delete<{ message: string }>(
      `/recycle-bin/${entity}/${id}/permanent`,
    );
    return data;
  },
};
