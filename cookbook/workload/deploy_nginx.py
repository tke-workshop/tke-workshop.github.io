#!/usr/bin/env python3
"""
部署 Nginx 应用示例脚本

功能: 在 TKE 集群中部署 Nginx Deployment 和 Service
使用方法: python3 deploy_nginx.py --cluster-id cls-xxxxxxxx --replicas 3
文档链接: https://tke-workshop.github.io/basics/workload/01-create-deployment/
"""

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from common.logger import setup_logger, LogContext
from kubernetes import client, config
from kubernetes.client.rest import ApiException

logger = setup_logger(__name__)


def deploy_nginx(
    namespace: str = "default",
    replicas: int = 3,
    image: str = "nginx:1.21",
    cpu_request: str = "100m",
    memory_request: str = "128Mi",
    cpu_limit: str = "500m",
    memory_limit: str = "512Mi",
    expose: bool = True,
    service_type: str = "ClusterIP"
):
    """
    部署 Nginx 应用
    
    Args:
        namespace: 命名空间
        replicas: 副本数
        image: 容器镜像
        cpu_request: CPU 请求
        memory_request: 内存请求
        cpu_limit: CPU 限制
        memory_limit: 内存限制
        expose: 是否创建 Service
        service_type: Service 类型 (ClusterIP/NodePort/LoadBalancer)
    """
    with LogContext(logger, "部署 Nginx 应用"):
        # 加载 kubeconfig
        try:
            config.load_kube_config()
            logger.info("✅ 已加载 kubeconfig")
        except Exception as e:
            logger.error(f"❌ 加载 kubeconfig 失败: {e}")
            raise
        
        # 创建 API 客户端
        apps_v1 = client.AppsV1Api()
        core_v1 = client.CoreV1Api()
        
        # 定义 Deployment
        deployment = client.V1Deployment(
            api_version="apps/v1",
            kind="Deployment",
            metadata=client.V1ObjectMeta(
                name="nginx-deployment",
                namespace=namespace,
                labels={"app": "nginx"}
            ),
            spec=client.V1DeploymentSpec(
                replicas=replicas,
                selector=client.V1LabelSelector(
                    match_labels={"app": "nginx"}
                ),
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(
                        labels={"app": "nginx"}
                    ),
                    spec=client.V1PodSpec(
                        containers=[
                            client.V1Container(
                                name="nginx",
                                image=image,
                                ports=[client.V1ContainerPort(
                                    container_port=80,
                                    name="http"
                                )],
                                resources=client.V1ResourceRequirements(
                                    requests={
                                        "cpu": cpu_request,
                                        "memory": memory_request
                                    },
                                    limits={
                                        "cpu": cpu_limit,
                                        "memory": memory_limit
                                    }
                                ),
                                liveness_probe=client.V1Probe(
                                    http_get=client.V1HTTPGetAction(
                                        path="/",
                                        port=80
                                    ),
                                    initial_delay_seconds=30,
                                    period_seconds=10
                                ),
                                readiness_probe=client.V1Probe(
                                    http_get=client.V1HTTPGetAction(
                                        path="/",
                                        port=80
                                    ),
                                    initial_delay_seconds=5,
                                    period_seconds=5
                                )
                            )
                        ]
                    )
                )
            )
        )
        
        try:
            # 创建 Deployment
            logger.info(f"正在创建 Deployment: nginx-deployment")
            logger.info(f"  - 命名空间: {namespace}")
            logger.info(f"  - 副本数: {replicas}")
            logger.info(f"  - 镜像: {image}")
            logger.info(f"  - 资源: CPU({cpu_request}/{cpu_limit}), Memory({memory_request}/{memory_limit})")
            
            resp = apps_v1.create_namespaced_deployment(
                namespace=namespace,
                body=deployment
            )
            
            logger.info(f"✅ Deployment 创建成功")
            logger.info(f"   名称: {resp.metadata.name}")
            logger.info(f"   副本数: {resp.spec.replicas}")
            
        except ApiException as e:
            if e.status == 409:
                logger.warning(f"⚠️  Deployment 已存在,尝试更新...")
                resp = apps_v1.replace_namespaced_deployment(
                    name="nginx-deployment",
                    namespace=namespace,
                    body=deployment
                )
                logger.info(f"✅ Deployment 更新成功")
            else:
                logger.error(f"❌ 创建 Deployment 失败: {e}")
                raise
        
        # 创建 Service
        if expose:
            service = client.V1Service(
                api_version="v1",
                kind="Service",
                metadata=client.V1ObjectMeta(
                    name="nginx-service",
                    namespace=namespace,
                    labels={"app": "nginx"}
                ),
                spec=client.V1ServiceSpec(
                    type=service_type,
                    selector={"app": "nginx"},
                    ports=[
                        client.V1ServicePort(
                            name="http",
                            protocol="TCP",
                            port=80,
                            target_port=80
                        )
                    ]
                )
            )
            
            try:
                logger.info(f"正在创建 Service: nginx-service (type: {service_type})")
                resp = core_v1.create_namespaced_service(
                    namespace=namespace,
                    body=service
                )
                
                logger.info(f"✅ Service 创建成功")
                logger.info(f"   名称: {resp.metadata.name}")
                logger.info(f"   类型: {resp.spec.type}")
                logger.info(f"   ClusterIP: {resp.spec.cluster_ip}")
                
                if service_type == "LoadBalancer":
                    logger.info("   等待 LoadBalancer IP 分配...")
                    
            except ApiException as e:
                if e.status == 409:
                    logger.warning(f"⚠️  Service 已存在")
                else:
                    logger.error(f"❌ 创建 Service 失败: {e}")
                    raise
        
        # 等待 Pod 就绪
        logger.info("等待 Pod 就绪...")
        wait_pods_ready(apps_v1, namespace, "app=nginx", replicas, timeout=300)


