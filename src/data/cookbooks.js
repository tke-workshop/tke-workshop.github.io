export const cookbooks = [
  {
    id: 'create-cluster',
    title: '创建 TKE 托管集群',
    category: 'cluster',
    language: 'Python',
    description: '使用腾讯云 Python SDK 创建一个托管型 TKE 集群，并可选择等待集群进入 Running 状态。',
    tags: ['TKE API', 'Managed Cluster', 'VPC'],
    estimatedTime: '15 分钟',
    verified: true,
    risk: {
      level: '高',
      cost: '会创建真实 TKE 集群、CVM 节点和云硬盘，可能产生持续费用。',
      resourceImpact: '创建云资源',
      notice: '执行前请确认地域、VPC、节点规格和预算；完成验证后按清理步骤删除集群。',
    },
    parameters: [
      {
        name: '--cluster-name',
        required: true,
        example: 'my-cluster',
        description: '新建 TKE 集群名称，用于后续识别和清理。',
      },
      {
        name: '--region',
        required: true,
        example: 'ap-guangzhou',
        description: '目标地域，必须与 VPC、子网和资源配额所在地域一致。',
      },
      {
        name: '--wait',
        required: false,
        example: '--wait',
        description: '创建后等待集群进入 Running 状态，适合自动化验证。',
      },
    ],
    relatedDocs: [
      { label: '环境准备', href: '/start/environment/' },
      { label: '如何创建 TKE 集群', href: '/basics/cluster/01-create-cluster/' },
      { label: '如何查询 TKE 集群列表', href: '/basics/cluster/04-describe-clusters/' },
    ],
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
    cleanup: [
      '确认集群内业务和数据已不再需要。',
      '在控制台或脚本中删除测试集群，并等待集群完全销毁。',
      '检查 CVM、云硬盘、负载均衡和公网 IP 是否仍有遗留资源。',
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
    risk: {
      level: '中',
      cost: '如果选择 LoadBalancer Service，可能创建负载均衡并产生公网或实例费用。',
      resourceImpact: '创建工作负载和可选负载均衡',
      notice: '执行前确认 kubeconfig 指向测试集群；使用 LoadBalancer 后请及时清理 Service。',
    },
    parameters: [
      {
        name: '--replicas',
        required: false,
        example: '3',
        description: 'Nginx Pod 副本数，用于验证调度和服务可用性。',
      },
      {
        name: '--expose',
        required: false,
        example: '--expose',
        description: '创建 Service 暴露应用；结合 service-type 决定是否创建负载均衡。',
      },
      {
        name: '--service-type',
        required: false,
        example: 'LoadBalancer',
        description: 'Service 类型。LoadBalancer 会触发云负载均衡资源。',
      },
    ],
    relatedDocs: [
      { label: '环境准备', href: '/start/environment/' },
      { label: '创建 Deployment', href: '/basics/workload/01-create-deployment/' },
      { label: '如何创建 Kubernetes Service', href: '/basics/service/01-create-service/' },
    ],
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
    cleanup: [
      'kubectl delete service nginx --ignore-not-found',
      'kubectl delete deployment nginx --ignore-not-found',
      '确认云负载均衡控制台中没有该测试 Service 创建的遗留实例。',
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
    risk: {
      level: '高',
      cost: '会占用 GPU 或超级节点资源，可能产生较高算力费用。',
      resourceImpact: '创建 GPU Pod 并占用加速资源',
      notice: '执行前确认 GPU 配额和节点池状态；验证完成后立即删除 Pod 释放资源。',
    },
    parameters: [
      {
        name: '--cluster-id',
        required: true,
        example: 'cls-xxxxxxxx',
        description: '目标 TKE 集群 ID，用于定位 GPU 工作负载部署环境。',
      },
      {
        name: '--gpu-type',
        required: true,
        example: 'T4',
        description: '目标 GPU 类型，应与集群节点或超级节点资源匹配。',
      },
      {
        name: '--gpu-count',
        required: true,
        example: '1',
        description: 'Pod 申请的 GPU 数量，过高会导致调度失败或成本增加。',
      },
      {
        name: '--image',
        required: true,
        example: 'nvidia/cuda:11.8-runtime',
        description: '验证 Pod 使用的容器镜像。',
      },
      {
        name: '--wait',
        required: false,
        example: '--wait',
        description: '部署后等待 Pod 调度和启动完成。',
      },
    ],
    relatedDocs: [
      { label: 'AI on TKE', href: '/ai-ml/' },
      { label: '超级节点 GPU', href: '/ai-ml/training/supernode-gpu/' },
      { label: 'GPU 调度', href: '/ai-ml/training/gpu-scheduling/' },
    ],
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
    cleanup: [
      'kubectl delete pod -l workload=gpu --ignore-not-found',
      '确认 GPU 节点或超级节点上的测试 Pod 已释放。',
      '检查是否还有测试命名空间、PVC 或镜像拉取密钥需要清理。',
    ],
    prompt:
      '请根据 TKE Workshop 的 deploy-gpu-pod Cookbook，在目标 TKE 集群中部署一个使用 1 张 T4 GPU 的验证 Pod。执行前检查 kubeconfig 和 GPU 资源，执行后验证 Pod 调度与日志。',
  },
];

export function getCookbook(id) {
  return cookbooks.find((cookbook) => cookbook.id === id);
}
