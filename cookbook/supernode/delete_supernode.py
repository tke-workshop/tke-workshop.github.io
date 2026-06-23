#!/usr/bin/env python3
"""
删除 TKE 超级节点示例脚本

功能: 删除指定 TKE 超级节点，默认 dry-run，需显式确认后才会提交删除请求
使用方法: python3 delete_supernode.py --cluster-id cls-xxxxxxxx --node-name eklet-subnet-xxxxxxxx-0
文档链接: https://tke-workshop.github.io/basics/supernode/03-delete-supernode/
"""

from __future__ import annotations

import argparse
import json
import logging
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class LogContext:
    def __init__(self, logger: logging.Logger, operation: str):
        self.logger = logger
        self.operation = operation

    def __enter__(self):
        self.logger.info("开始: %s", self.operation)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.logger.info("完成: %s", self.operation)
        else:
            self.logger.error("失败: %s - %s", self.operation, exc_val)
        return False


def run_kubectl(args: list[str], kubeconfig: str | None = None) -> subprocess.CompletedProcess:
    cmd = ["kubectl"]
    if kubeconfig:
        cmd.extend(["--kubeconfig", kubeconfig])
    cmd.extend(args)

    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def get_node_pods(node_name: str, kubeconfig: str | None = None) -> list[str]:
    result = run_kubectl(
        [
            "get",
            "pods",
            "--all-namespaces",
            "--field-selector",
            f"spec.nodeName={node_name}",
            "-o",
            "jsonpath={range .items[*]}{.metadata.namespace}/{.metadata.name}{\"\\n\"}{end}",
        ],
        kubeconfig=kubeconfig,
    )

    if result.returncode != 0:
        raise RuntimeError(f"kubectl 查询节点 Pod 失败: {result.stderr.strip() or result.stdout.strip()}")

    return [line for line in result.stdout.splitlines() if line.strip()]


def build_delete_request(
    cluster_id: str,
    node_names: list[str],
    force: bool,
) -> dict[str, Any]:
    return {
        "ClusterId": cluster_id,
        "NodeNames": node_names,
        "Force": force,
    }


def build_sdk_delete_request(cluster_id: str, node_names: list[str], force: bool):
    from tencentcloud.tke.v20180525 import models

    req = models.DeleteClusterVirtualNodeRequest()
    req.ClusterId = cluster_id
    req.NodeNames = node_names
    req.Force = force
    return req


def delete_supernodes(
    cluster_id: str,
    region: str,
    node_names: list[str],
    force: bool = False,
    confirm_delete: bool = False,
    skip_pod_check: bool = False,
    kubeconfig: str | None = None,
):
    """
    删除 TKE 超级节点。默认只打印计划，必须传入 confirm_delete=True 才会提交删除请求。
    """
    with LogContext(logger, f"删除超级节点: {', '.join(node_names)}"):
        logger.info(f"目标集群: {cluster_id}")
        logger.info(f"地域: {region}")
        logger.info(f"强制删除: {force}")

        if not skip_pod_check:
            for node_name in node_names:
                pods = get_node_pods(node_name, kubeconfig=kubeconfig)
                if pods:
                    logger.warning(f"节点 {node_name} 上仍有 Pod:")
                    for pod in pods:
                        logger.warning(f"  - {pod}")
                    if not force:
                        raise RuntimeError(
                            "检测到运行中的 Pod。请先执行 kubectl drain，或在已确认业务风险后传入 --force。"
                        )
                else:
                    logger.info(f"节点 {node_name} 上未发现 Pod")
        else:
            logger.warning("已跳过 kubectl Pod 检查，请确保删除前已确认业务影响")

        request_payload = build_delete_request(cluster_id, node_names, force)
        logger.info("DeleteClusterVirtualNode 请求参数:")
        logger.info(json.dumps(request_payload, ensure_ascii=False, indent=2))

        if not confirm_delete:
            logger.warning("当前为 dry-run，未提交 DeleteClusterVirtualNode 请求。")
            logger.warning("确认节点无业务负载或已接受强制删除风险后，重新执行并添加 --confirm-delete。")
            return None

        from common.auth import get_tke_client
        from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException

        client = get_tke_client(region)
        req = build_sdk_delete_request(cluster_id, node_names, force)

        try:
            resp = client.DeleteClusterVirtualNode(req)
        except TencentCloudSDKException as e:
            logger.error(f"删除超级节点失败: {e}")
            logger.error(f"错误码: {e.code}")
            logger.error(f"错误消息: {e.message}")
            raise

        logger.info("删除超级节点请求已提交")
        logger.info(f"RequestId: {resp.RequestId}")
        return resp


