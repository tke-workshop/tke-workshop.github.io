#!/usr/bin/env python3
"""
扩缩 TKE 标准节点池示例脚本

功能: 修改标准节点池的自动伸缩开关、最小节点数、最大节点数和节点标签
使用方法: python3 scale_node_pool.py --cluster-id cls-xxxxxxxx --node-pool-id np-xxxxxxxx --min-nodes-num 3 --max-nodes-num 20
文档链接: https://tke-workshop.github.io/basics/node-pool/02-scale-node-pool/
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from common.logger import setup_logger, LogContext
except ModuleNotFoundError:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(message)s")

    def setup_logger(name: str):
        return logging.getLogger(name)

    class LogContext:
        def __init__(self, logger: logging.Logger, operation: str):
            self.logger = logger
            self.operation = operation

        def __enter__(self):
            self.logger.info(f"开始: {self.operation}")
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            if exc_type is None:
                self.logger.info(f"完成: {self.operation}")
            else:
                self.logger.error(f"失败: {self.operation} - {exc_val}")
            return False

try:
    from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
    from tencentcloud.tke.v20180525 import models
except ModuleNotFoundError:
    TencentCloudSDKException = Exception
    models = None

logger = setup_logger(__name__)


def serialize_request(req: Any) -> dict[str, Any]:
    if hasattr(req, "_serialize"):
        return req._serialize()
    return req


def build_label(value: str) -> Any:
    if "=" not in value:
        raise ValueError(f"标签必须使用 key=value 格式: {value}")

    name, label_value = value.split("=", 1)
    if not name or not label_value:
        raise ValueError(f"标签 key 和 value 不能为空: {value}")

    if models is None:
        return {"Name": name, "Value": label_value}

    label = models.Label()
    label.Name = name
    label.Value = label_value
    return label


def build_tag(value: str) -> Any:
    if "=" not in value:
        raise ValueError(f"资源标签必须使用 key=value 格式: {value}")

    key, tag_value = value.split("=", 1)
    if not key or not tag_value:
        raise ValueError(f"资源标签 key 和 value 不能为空: {value}")

    if models is None:
        return {"Key": key, "Value": tag_value}

    tag = models.Tag()
    tag.Key = key
    tag.Value = tag_value
    return tag


def build_modify_node_pool_request(
    cluster_id: str,
    node_pool_id: str,
    enable_autoscale: bool | None = None,
    min_nodes_num: int | None = None,
    max_nodes_num: int | None = None,
    labels: list[str] | None = None,
    tags: list[str] | None = None,
) -> Any:
    if models is None:
        req = {
            "ClusterId": cluster_id,
            "NodePoolId": node_pool_id,
        }

        if enable_autoscale is not None:
            req["EnableAutoscale"] = enable_autoscale
        if min_nodes_num is not None:
            req["MinNodesNum"] = min_nodes_num
        if max_nodes_num is not None:
            req["MaxNodesNum"] = max_nodes_num
        if labels:
            req["Labels"] = [build_label(label) for label in labels]
        if tags:
            req["Tags"] = [build_tag(tag) for tag in tags]

        return req

    req = models.ModifyClusterNodePoolRequest()
    req.ClusterId = cluster_id
    req.NodePoolId = node_pool_id

    if enable_autoscale is not None:
        req.EnableAutoscale = enable_autoscale
    if min_nodes_num is not None:
        req.MinNodesNum = min_nodes_num
    if max_nodes_num is not None:
        req.MaxNodesNum = max_nodes_num
    if labels:
        req.Labels = [build_label(label) for label in labels]
    if tags:
        req.Tags = [build_tag(tag) for tag in tags]

    return req


def validate_capacity(min_nodes_num: int | None, max_nodes_num: int | None):
    if min_nodes_num is not None and min_nodes_num < 0:
        raise ValueError("--min-nodes-num 不能小于 0")
    if max_nodes_num is not None and max_nodes_num < 0:
        raise ValueError("--max-nodes-num 不能小于 0")
    if min_nodes_num is not None and max_nodes_num is not None and min_nodes_num > max_nodes_num:
        raise ValueError("--min-nodes-num 不能大于 --max-nodes-num")


def describe_node_pool_detail(client, cluster_id: str, node_pool_id: str):
    req = models.DescribeClusterNodePoolDetailRequest()
    req.ClusterId = cluster_id
    req.NodePoolId = node_pool_id
    return client.DescribeClusterNodePoolDetail(req)


def modify_node_pool(
    cluster_id: str,
    node_pool_id: str,
    region: str,
    enable_autoscale: bool | None = None,
    min_nodes_num: int | None = None,
    max_nodes_num: int | None = None,
    labels: list[str] | None = None,
    tags: list[str] | None = None,
    confirm_change: bool = False,
):
    validate_capacity(min_nodes_num, max_nodes_num)

    req = build_modify_node_pool_request(
        cluster_id=cluster_id,
        node_pool_id=node_pool_id,
        enable_autoscale=enable_autoscale,
        min_nodes_num=min_nodes_num,
        max_nodes_num=max_nodes_num,
        labels=labels,
        tags=tags,
    )

    if not confirm_change:
        logger.warning("当前为 dry-run，未提交 ModifyClusterNodePool 请求。")
        logger.warning("确认节点池状态、容量范围、业务驱逐风险和配额后，重新执行并添加 --confirm-change。")
        print(json.dumps(serialize_request(req), ensure_ascii=False, indent=2))
        return None

    with LogContext(logger, f"修改节点池: {node_pool_id}"):
        if models is None:
            raise RuntimeError("缺少 Tencent Cloud Python SDK，请先执行: pip install -r cookbook/requirements.txt")

        from common.auth import get_tke_client

        client = get_tke_client(region)

        try:
            detail = describe_node_pool_detail(client, cluster_id, node_pool_id)
            logger.info(f"当前节点池: {getattr(detail, 'Name', None) or node_pool_id}")
            logger.info(f"当前最小节点数: {getattr(detail, 'MinNodesNum', None)}")
            logger.info(f"当前最大节点数: {getattr(detail, 'MaxNodesNum', None)}")
            logger.info(f"当前期望节点数: {getattr(detail, 'DesiredNodesNum', None)}")

            resp = client.ModifyClusterNodePool(req)
        except TencentCloudSDKException as e:
            logger.error(f"修改节点池失败: {e}")
            logger.error(f"错误码: {e.code}")
            logger.error(f"错误消息: {e.message}")
            raise

        logger.info("节点池修改请求已提交")
        logger.info(f"RequestId: {resp.RequestId}")
        return resp


def parse_enable_autoscale(value: str) -> bool:
    normalized = value.lower()
    if normalized == "true":
        return True
    if normalized == "false":
        return False
    raise argparse.ArgumentTypeError("--enable-autoscale 必须为 true 或 false")


def main():
    parser = argparse.ArgumentParser(
        description="修改 TKE 标准节点池伸缩范围，默认 dry-run，需显式确认后才会提交变更",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 只输出 ModifyClusterNodePool 请求体，不提交变更
  python3 node-pool/scale_node_pool.py \\
    --cluster-id cls-xxxxxxxx \\
    --node-pool-id np-xxxxxxxx \\
    --enable-autoscale true \\
    --min-nodes-num 3 \\
    --max-nodes-num 20

  # 确认后提交节点池伸缩范围变更
  python3 node-pool/scale_node_pool.py \\
    --cluster-id cls-xxxxxxxx \\
    --node-pool-id np-xxxxxxxx \\
    --enable-autoscale true \\
    --min-nodes-num 3 \\
    --max-nodes-num 20 \\
    --confirm-change
        """,
    )

    parser.add_argument("--cluster-id", required=True, help="目标集群 ID")
    parser.add_argument("--node-pool-id", required=True, help="目标节点池 ID")
    parser.add_argument("--region", default="ap-guangzhou", help="地域")
    parser.add_argument("--enable-autoscale", type=parse_enable_autoscale, help="是否开启自动伸缩: true 或 false")
    parser.add_argument("--min-nodes-num", type=int, help="最小节点数")
    parser.add_argument("--max-nodes-num", type=int, help="最大节点数")
    parser.add_argument(
        "--label",
        action="append",
        dest="labels",
        help="节点标签，格式 key=value；可重复传入多个",
    )
    parser.add_argument(
        "--tag",
        action="append",
        dest="tags",
        help="腾讯云资源标签，格式 key=value；可重复传入多个",
    )
    parser.add_argument(
        "--confirm-change",
        action="store_true",
        help="确认已完成配额、调度、PDB 和业务影响检查，并提交 ModifyClusterNodePool 请求",
    )

    args = parser.parse_args()

    try:
        modify_node_pool(
            cluster_id=args.cluster_id,
            node_pool_id=args.node_pool_id,
            region=args.region,
            enable_autoscale=args.enable_autoscale,
            min_nodes_num=args.min_nodes_num,
            max_nodes_num=args.max_nodes_num,
            labels=args.labels,
            tags=args.tags,
            confirm_change=args.confirm_change,
        )
    except Exception as e:
        logger.error(f"节点池修改失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
