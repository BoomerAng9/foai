export type DataSource = {
  id: string;
  name: string;
  status: "draft" | "ready";
};

export function completeDataSourceBuilder(source: Omit<DataSource, "status">): DataSource {
  return { ...source, status: "ready" };
}