def wait_nodes_deleted(
    node_names: list[str],
    kubeconfig: str | None = None,
    timeout: int = 600,
):
    start_time = time.time()
    remaining = set(node_names)

    logger.info(f"等待超级节点从 Kubernetes 节点列表中移除: {', '.join(node_names)}")
    while time.time() - start_time < timeout:
        for node_name in list(remaining):
            result = run_kubectl(["get", "node", node_name, "-o", "name"], kubeconfig=kubeconfig)
            if result.returncode != 0:
                remaining.discard(node_name)
                logger.info(f"节点已移除: {node_name}")

        if not remaining:
            return

        logger.info(f"仍在等待节点移除: {', '.join(sorted(remaining))}")
        time.sleep(10)

    raise TimeoutError(f"等待超级节点删除超时: {', '.join(sorted(remaining))}")


def main():
    parser = argparse.ArgumentParser(
        description="删除 TKE 超级节点，默认 dry-run，需显式确认后才会提交删除请求",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 预检查删除计划，不提交删除
  python3 delete_supernode.py \\
    --cluster-id cls-xxxxxxxx \\
    --node-name eklet-subnet-xxxxxxxx-0

  # 节点已无 Pod 后提交安全删除
  python3 delete_supernode.py \\
    --cluster-id cls-xxxxxxxx \\
    --node-name eklet-subnet-xxxxxxxx-0 \\
    --confirm-delete \\
    --wait

  # 已确认业务风险后强制删除
  python3 delete_supernode.py \\
    --cluster-id cls-xxxxxxxx \\
    --node-name eklet-subnet-xxxxxxxx-0 \\
    --force \\
    --confirm-delete
        """,
    )

    parser.add_argument("--cluster-id", required=True, help="要操作的 TKE 集群 ID")
    parser.add_argument("--region", default="ap-guangzhou", help="地域")
    parser.add_argument(
        "--node-name",
        action="append",
        dest="node_names",
        required=True,
        help="超级节点名称，可重复传入多个",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="强制删除；若节点上有运行中的 Pod，API 仍会提交删除请求",
    )
    parser.add_argument(
        "--confirm-delete",
        action="store_true",
        help="确认已完成业务风险检查，并提交 DeleteClusterVirtualNode 请求",
    )
    parser.add_argument(
        "--skip-pod-check",
        action="store_true",
        help="跳过本地 kubectl Pod 检查；仅在无法访问 kube-apiserver 且已人工确认时使用",
    )
    parser.add_argument("--kubeconfig", help="kubeconfig 文件路径，留空使用默认配置")
    parser.add_argument("--wait", action="store_true", help="提交删除后等待节点从 Kubernetes 中移除")
    parser.add_argument("--timeout", type=int, default=600, help="等待删除完成的超时时间(秒)")

    args = parser.parse_args()

    try:
        resp = delete_supernodes(
            cluster_id=args.cluster_id,
            region=args.region,
            node_names=args.node_names,
            force=args.force,
            confirm_delete=args.confirm_delete,
            skip_pod_check=args.skip_pod_check,
            kubeconfig=args.kubeconfig,
        )

        if resp and args.wait:
            wait_nodes_deleted(args.node_names, kubeconfig=args.kubeconfig, timeout=args.timeout)
    except Exception as e:
        logger.error(f"删除超级节点失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
