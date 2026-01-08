#!/usr/bin/env python3
"""
创建 TKE 集群示例脚本

功能: 创建一个托管型 TKE 集群
使用方法: python3 create_cluster.py --cluster-name my-cluster --region ap-guangzhou
文档链接: https://tke-workshop.github.io/basics/cluster/01-create-cluster/
"""

import argparse
import sys
import time
from pathlib import Path

# 添加父目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.auth import get_tke_client, load_config
from common.logger import setup_logger, LogContext
from tencentcloud.tke.v20180525 import models
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException

logger = setup_logger(__name__)


def create_cluster(
    cluster_name: str,
    region: str,
    k8s_version: str = "1.28.3",
    vpc_id: str = None,
    cluster_cidr: str = "172.16.0.0/16",
    service_cidr: str = "10.96.0.0/16",
    cluster_level: str = "L5"
) -> str:
    """
    创建 TKE 集群
    
    Args:
        cluster_name: 集群名称
        region: 地域
        k8s_version: Kubernetes 版本
        vpc_id: VPC ID (留空从配置文件读取)
        cluster_cidr: 集群 CIDR
        service_cidr: Service CIDR
        cluster_level: 集群规模 (L5/L20/L50/L100)
    
    Returns:
        集群 ID
    """
    with LogContext(logger, f"创建集群: {cluster_name}"):
        # 加载配置
        config = load_config()
        if not vpc_id:
            vpc_id = config.get('cluster', {}).get('vpc_id')
            if not vpc_id or vpc_id == 'vpc-xxxxxxxx':
                raise ValueError("请在 config.yaml 中配置 vpc_id 或通过 --vpc-id 参数指定")
        
        # 创建客户端
        client = get_tke_client(region)
        
        # 构造请求
        req = models.CreateClusterRequest()
        req.ClusterType = "MANAGED_CLUSTER"
        
        # 集群基础配置
        req.ClusterBasicSettings = models.ClusterBasicSettings()
        req.ClusterBasicSettings.ClusterName = cluster_name
        req.ClusterBasicSettings.ClusterVersion = k8s_version
        req.ClusterBasicSettings.VpcId = vpc_id
        req.ClusterBasicSettings.ClusterLevel = cluster_level
        req.ClusterBasicSettings.AutoUpgradeClusterLevel = True
        
        # 网络配置
        req.ClusterCIDRSettings = models.ClusterCIDRSettings()
        req.ClusterCIDRSettings.ClusterCIDR = cluster_cidr
        req.ClusterCIDRSettings.MaxNodePodNum = 64
        req.ClusterCIDRSettings.ServiceCIDR = service_cidr
        req.ClusterCIDRSettings.VpcId = vpc_id
        req.ClusterCIDRSettings.CniType = "vpc-cni"
        
        try:
            # 发起请求
            logger.info(f"正在创建集群: {cluster_name}")
            logger.info(f"  - 地域: {region}")
            logger.info(f"  - Kubernetes 版本: {k8s_version}")
            logger.info(f"  - VPC ID: {vpc_id}")
            logger.info(f"  - 集群 CIDR: {cluster_cidr}")
            logger.info(f"  - Service CIDR: {service_cidr}")
            logger.info(f"  - 集群规模: {cluster_level}")
            
            resp = client.CreateCluster(req)
            cluster_id = resp.ClusterId
            
            logger.info(f"✅ 集群创建请求已提交")
            logger.info(f"   集群 ID: {cluster_id}")
            logger.info(f"   RequestId: {resp.RequestId}")
            
            return cluster_id
            
        except TencentCloudSDKException as e:
            logger.error(f"❌ 创建集群失败: {e}")
            logger.error(f"   错误码: {e.code}")
            logger.error(f"   错误消息: {e.message}")
            raise


def wait_cluster_ready(cluster_id: str, region: str, timeout: int = 1800):
    """
    等待集群就绪
    
    Args:
        cluster_id: 集群 ID
        region: 地域
        timeout: 超时时间 (秒)
    """
    client = get_tke_client(region)
    start_time = time.time()
    
    logger.info(f"等待集群就绪: {cluster_id} (超时: {timeout}s)")
    
    while time.time() - start_time < timeout:
        try:
            req = models.DescribeClustersRequest()
            req.ClusterIds = [cluster_id]
            
            resp = client.DescribeClusters(req)
            if resp.TotalCount > 0:
                cluster = resp.Clusters[0]
                status = cluster.ClusterStatus
                
                logger.info(f"  集群状态: {status}")
                
                if status == "Running":
                    logger.info(f"✅ 集群已就绪")
                    return
                elif status == "Abnormal":
                    logger.error(f"❌ 集群状态异常")
                    raise RuntimeError("集群创建失败,状态为 Abnormal")
            
            time.sleep(10)
            
        except TencentCloudSDKException as e:
            logger.warning(f"查询集群状态失败: {e}")
            time.sleep(10)
    
    raise TimeoutError(f"等待集群就绪超时 ({timeout}s)")


def main():
    parser = argparse.ArgumentParser(
        description="创建 TKE 集群",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 创建基础集群
  python3 create_cluster.py --cluster-name my-cluster --region ap-guangzhou
  
  # 创建生产集群
  python3 create_cluster.py \\
    --cluster-name prod-cluster \\
    --region ap-guangzhou \\
    --k8s-version 1.28.3 \\
    --cluster-level L50 \\
    --vpc-id vpc-xxxxxxxx
        """
    )
    
    parser.add_argument('--cluster-name', required=True, help='集群名称')
    parser.add_argument('--region', default='ap-guangzhou', help='地域')
    parser.add_argument('--k8s-version', default='1.28.3', help='Kubernetes 版本')
    parser.add_argument('--vpc-id', help='VPC ID (留空从配置文件读取)')
    parser.add_argument('--cluster-cidr', default='172.16.0.0/16', help='集群 CIDR')
    parser.add_argument('--service-cidr', default='10.96.0.0/16', help='Service CIDR')
    parser.add_argument('--cluster-level', default='L5', 
                       choices=['L5', 'L20', 'L50', 'L100', 'L200'],
                       help='集群规模')
    parser.add_argument('--wait', action='store_true', help='等待集群就绪')
    parser.add_argument('--timeout', type=int, default=1800, help='等待超时时间(秒)')
    
    args = parser.parse_args()
    
    try:
        # 创建集群
        cluster_id = create_cluster(
            cluster_name=args.cluster_name,
            region=args.region,
            k8s_version=args.k8s_version,
            vpc_id=args.vpc_id,
            cluster_cidr=args.cluster_cidr,
            service_cidr=args.service_cidr,
            cluster_level=args.cluster_level
        )
        
        # 等待集群就绪
        if args.wait:
            wait_cluster_ready(cluster_id, args.region, args.timeout)
        
        logger.info(f"\n{'='*50}")
        logger.info(f"集群创建成功!")
        logger.info(f"集群 ID: {cluster_id}")
        logger.info(f"地域: {args.region}")
        logger.info(f"{'='*50}\n")
        
        # 输出后续步骤
        logger.info("后续步骤:")
        logger.info("  1. 获取集群访问凭证:")
        logger.info(f"     tccli tke DescribeClusterKubeconfig --Region {args.region} --ClusterId {cluster_id}")
        logger.info("  2. 添加节点到集群:")
        logger.info(f"     python3 ../node/add_node.py --cluster-id {cluster_id}")
        logger.info("  3. 查看集群详情:")
        logger.info(f"     tccli tke DescribeClusters --Region {args.region} --ClusterIds '[\"{cluster_id}\"]'")
        
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"❌ 创建集群失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
