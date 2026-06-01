import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEntities, queryMetrics, type Entity, type MetricsResponse } from "@/lib/dynatrace";

const FROM = "now-2h";
const NODE_CLUSTER_SELECTOR =
  'builtin:kubernetes.node.cpu_usage:splitBy("dt.entity.kubernetes_cluster","dt.entity.kubernetes_node"):limit(500)';

const NODE_METRICS = {
  cpuUsage: "builtin:kubernetes.node.cpu_usage:splitBy()",
  cpuAllocatable: "builtin:kubernetes.node.cpu_allocatable:splitBy()",
  cpuRequests: "builtin:kubernetes.node.requests_cpu:splitBy()",
  cpuLimits: "builtin:kubernetes.node.limits_cpu:splitBy()",
  cpuThrottled: "builtin:kubernetes.node.cpu_throttled:splitBy()",
  memoryUsage: "builtin:kubernetes.node.memory_working_set:splitBy()",
  memoryAllocatable: "builtin:kubernetes.node.memory_allocatable:splitBy()",
  memoryRequests: "builtin:kubernetes.node.requests_memory:splitBy()",
  memoryLimits: "builtin:kubernetes.node.limits_memory:splitBy()",
  pods: "builtin:kubernetes.node.pods:splitBy()",
  podsAllocatable: "builtin:kubernetes.node.pods_allocatable:splitBy()",
} as const;

type MetricKey = keyof typeof NODE_METRICS;
type Point = { timestamp: number; time: string; value: number };

function latestValue(metric?: MetricsResponse): number | null {
  const series = metric?.result?.[0]?.data?.[0];
  if (!series) return null;

  for (let i = series.values.length - 1; i >= 0; i -= 1) {
    const value = series.values[i];
    if (typeof value === "number") return value;
  }
  return null;
}

