#!/usr/bin/env python3
"""
删除 TKE 集群示例脚本

功能: 删除指定 TKE 集群，并显式选择节点与 CBS 删除策略
使用方法: python3 delete_cluster.py --cluster-id cls-xxxxxxxx --region ap-guangzhou --confirm-delete
文档链接: https://tke-workshop.github.io/basics/cluster/02-delete-cluster/
"""

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from common.auth import get_tke_client
from common.logger import setup_logger, LogContext
from tencentcloud.tke.v20180525 import models
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException

logger = setup_logger(__name__)


def build_resource_delete_options(cbs_mode: str) -> list[models.ResourceDeleteOption]:
    option = models.ResourceDeleteOption()
    option.ResourceType = "CBS"
    option.DeleteMode = cbs_mode
    return [option]


def describe_cluster(client, cluster_id: str):
    req = models.DescribeClustersRequest()
    req.ClusterIds = [cluster_id]
    resp = client.DescribeClusters(req)
    if resp.TotalCount == 0 or not resp.Clusters:
        return None
    return resp.Clusters[0]


def delete_cluster(
    cluster_id: str,
    region: str,
    instance_delete_mode: str = "terminate",
    cbs_delete_mode: str = "terminate",
    disable_deletion_protection: bool = False,
    confirm_delete: bool = False,
):
    """
    删除 TKE 集群。默认只打印计划，必须传入 confirm_delete=True 才会提交删除请求。
    """
    with LogContext(logger, f"删除集群: {cluster_id}"):
        client = get_tke_client(region)
        cluster = describe_cluster(client, cluster_id)

        if not cluster:
            raise ValueError(f"未找到集群: {cluster_id}")

        logger.info(f"目标集群: {cluster.ClusterName} ({cluster.ClusterId})")
        logger.info(f"集群状态: {cluster.ClusterStatus}")
        logger.info(f"节点删除策略: {instance_delete_mode}")
        logger.info(f"CBS 删除策略: {cbs_delete_mode}")
        logger.info("CLB 不作为 ResourceDeleteOptions 入参配置；删除后请按文档验证是否有遗留 CLB。")

        deletion_protection = getattr(cluster, "DeletionProtection", None)
        if deletion_protection:
            if not disable_deletion_protection:
                raise RuntimeError(
                    "集群已启用删除保护。请先人工确认风险，或传入 --disable-deletion-protection 显式关闭后再删除。"
                )

            logger.warning("准备关闭集群删除保护")
            protection_req = models.DisableClusterDeletionProtectionRequest()
            protection_req.ClusterId = cluster_id
            client.DisableClusterDeletionProtection(protection_req)
            logger.info("关闭删除保护请求已提交")

        if not confirm_delete:
            logger.warning("当前为 dry-run，未提交 DeleteCluster 请求。")
            logger.warning("确认已备份数据并接受资源删除策略后，重新执行并添加 --confirm-delete。")
            return None

        req = models.DeleteClusterRequest()
        req.ClusterId = cluster_id
        req.InstanceDeleteMode = instance_delete_mode
        req.ResourceDeleteOptions = build_resource_delete_options(cbs_delete_mode)

        try:
            resp = client.DeleteCluster(req)
        except TencentCloudSDKException as e:
            logger.error(f"删除集群失败: {e}")
            logger.error(f"错误码: {e.code}")
            logger.error(f"错误消息: {e.message}")
            raise

        logger.info("删除集群请求已提交")
        logger.info(f"RequestId: {resp.RequestId}")
        return resp


def wait_cluster_deleted(cluster_id: str, region: str, timeout: int = 1800):
    client = get_tke_client(region)
    start_time = time.time()

    logger.info(f"等待集群删除完成: {cluster_id} (超时: {timeout}s)")
    while time.time() - start_time < timeout:
        try:
            cluster = describe_cluster(client, cluster_id)
            if not cluster:
                logger.info("集群已删除")
                return

            logger.info(f"当前集群状态: {cluster.ClusterStatus}")
            time.sleep(10)
        except TencentCloudSDKException as e:
            if "ResourceNotFound" in str(e) or "ClusterNotFound" in str(e):
                logger.info("集群已删除")
                return
            logger.warning(f"查询集群状态失败: {e}")
            time.sleep(10)

    raise TimeoutError(f"等待集群删除超时 ({timeout}s)")


def main():
    parser = argparse.ArgumentParser(
        description="删除 TKE 集群，默认 dry-run，需显式确认后才会提交删除请求",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 预检查删除计划，不提交删除
  python3 delete_cluster.py --cluster-id cls-xxxxxxxx --region ap-guangzhou

  # 删除测试集群并销毁节点和 CBS；删除后检查是否有遗留 CLB
  python3 delete_cluster.py \\
    --cluster-id cls-xxxxxxxx \\
    --region ap-guangzhou \\
    --confirm-delete \\
    --wait

  # 删除集群但保留节点和 CBS；删除后检查是否有遗留 CLB
  python3 delete_cluster.py \\
    --cluster-id cls-xxxxxxxx \\
    --instance-delete-mode retain \\
    --cbs-delete-mode retain \\
    --confirm-delete
        """,
    )

    parser.add_argument("--cluster-id", required=True, help="要删除的集群 ID")
    parser.add_argument("--region", default="ap-guangzhou", help="地域")
    parser.add_argument(
        "--instance-delete-mode",
        default="terminate",
        choices=["terminate", "retain"],
        help="节点删除策略",
    )
    parser.add_argument(
        "--cbs-delete-mode",
        default="terminate",
        choices=["terminate", "retain"],
        help="CBS 删除策略",
    )
    parser.add_argument(
        "--disable-deletion-protection",
        action="store_true",
        help="删除前关闭集群删除保护；仅在已人工确认风险后使用",
    )
    parser.add_argument(
        "--confirm-delete",
        action="store_true",
        help="确认已完成备份和风险检查，并提交 DeleteCluster 请求",
    )
    parser.add_argument("--wait", action="store_true", help="提交删除后等待集群删除完成")
    parser.add_argument("--timeout", type=int, default=1800, help="等待删除完成的超时时间(秒)")

    args = parser.parse_args()

    try:
        resp = delete_cluster(
            cluster_id=args.cluster_id,
            region=args.region,
            instance_delete_mode=args.instance_delete_mode,
            cbs_delete_mode=args.cbs_delete_mode,
            disable_deletion_protection=args.disable_deletion_protection,
            confirm_delete=args.confirm_delete,
        )

        if resp and args.wait:
            wait_cluster_deleted(args.cluster_id, args.region, args.timeout)
    except Exception as e:
        logger.error(f"删除集群失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
