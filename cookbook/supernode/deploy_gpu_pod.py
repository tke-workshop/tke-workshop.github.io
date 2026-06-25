#!/usr/bin/env python3
"""
在超级节点上部署 GPU Pod 示例脚本

功能: 在 TKE 超级节点上创建 GPU Pod，支持自动匹配和手动指定 GPU 类型
使用方法: python3 deploy_gpu_pod.py --help
文档链接: https://tke-workshop.github.io/ai-ml/training/supernode-gpu/
"""

import argparse
import sys
import time
from pathlib import Path
from typing import Optional, Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from common.logger import setup_logger, LogContext
from kubernetes import client, config
from kubernetes.client.rest import ApiException

logger = setup_logger(__name__)


class GPUPodDeployer:
    """GPU Pod 部署器"""
    
    # 支持的 GPU 型号及其显存配置
    GPU_SPECS = {
        'V100': {'memory': '16GB', 'cuda': '11.4', 'use_case': '高性能训练、大模型推理'},
        'T4': {'memory': '16GB', 'cuda': '11.4', 'use_case': '通用推理、小模型训练'},
        '1/4*T4': {'memory': '4GB', 'cuda': '11.0', 'use_case': '轻量推理、开发测试'},
        '1/2*T4': {'memory': '8GB', 'cuda': '11.0', 'use_case': '中等推理、批处理'},
        'A10*GNV4': {'memory': '24GB', 'cuda': '11.4', 'use_case': 'AI 推理、图形渲染'},
        'A10*GNV4v': {'memory': '24GB', 'cuda': '11.4', 'use_case': '虚拟化 GPU 工作负载'},
        'A10*PNV4': {'memory': '24GB', 'cuda': '11.4', 'use_case': '高性能图形和计算'},
        'L20': {'memory': '48GB', 'cuda': '12.7', 'use_case': '高端图形工作负载'},
        'L40': {'memory': '48GB', 'cuda': '12.7', 'use_case': '高端图形工作负载'},
    }
    
    def __init__(self, kubeconfig_path: Optional[str] = None):
        """
        初始化部署器
        
        Args:
            kubeconfig_path: kubeconfig 文件路径（可选）
        """
        self.kubeconfig_path = kubeconfig_path
        self._load_kube_config()
        self.core_v1 = client.CoreV1Api()
        self.apps_v1 = client.AppsV1Api()
    
    def _load_kube_config(self):
        """加载 kubeconfig"""
        try:
            if self.kubeconfig_path:
                config.load_kube_config(config_file=self.kubeconfig_path)
            else:
                config.load_kube_config()
            logger.info("✅ 已加载 kubeconfig")
        except Exception as e:
            logger.error(f"❌ 加载 kubeconfig 失败: {e}")
            raise
    
    def create_gpu_pod(
        self,
        name: str,
        namespace: str,
        image: str,
        gpu_type: str,
        gpu_count: int = 1,
        cpu: Optional[str] = None,
        memory: Optional[str] = None,
        use_auto_match: bool = True,
        use_image_cache: bool = False,
        image_cache_id: Optional[str] = None,
        disk_size: int = 200,
        command: Optional[list] = None,
        env: Optional[Dict[str, str]] = None,
        labels: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        创建 GPU Pod
        
        Args:
            name: Pod 名称
            namespace: 命名空间
            image: 容器镜像
            gpu_type: GPU 型号 (如 'T4', 'V100', '1/4*T4' 等)
            gpu_count: GPU 数量
            cpu: CPU 核数（显式指定时使用）
            memory: 内存大小（显式指定时使用）
            use_auto_match: 是否使用自动匹配模式（推荐）
            use_image_cache: 是否启用镜像缓存
            image_cache_id: 镜像缓存 ID（手动指定时使用）
            disk_size: 磁盘大小（GB，使用镜像缓存时需要）
            command: 容器启动命令
            env: 环境变量
            labels: Pod 标签
        
        Returns:
            创建的 Pod 信息
        """
        with LogContext(logger, f"创建 GPU Pod: {name}"):
            # 验证 GPU 型号
            if gpu_type not in self.GPU_SPECS:
                raise ValueError(
                    f"不支持的 GPU 型号: {gpu_type}\n"
                    f"支持的型号: {', '.join(self.GPU_SPECS.keys())}"
                )
            
            gpu_spec = self.GPU_SPECS[gpu_type]
            logger.info(f"📊 GPU 配置: {gpu_type} ({gpu_spec['memory']}, CUDA {gpu_spec['cuda']})")
            logger.info(f"🎯 适用场景: {gpu_spec['use_case']}")
            
            # 构建 annotations
            annotations = self._build_annotations(
                gpu_type=gpu_type,
                gpu_count=gpu_count,
                cpu=cpu,
                memory=memory,
                use_auto_match=use_auto_match,
                use_image_cache=use_image_cache,
                image_cache_id=image_cache_id,
                disk_size=disk_size
            )
            
            # 构建容器配置
            container = self._build_container(
                name=name,
                image=image,
                gpu_count=gpu_count,
                cpu=cpu,
                memory=memory,
                use_auto_match=use_auto_match,
                command=command,
                env=env
            )
            
            # 构建 Pod 定义
            pod_labels = labels or {}
            pod_labels.update({
                'app': name,
                'gpu-type': gpu_type.replace('*', '-').replace('/', '-')
            })
            
            pod = client.V1Pod(
                api_version="v1",
                kind="Pod",
                metadata=client.V1ObjectMeta(
                    name=name,
                    namespace=namespace,
                    labels=pod_labels,
                    annotations=annotations
                ),
                spec=client.V1PodSpec(
                    containers=[container],
                    restart_policy="Never",
                    # 调度到超级节点
                    node_selector={"type": "virtual-kubelet"},
                    tolerations=[
                        client.V1Toleration(
                            key="serverless",
                            operator="Exists",
                            effect="NoSchedule"
                        )
                    ]
                )
            )
            
            # 创建 Pod
            try:
                logger.info(f"🚀 正在创建 Pod: {namespace}/{name}")
                api_response = self.core_v1.create_namespaced_pod(
                    namespace=namespace,
                    body=pod
                )
                
                logger.info(f"✅ Pod 创建成功: {api_response.metadata.name}")
                logger.info(f"📝 Pod UID: {api_response.metadata.uid}")
                
                # 等待 Pod 启动
                self._wait_for_pod_ready(name, namespace)
                
                return {
                    'name': api_response.metadata.name,
                    'namespace': api_response.metadata.namespace,
                    'uid': api_response.metadata.uid,
                    'status': 'Created',
                    'gpu_type': gpu_type,
                    'gpu_count': gpu_count,
                    'image': image
                }
                
            except ApiException as e:
                logger.error(f"❌ 创建 Pod 失败: {e.reason}")
                if e.body:
                    logger.error(f"错误详情: {e.body}")
                raise
    
    def _build_annotations(
        self,
        gpu_type: str,
        gpu_count: int,
        cpu: Optional[str],
        memory: Optional[str],
        use_auto_match: bool,
        use_image_cache: bool,
        image_cache_id: Optional[str],
        disk_size: int
    ) -> Dict[str, str]:
        """构建 Pod annotations"""
        annotations = {}
        
        # GPU 配置
        if use_auto_match:
            # 方式 B: 自动匹配（推荐）
            annotations['eks.tke.cloud.tencent.com/gpu-type'] = gpu_type
            logger.info(f"🔧 使用自动匹配模式: GPU={gpu_type}")
        else:
            # 方式 A: 显式指定
            if not cpu or not memory:
                raise ValueError("使用显式指定模式时，必须提供 cpu 和 memory 参数")
            
            annotations['eks.tke.cloud.tencent.com/gpu-type'] = gpu_type
            annotations['eks.tke.cloud.tencent.com/gpu-count'] = str(gpu_count)
            annotations['eks.tke.cloud.tencent.com/cpu'] = cpu
            annotations['eks.tke.cloud.tencent.com/mem'] = memory
            logger.info(f"🔧 使用显式指定模式: GPU={gpu_type}, Count={gpu_count}, CPU={cpu}, Memory={memory}")
        
        # 镜像缓存配置
        if use_image_cache:
            if image_cache_id:
                # 手动指定镜像缓存
                annotations['eks.tke.cloud.tencent.com/use-image-cache'] = image_cache_id
                logger.info(f"💾 使用指定镜像缓存: {image_cache_id}")
            else:
                # 自动匹配镜像缓存
                annotations['eks.tke.cloud.tencent.com/use-image-cache'] = 'auto'
                annotations['eks.tke.cloud.tencent.com/pod-resource'] = f'{{"disk": {{"size": {disk_size}}}}}'
                logger.info(f"💾 启用自动镜像缓存: 磁盘大小={disk_size}GB")
        
        return annotations
    
    def _build_container(
        self,
        name: str,
        image: str,
        gpu_count: int,
        cpu: Optional[str],
        memory: Optional[str],
        use_auto_match: bool,
        command: Optional[list],
        env: Optional[Dict[str, str]]
    ) -> client.V1Container:
        """构建容器配置"""
        # 环境变量
        env_vars = [
            client.V1EnvVar(name="NVIDIA_VISIBLE_DEVICES", value="all"),
            client.V1EnvVar(name="NVIDIA_DRIVER_CAPABILITIES", value="compute,utility")
        ]
        
        if env:
            env_vars.extend([
                client.V1EnvVar(name=k, value=v) for k, v in env.items()
            ])
        
        # 资源配置
        resources = None
        if use_auto_match:
            # 自动匹配模式：使用 resources 定义
            resources = client.V1ResourceRequirements(
                requests={
                    "cpu": cpu or "4",
                    "memory": memory or "16Gi",
                    "nvidia.com/gpu": str(gpu_count)
                },
                limits={
                    "cpu": cpu or "8",
                    "memory": memory or "32Gi",
                    "nvidia.com/gpu": str(gpu_count)
                }
            )
        
        container = client.V1Container(
            name=name,
            image=image,
            env=env_vars
        )
        
        if command:
            container.command = command
        
        if resources:
            container.resources = resources
        
        return container
    
    def _wait_for_pod_ready(
        self,
        name: str,
        namespace: str,
        timeout: int = 600
    ):
        """等待 Pod 就绪"""
        logger.info(f"⏳ 等待 Pod 就绪 (超时: {timeout}s)...")
        
        start_time = time.time()
        last_phase = None
        
        while time.time() - start_time < timeout:
            try:
                pod = self.core_v1.read_namespaced_pod(name, namespace)
                phase = pod.status.phase
                
                if phase != last_phase:
                    logger.info(f"📊 Pod 状态: {phase}")
                    last_phase = phase
                
                if phase == "Running":
                    logger.info("✅ Pod 已就绪")
                    return
                elif phase == "Failed":
                    logger.error("❌ Pod 启动失败")
                    self._log_pod_events(name, namespace)
                    raise RuntimeError(f"Pod {name} 启动失败")
                
                time.sleep(5)
                
            except ApiException as e:
                logger.error(f"❌ 查询 Pod 状态失败: {e.reason}")
                raise
        
        logger.warning(f"⚠️ Pod 在 {timeout}s 内未就绪")
        self._log_pod_events(name, namespace)
    
    def _log_pod_events(self, name: str, namespace: str):
        """打印 Pod 事件"""
        try:
            events = self.core_v1.list_namespaced_event(
                namespace=namespace,
                field_selector=f"involvedObject.name={name}"
            )
            
            if events.items:
                logger.info("📋 Pod 事件:")
                for event in events.items[-10:]:  # 显示最近 10 条
                    logger.info(
                        f"  [{event.type}] {event.reason}: {event.message}"
                    )
        except Exception as e:
            logger.warning(f"⚠️ 获取 Pod 事件失败: {e}")
    
    def delete_pod(self, name: str, namespace: str):
        """删除 Pod"""
        with LogContext(logger, f"删除 Pod: {namespace}/{name}"):
            try:
                self.core_v1.delete_namespaced_pod(
                    name=name,
                    namespace=namespace,
                    body=client.V1DeleteOptions()
                )
                logger.info("✅ Pod 删除成功")
            except ApiException as e:
                if e.status == 404:
                    logger.warning("⚠️ Pod 不存在")
                else:
                    logger.error(f"❌ 删除 Pod 失败: {e.reason}")
                    raise
    
    def get_pod_logs(
        self,
        name: str,
        namespace: str,
        tail_lines: int = 100
    ) -> str:
        """获取 Pod 日志"""
        try:
            logs = self.core_v1.read_namespaced_pod_log(
                name=name,
                namespace=namespace,
                tail_lines=tail_lines
            )
            return logs
        except ApiException as e:
            logger.error(f"❌ 获取 Pod 日志失败: {e.reason}")
            raise


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='在超级节点上部署 GPU Pod',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  # 1. 使用自动匹配创建 T4 GPU Pod（推荐）
  python3 deploy_gpu_pod.py \\
    --name gpu-inference \\
    --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \\
    --gpu-type T4 \\
    --gpu-count 1

  # 2. 使用显式指定创建 V100 GPU Pod
  python3 deploy_gpu_pod.py \\
    --name gpu-training \\
    --image tensorflow/tensorflow:2.13.0-gpu \\
    --gpu-type V100 \\
    --gpu-count 1 \\
    --cpu 8 \\
    --memory 40Gi \\
    --no-auto-match

  # 3. 使用镜像缓存加速启动
  python3 deploy_gpu_pod.py \\
    --name gpu-fast \\
    --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \\
    --gpu-type T4 \\
    --use-image-cache \\
    --disk-size 200

  # 4. 手动指定镜像缓存
  python3 deploy_gpu_pod.py \\
    --name gpu-cached \\
    --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \\
    --gpu-type T4 \\
    --image-cache-id imc-xxxxxxxx

  # 5. 删除 Pod
  python3 deploy_gpu_pod.py --delete --name gpu-inference

  # 6. 查看 Pod 日志
  python3 deploy_gpu_pod.py --logs --name gpu-inference --tail 50
        '''
    )
    
    # 操作类型
    parser.add_argument('--delete', action='store_true', help='删除 Pod')
    parser.add_argument('--logs', action='store_true', help='查看 Pod 日志')
    
    # 基本参数
    parser.add_argument('--name', required=True, help='Pod 名称')
    parser.add_argument('--namespace', default='default', help='命名空间 (默认: default)')
    parser.add_argument('--image', help='容器镜像')
    parser.add_argument('--kubeconfig', help='kubeconfig 文件路径')
    
    # GPU 配置
    parser.add_argument(
        '--gpu-type',
        choices=list(GPUPodDeployer.GPU_SPECS.keys()),
        help='GPU 型号'
    )
    parser.add_argument('--gpu-count', type=int, default=1, help='GPU 数量 (默认: 1)')
    
    # 资源配置（显式指定模式）
    parser.add_argument('--cpu', help='CPU 核数 (如: 8, 16)')
    parser.add_argument('--memory', help='内存大小 (如: 32Gi, 64Gi)')
    parser.add_argument('--no-auto-match', action='store_true', help='禁用自动匹配，使用显式指定模式')
    
    # 镜像缓存配置
    parser.add_argument('--use-image-cache', action='store_true', help='启用镜像缓存')
    parser.add_argument('--image-cache-id', help='镜像缓存 ID (如: imc-xxxxxxxx)')
    parser.add_argument('--disk-size', type=int, default=200, help='磁盘大小 GB (默认: 200)')
    
    # 容器配置
    parser.add_argument('--command', help='容器启动命令 (JSON 数组格式)')
    parser.add_argument('--env', help='环境变量 (JSON 对象格式)')
    
    # 日志参数
    parser.add_argument('--tail', type=int, default=100, help='显示日志行数 (默认: 100)')
    
    args = parser.parse_args()
    
    try:
        deployer = GPUPodDeployer(kubeconfig_path=args.kubeconfig)
        
        # 删除操作
        if args.delete:
            deployer.delete_pod(args.name, args.namespace)
            return
        
        # 查看日志
        if args.logs:
            logs = deployer.get_pod_logs(args.name, args.namespace, args.tail)
            print(logs)
            return
        
        # 创建操作
        if not args.image or not args.gpu_type:
            parser.error("创建 Pod 需要 --image 和 --gpu-type 参数")
        
        # 解析命令和环境变量
        command = None
        if args.command:
            import json
            command = json.loads(args.command)
        
        env = None
        if args.env:
            import json
            env = json.loads(args.env)
        
        # 创建 GPU Pod
        result = deployer.create_gpu_pod(
            name=args.name,
            namespace=args.namespace,
            image=args.image,
            gpu_type=args.gpu_type,
            gpu_count=args.gpu_count,
            cpu=args.cpu,
            memory=args.memory,
            use_auto_match=not args.no_auto_match,
            use_image_cache=args.use_image_cache or bool(args.image_cache_id),
            image_cache_id=args.image_cache_id,
            disk_size=args.disk_size,
            command=command,
            env=env
        )
        
        logger.info("=" * 60)
        logger.info("🎉 GPU Pod 部署完成!")
        logger.info(f"📝 Pod 名称: {result['name']}")
        logger.info(f"📦 命名空间: {result['namespace']}")
        logger.info(f"🎮 GPU 类型: {result['gpu_type']}")
        logger.info(f"🔢 GPU 数量: {result['gpu_count']}")
        logger.info(f"🖼️  镜像: {result['image']}")
        logger.info("=" * 60)
        logger.info("\n查看 Pod 状态:")
        logger.info(f"  kubectl get pod {result['name']} -n {result['namespace']}")
        logger.info("\n查看 Pod 详情:")
        logger.info(f"  kubectl describe pod {result['name']} -n {result['namespace']}")
        logger.info("\n查看 Pod 日志:")
        logger.info(f"  kubectl logs {result['name']} -n {result['namespace']}")
        logger.info("\n进入 Pod:")
        logger.info(f"  kubectl exec -it {result['name']} -n {result['namespace']} -- bash")
        logger.info("\n查看 GPU 信息:")
        logger.info(f"  kubectl exec {result['name']} -n {result['namespace']} -- nvidia-smi")
        
    except KeyboardInterrupt:
        logger.warning("\n⚠️ 操作已取消")
        sys.exit(130)
    except Exception as e:
        logger.error(f"❌ 操作失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