def wait_pods_ready(apps_v1, namespace: str, label_selector: str, expected_replicas: int, timeout: int = 300):
    """等待 Pod 就绪"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            deployment = apps_v1.read_namespaced_deployment(
                name="nginx-deployment",
                namespace=namespace
            )
            
            ready_replicas = deployment.status.ready_replicas or 0
            logger.info(f"  Pod 就绪: {ready_replicas}/{expected_replicas}")
            
            if ready_replicas == expected_replicas:
                logger.info(f"✅ 所有 Pod 已就绪")
                return
            
            time.sleep(5)
            
        except Exception as e:
            logger.warning(f"查询 Deployment 状态失败: {e}")
            time.sleep(5)
    
    raise TimeoutError(f"等待 Pod 就绪超时 ({timeout}s)")


def main():
    parser = argparse.ArgumentParser(
        description="部署 Nginx 应用到 TKE 集群",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 部署基础 Nginx
  python3 deploy_nginx.py
  
  # 部署生产环境 Nginx (5副本 + LoadBalancer)
  python3 deploy_nginx.py \\
    --replicas 5 \\
    --expose \\
    --service-type LoadBalancer \\
    --cpu-limit 1000m \\
    --memory-limit 1Gi
        """
    )
    
    parser.add_argument('--namespace', default='default', help='命名空间')
    parser.add_argument('--replicas', type=int, default=3, help='副本数')
    parser.add_argument('--image', default='nginx:1.21', help='容器镜像')
    parser.add_argument('--cpu-request', default='100m', help='CPU 请求')
    parser.add_argument('--memory-request', default='128Mi', help='内存请求')
    parser.add_argument('--cpu-limit', default='500m', help='CPU 限制')
    parser.add_argument('--memory-limit', default='512Mi', help='内存限制')
    parser.add_argument('--expose', action='store_true', help='创建 Service')
    parser.add_argument('--service-type', default='ClusterIP',
                       choices=['ClusterIP', 'NodePort', 'LoadBalancer'],
                       help='Service 类型')
    
    args = parser.parse_args()
    
    try:
        deploy_nginx(
            namespace=args.namespace,
            replicas=args.replicas,
            image=args.image,
            cpu_request=args.cpu_request,
            memory_request=args.memory_request,
            cpu_limit=args.cpu_limit,
            memory_limit=args.memory_limit,
            expose=args.expose,
            service_type=args.service_type
        )
        
        logger.info(f"\n{'='*50}")
        logger.info(f"✅ Nginx 应用部署成功!")
        logger.info(f"{'='*50}\n")
        
        logger.info("验证步骤:")
        logger.info(f"  1. 查看 Deployment: kubectl get deployment nginx-deployment -n {args.namespace}")
        logger.info(f"  2. 查看 Pod: kubectl get pods -l app=nginx -n {args.namespace}")
        if args.expose:
            logger.info(f"  3. 查看 Service: kubectl get svc nginx-service -n {args.namespace}")
            logger.info(f"  4. 测试访问: kubectl port-forward svc/nginx-service 8080:80 -n {args.namespace}")
        
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"❌ 部署失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
