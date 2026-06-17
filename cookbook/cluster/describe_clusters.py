#!/usr/bin/env python3
"""
查询 TKE 集群示例脚本

功能: 查询当前账号指定地域下的 TKE 集群列表或指定集群详情
使用方法: python3 describe_clusters.py --region ap-guangzhou
文档链接: https://tke-workshop.github.io/basics/cluster/04-describe-clusters/
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from common.auth import get_tke_client
from common.logger import setup_logger, LogContext
from tencentcloud.tke.v20180525 import models
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException

logger = setup_logger(__name__)


def build_filter(name: str, values: list[str]) -> models.Filter:
    filter_item = models.Filter()
    filter_item.Name = name
    filter_item.Values = values
    return filter_item


def describe_clusters(
    region: str,
    cluster_ids: list[str] | None = None,
    cluster_status: str | None = None,
    cluster_type: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    """
    查询 TKE 集群列表或指定集群详情。
    """
    with LogContext(logger, f"查询集群列表: {region}"):
        client = get_tke_client(region)

        req = models.DescribeClustersRequest()
        req.Limit = limit
        req.Offset = offset

        if cluster_ids:
            req.ClusterIds = cluster_ids

        filters = []
        if cluster_status:
            filters.append(build_filter("ClusterStatus", [cluster_status]))
        if cluster_type:
            filters.append(build_filter("ClusterType", [cluster_type]))
        if filters:
            req.Filters = filters

        try:
            resp = client.DescribeClusters(req)
        except TencentCloudSDKException as e:
            logger.error(f"查询集群失败: {e}")
            logger.error(f"错误码: {e.code}")
            logger.error(f"错误消息: {e.message}")
            raise

        logger.info(f"集群总数: {resp.TotalCount}")
        for cluster in resp.Clusters or []:
            logger.info("-" * 50)
            logger.info(f"集群名称: {cluster.ClusterName}")
            logger.info(f"集群 ID: {cluster.ClusterId}")
            logger.info(f"集群状态: {cluster.ClusterStatus}")
            logger.info(f"Kubernetes 版本: {cluster.ClusterVersion}")
            logger.info(f"节点数: {cluster.ClusterNodeNum}")
            logger.info(f"集群规格: {cluster.ClusterLevel}")
            network = getattr(cluster, "ClusterNetworkSettings", None)
            if network:
                logger.info(f"VPC ID: {getattr(network, 'VpcId', None)}")

        logger.info(f"RequestId: {resp.RequestId}")
        return resp


def main():
    parser = argparse.ArgumentParser(
        description="查询 TKE 集群列表或指定集群详情",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 查询所有集群
  python3 describe_clusters.py --region ap-guangzhou

  # 查询指定集群
  python3 describe_clusters.py --region ap-guangzhou --cluster-id cls-xxxxxxxx

  # 查询运行中的托管集群
  python3 describe_clusters.py \\
    --region ap-guangzhou \\
    --cluster-status Running \\
    --cluster-type MANAGED_CLUSTER
        """,
    )

    parser.add_argument("--region", default="ap-guangzhou", help="地域")
    parser.add_argument(
        "--cluster-id",
        action="append",
        dest="cluster_ids",
        help="集群 ID，可重复传入多个",
    )
    parser.add_argument("--cluster-status", help="按集群状态过滤，如 Running")
    parser.add_argument("--cluster-type", help="按集群类型过滤，如 MANAGED_CLUSTER")
    parser.add_argument("--limit", type=int, default=20, help="返回数量限制，最大 100")
    parser.add_argument("--offset", type=int, default=0, help="分页偏移量")

    args = parser.parse_args()

    if args.limit < 1 or args.limit > 100:
        parser.error("--limit 必须在 1 到 100 之间")

    try:
        describe_clusters(
            region=args.region,
            cluster_ids=args.cluster_ids,
            cluster_status=args.cluster_status,
            cluster_type=args.cluster_type,
            limit=args.limit,
            offset=args.offset,
        )
    except Exception as e:
        logger.error(f"查询集群失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