function percent(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

function percentSeries(
  numerator?: MetricsResponse,
  denominator?: MetricsResponse
): Point[] {
  const top = numerator?.result?.[0]?.data?.[0];
  const bottom = denominator?.result?.[0]?.data?.[0];
  if (!top || !bottom) return [];

  return top.timestamps
    .map((timestamp, index) => {
      const num = top.values[index];
      const den = bottom.values[index];
      if (typeof num !== "number" || typeof den !== "number" || den === 0) return null;
      return {
        timestamp,
        time: new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: Math.round((num / den) * 10000) / 100,
      };
    })
    .filter((point): point is Point => point !== null);
}

function latestByKey(metrics: Record<MetricKey, MetricsResponse>, key: MetricKey) {
  return latestValue(metrics[key]);
}

function cleanEntities(entities: Entity[]) {
  return entities.map((entity) => ({
    id: entity.entityId,
    name: entity.displayName,
    type: entity.type,
  }));
}

function nodeClusterMap(metric?: MetricsResponse) {
  const map = new Map<string, string>();
  const series = metric?.result?.[0]?.data ?? [];

  series.forEach((item) => {
    const clusterId =
      item.dimensionMap?.["dt.entity.kubernetes_cluster"] ??
      item.dimensions?.find((dimension) => dimension.startsWith("KUBERNETES_CLUSTER-"));
    const nodeId =
      item.dimensionMap?.["dt.entity.kubernetes_node"] ??
      item.dimensions?.find((dimension) => dimension.startsWith("KUBERNETES_NODE-"));

    if (clusterId && nodeId) map.set(nodeId, clusterId);
  });

  return map;
}

export async function GET(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nodeId = req.nextUrl.searchParams.get("nodeId");
  const clusterId = req.nextUrl.searchParams.get("clusterId");

  try {
    const [clustersResponse, nodesResponse, topologyResponse] = await Promise.all([
      getEntities("KUBERNETES_CLUSTER"),
      getEntities("KUBERNETES_NODE"),
      queryMetrics(NODE_CLUSTER_SELECTOR, { from: FROM }),
    ]);

    const clusters = cleanEntities(clustersResponse.entities ?? []);
    const clusterByNode = nodeClusterMap(topologyResponse);
    const nodes = cleanEntities(nodesResponse.entities ?? []).map((node) => ({
      ...node,
      clusterId: clusterByNode.get(node.id) ?? null,
    }));
    const selectedCluster =
      clusters.find((cluster) => cluster.id === clusterId) ??
      clusters.find((cluster) => cluster.name === "pinvest-production-eks-cluster") ??
      clusters[0] ??
      null;
    const nodesForCluster =
      selectedCluster && nodes.some((node) => node.clusterId === selectedCluster.id)
        ? nodes.filter((node) => node.clusterId === selectedCluster.id)
        : nodes;
    const selectedNode =
      nodesForCluster.find((node) => node.id === nodeId) ??
      nodesForCluster.find((node) => node.name === "ip-10-110-131-246.ec2.internal") ??
      nodesForCluster[0];

    if (!selectedNode) {
      return NextResponse.json(
        { error: "No Kubernetes nodes were found for the selected cluster." },
        { status: 404 }
      );
    }

    const entitySelector = `entityId("${selectedNode.id}")`;
    const entries = await Promise.all(
      Object.entries(NODE_METRICS).map(async ([key, selector]) => [
        key,
        await queryMetrics(selector, { from: FROM, entitySelector }),
      ])
    );
    const metrics = Object.fromEntries(entries) as Record<MetricKey, MetricsResponse>;

    const cpuUsage = latestByKey(metrics, "cpuUsage");
    const cpuAllocatable = latestByKey(metrics, "cpuAllocatable");
    const cpuRequests = latestByKey(metrics, "cpuRequests");
    const cpuLimits = latestByKey(metrics, "cpuLimits");
    const cpuThrottled = latestByKey(metrics, "cpuThrottled");
    const memoryUsage = latestByKey(metrics, "memoryUsage");
    const memoryAllocatable = latestByKey(metrics, "memoryAllocatable");
    const memoryRequests = latestByKey(metrics, "memoryRequests");
    const memoryLimits = latestByKey(metrics, "memoryLimits");
    const pods = latestByKey(metrics, "pods");
    const podsAllocatable = latestByKey(metrics, "podsAllocatable");

    return NextResponse.json({
      from: FROM,
      cluster: selectedCluster,
      clusters,
      nodes: nodesForCluster,
      selectedNode,
      summary: {
        cpuUsagePct: percent(cpuUsage, cpuAllocatable),
        cpuRequestsPct: percent(cpuRequests, cpuAllocatable),
        cpuLimitsPct: percent(cpuLimits, cpuAllocatable),
        memoryUsagePct: percent(memoryUsage, memoryAllocatable),
        memoryRequestsPct: percent(memoryRequests, memoryAllocatable),
        memoryLimitsPct: percent(memoryLimits, memoryAllocatable),
        podsUtilizationPct: percent(pods, podsAllocatable),
        raw: {
          cpuUsage,
          cpuAllocatable,
          cpuRequests,
          cpuLimits,
          cpuThrottled,
          memoryUsage,
          memoryAllocatable,
          memoryRequests,
          memoryLimits,
          pods,
          podsAllocatable,
        },
      },
      series: {
        cpuUsagePct: percentSeries(metrics.cpuUsage, metrics.cpuAllocatable),
        cpuRequestsPct: percentSeries(metrics.cpuRequests, metrics.cpuAllocatable),
        cpuLimitsPct: percentSeries(metrics.cpuLimits, metrics.cpuAllocatable),
        memoryUsagePct: percentSeries(metrics.memoryUsage, metrics.memoryAllocatable),
        memoryRequestsPct: percentSeries(metrics.memoryRequests, metrics.memoryAllocatable),
        memoryLimitsPct: percentSeries(metrics.memoryLimits, metrics.memoryAllocatable),
        podsUtilizationPct: percentSeries(metrics.pods, metrics.podsAllocatable),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch Kubernetes metrics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
