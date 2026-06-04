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

const WORKLOAD_METRICS = {
  cpuUsage: 'builtin:kubernetes.workload.cpu_usage:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  cpuRequests: 'builtin:kubernetes.workload.requests_cpu:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  cpuLimits: 'builtin:kubernetes.workload.limits_cpu:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  cpuThrottled: 'builtin:kubernetes.workload.cpu_throttled:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  memoryUsage: 'builtin:kubernetes.workload.memory_working_set:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  memoryRequests: 'builtin:kubernetes.workload.requests_memory:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  memoryLimits: 'builtin:kubernetes.workload.limits_memory:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  pods: 'builtin:kubernetes.pods:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  desiredPods: 'builtin:kubernetes.workload.pods_desired:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  desiredContainers: 'builtin:kubernetes.workload.containers_desired:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  conditions: 'builtin:kubernetes.workload.conditions:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  restarts: 'builtin:kubernetes.container.restarts:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
  oomKills: 'builtin:kubernetes.container.oom_kills:splitBy("dt.entity.kubernetes_cluster","dt.entity.cloud_application"):limit(500)',
} as const;

type WorkloadMetricKey = keyof typeof WORKLOAD_METRICS;

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

function ratioPercent(usage: number | null, quota: number | null): number | null {
  return percent(usage, quota);
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

function numberProperty(entity: Entity, key: string): number | null {
  const value = entity.properties?.[key];
  return typeof value === "number" ? value : null;
}

function stringProperty(entity: Entity, key: string): string | null {
  const value = entity.properties?.[key];
  return typeof value === "string" ? value : null;
}

function conditionStatus(entity: Entity): string | null {
  const condition = entity.properties?.currentCondition;
  if (!condition || typeof condition !== "object") return null;
  const status = (condition as { status?: unknown }).status;
  const type = (condition as { type?: unknown }).type;
  if (typeof type === "string" && typeof status === "string") return `${type}: ${status}`;
  if (typeof status === "string") return status;
  return null;
}

function latestFromSeries(series: MetricsResponse["result"][number]["data"][number]): number | null {
  for (let i = series.values.length - 1; i >= 0; i -= 1) {
    const value = series.values[i];
    if (typeof value === "number") return value;
  }
  return null;
}

function workloadValues(metric?: MetricsResponse, clusterId?: string | null) {
  const values = new Map<string, number | null>();
  const series = metric?.result?.[0]?.data ?? [];

  series.forEach((item) => {
    const itemClusterId =
      item.dimensionMap?.["dt.entity.kubernetes_cluster"] ??
      item.dimensions?.find((dimension) => dimension.startsWith("KUBERNETES_CLUSTER-"));
    const workloadId =
      item.dimensionMap?.["dt.entity.cloud_application"] ??
      item.dimensions?.find((dimension) => dimension.startsWith("CLOUD_APPLICATION-"));

    if (!workloadId) return;
    if (clusterId && itemClusterId && itemClusterId !== clusterId) return;
    values.set(workloadId, latestFromSeries(item));
  });

  return values;
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
    const [clustersResponse, nodesResponse, workloadEntitiesResponse, podEntitiesResponse, topologyResponse] = await Promise.all([
      getEntities("KUBERNETES_CLUSTER"),
      getEntities("KUBERNETES_NODE"),
      getEntities("CLOUD_APPLICATION"),
      getEntities("CLOUD_APPLICATION_INSTANCE", {
        fields: "properties,fromRelationships,toRelationships",
        from: FROM,
      }),
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

    const workloadEntries = await Promise.all(
      Object.entries(WORKLOAD_METRICS).map(async ([key, selector]) => [
        key,
        await queryMetrics(selector, { from: FROM }),
      ])
    );
    const workloadMetrics = Object.fromEntries(workloadEntries) as Record<WorkloadMetricKey, MetricsResponse>;
    const workloadEntities = cleanEntities(workloadEntitiesResponse.entities ?? []);
    const workloadNameById = new Map(workloadEntities.map((workload) => [workload.id, workload.name]));
    const workloadValueMaps = Object.fromEntries(
      Object.keys(WORKLOAD_METRICS).map((key) => [
        key,
        workloadValues(workloadMetrics[key as WorkloadMetricKey], selectedCluster?.id),
      ])
    ) as Record<WorkloadMetricKey, Map<string, number | null>>;
    const workloadIds = new Set<string>();
    Object.values(workloadValueMaps).forEach((valueMap) => {
      valueMap.forEach((_value, id) => workloadIds.add(id));
    });
    const workloads = Array.from(workloadIds)
      .map((id) => {
        const cpuUsage = workloadValueMaps.cpuUsage.get(id) ?? null;
        const cpuRequests = workloadValueMaps.cpuRequests.get(id) ?? null;
        const cpuLimits = workloadValueMaps.cpuLimits.get(id) ?? null;
        const memoryUsage = workloadValueMaps.memoryUsage.get(id) ?? null;
        const memoryRequests = workloadValueMaps.memoryRequests.get(id) ?? null;
        const memoryLimits = workloadValueMaps.memoryLimits.get(id) ?? null;

        return {
          id,
          name: workloadNameById.get(id) ?? id,
          cpuUsage,
          cpuRequests,
          cpuLimits,
          cpuRequestsPct: ratioPercent(cpuUsage, cpuRequests),
          cpuLimitsPct: ratioPercent(cpuUsage, cpuLimits),
          cpuThrottled: workloadValueMaps.cpuThrottled.get(id) ?? null,
          memoryUsage,
          memoryRequests,
          memoryLimits,
          memoryRequestsPct: ratioPercent(memoryUsage, memoryRequests),
          memoryLimitsPct: ratioPercent(memoryUsage, memoryLimits),
          pods: workloadValueMaps.pods.get(id) ?? null,
          desiredPods: workloadValueMaps.desiredPods.get(id) ?? null,
          desiredContainers: workloadValueMaps.desiredContainers.get(id) ?? null,
          conditions: workloadValueMaps.conditions.get(id) ?? null,
          restarts: workloadValueMaps.restarts.get(id) ?? null,
          oomKills: workloadValueMaps.oomKills.get(id) ?? null,
        };
      })
      .sort((a, b) => (b.memoryUsage ?? 0) - (a.memoryUsage ?? 0));
    const podRows = (podEntitiesResponse.entities ?? [])
      .filter((pod) => {
        if (!selectedCluster?.id) return true;
        return pod.toRelationships?.isClusterOfCai?.some((cluster) => cluster.id === selectedCluster.id);
      })
      .map((pod) => {
        const workloadId = pod.fromRelationships?.isInstanceOf?.[0]?.id ?? null;
        const nodeId = pod.fromRelationships?.runsOn?.[0]?.id ?? null;

        return {
          id: pod.entityId,
          name: pod.displayName,
          workloadId,
          workloadName: stringProperty(pod, "workloadName") ?? (workloadId ? workloadNameById.get(workloadId) : null),
          namespace: stringProperty(pod, "namespaceName"),
          nodeId,
          nodeName: stringProperty(pod, "nodeName"),
          phase: stringProperty(pod, "cloudApplicationInstancePhase"),
          condition: conditionStatus(pod),
          restarts: numberProperty(pod, "containerRestartCount"),
          requestsCpu: numberProperty(pod, "requestsCPU"),
          limitsCpu: numberProperty(pod, "limitsCPU"),
          requestsMemory: numberProperty(pod, "requestsMemory"),
          limitsMemory: numberProperty(pod, "limitsMemory"),
          runningContainers: numberProperty(pod, "runningContainersCount"),
          desiredContainers: numberProperty(pod, "desiredContainersCount"),
          createdAt: numberProperty(pod, "resourceCreationTimestamp"),
          internalIp: Array.isArray(pod.properties?.internalIpAddresses)
            ? String(pod.properties?.internalIpAddresses[0] ?? "")
            : null,
        };
      })
      .sort((a, b) => (a.namespace ?? "").localeCompare(b.namespace ?? "") || a.name.localeCompare(b.name));

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
    const nodePods = latestByKey(metrics, "pods");
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
        podsUtilizationPct: percent(nodePods, podsAllocatable),
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
          pods: nodePods,
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
      workloads,
      workloadSummary: {
        total: workloads.length,
        pods: workloads.reduce((sum, workload) => sum + (workload.pods ?? 0), 0),
        desiredPods: workloads.reduce((sum, workload) => sum + (workload.desiredPods ?? 0), 0),
        restarts: workloads.reduce((sum, workload) => sum + (workload.restarts ?? 0), 0),
        oomKills: workloads.reduce((sum, workload) => sum + (workload.oomKills ?? 0), 0),
      },
      pods: podRows,
      podSummary: {
        total: podRows.length,
        running: podRows.filter((pod) => pod.phase === "RUNNING").length,
        ready: podRows.filter((pod) => pod.condition === "Ready: True").length,
        restarts: podRows.reduce((sum, pod) => sum + (pod.restarts ?? 0), 0),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch Kubernetes metrics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
