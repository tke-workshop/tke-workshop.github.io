export type Cookbook = {
  id: string;
  title: string;
  category: 'cluster' | 'workload' | 'gpu';
  language: 'Python' | 'YAML';
  description: string;
  tags: string[];
  estimatedTime: string;
  verified: boolean;
  files: string[];
  prerequisites: string[];
  commands: string[];
  verification: string[];
  prompt: string;
};

export const cookbooks: Cookbook[] = [
  {
    id: 'create-cluster',
    title: '创建 TKE 托管集群',
    category: 'cluster',
    language: 'Python',
    description: '使用腾讯云 Python SDK 创建一个托管型 TKE 集群，并可选择等待集群进入 Running 状态。',
    tags: ['TKE API', 'Managed Cluster', 'VPC'],
    estimatedTime: '15 分钟',
    verified: true,
    files: ['cookbook/cluster/create_cluster.py', 'cookbook/common/auth.py', 'cookbook/config.example.yaml'],
    prerequisites: [
      '已准备腾讯云 SecretId 和 SecretKey。',
      '已在目标地域创建 VPC。',
      '已复制 cookbook/config.example.yaml 为 cookbook/config.yaml。',
    ],
    commands: [
      'cd cookbook',
      'pip install -r requirements.txt',
      'python3 cluster/create_cluster.py --cluster-name my-cluster --region ap-guangzhou --wait',
    ],
    verification: [
      'tccli tke DescribeClusters --Region ap-guangzhou --ClusterIds \'["cls-xxxxxxxx"]\'',
      '确认 ClusterStatus 为 Running。',
    ],
    prompt:
      '请根据 TKE Workshop 的 create-cluster Cookbook，帮我在 ap-guangzhou 创建一个托管 TKE 集群。创建前先检查 config.yaml、VPC ID 和集群 CIDR，并在创建后等待集群 Running。',
  },
  {
    id: 'deploy-nginx',
    title: '部署 Nginx 应用',
    category: 'workload',
    language: 'Python',
    description: '在已有 TKE 集群中部署 Nginx Deployment，并可选创建 LoadBalancer Service 暴露访问。',
    tags: ['Kubernetes', 'Deployment', 'LoadBalancer'],
    estimatedTime: '10 分钟',
    verified: true,
    files: ['cookbook/workload/deploy_nginx.py', 'cookbook/workload/deploy_nginx.yaml'],
    prerequisites: [
      '本地 kubectl 已能访问目标 TKE 集群。',
      '当前 kubeconfig context 指向目标集群。',
      '目标命名空间存在，或允许脚本创建资源。',
    ],
    commands: [
      'cd cookbook',
      'python3 workload/deploy_nginx.py --replicas 3 --expose --service-type LoadBalancer',
    ],
    verification: [
      'kubectl get deployment nginx',
      'kubectl get pods -l app=nginx',
      'kubectl get service nginx',
    ],
    prompt:
      '请根据 TKE Workshop 的 deploy-nginx Cookbook，在当前 kubeconfig 指向的 TKE 集群中部署 3 副本 Nginx，并创建 LoadBalancer Service。部署完成后验证 Pod 和 Service 状态。',
  },
  {
    id: 'deploy-gpu-pod',
    title: '部署 GPU 工作负载',
    category: 'gpu',
    language: 'Python',
    description: '在 TKE 超级节点或 GPU 节点上部署 GPU Pod，用于 AI 训练或推理环境验证。',
    tags: ['GPU', 'SuperNode', 'AI/ML'],
    estimatedTime: '20 分钟',
    verified: true,
    files: ['cookbook/supernode/deploy_gpu_pod.py', 'cookbook/supernode/gpu_pod_examples.yaml'],
    prerequisites: [
      '目标集群已配置 GPU 或超级节点资源。',
      'kubectl 已连接目标集群。',
      '已确认镜像、GPU 型号和资源规格。',
    ],
    commands: [
      'cd cookbook',
      'python3 supernode/deploy_gpu_pod.py --cluster-id cls-xxxxxxxx --gpu-type T4 --gpu-count 1 --image nvidia/cuda:11.8-runtime --wait',
    ],
    verification: [
      'kubectl get pods -l workload=gpu',
      'kubectl describe pod <gpu-pod-name>',
      'kubectl logs <gpu-pod-name>',
    ],
    prompt:
      '请根据 TKE Workshop 的 deploy-gpu-pod Cookbook，在目标 TKE 集群中部署一个使用 1 张 T4 GPU 的验证 Pod。执行前检查 kubeconfig 和 GPU 资源，执行后验证 Pod 调度与日志。',
  },
];

export function getCookbook(id: string) {
  return cookbooks.find((cookbook) => cookbook.id === id);
}
