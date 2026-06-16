function buildSource({ repo, path = '', branch = 'main' }) {
  const href = path
    ? `https://github.com/${repo}/tree/${branch}/${path}`
    : `https://github.com/${repo}`;
  const readmeHref = path
    ? `https://github.com/${repo}/blob/${branch}/${path}/README.md`
    : `https://github.com/${repo}/blob/${branch}/README.md`;

  return { repo, path, branch, href, readmeHref };
}

function communityCookbook({
  id,
  title,
  category,
  language,
  description,
  tags,
  estimatedTime,
  source,
  risk,
  relatedDocs,
  prompt,
  badge,
  icon,
  services,
}) {
  const cookbookSource = buildSource(source);
  const repoName = source.repo.split('/')[1];
  const workdir = source.path ? `${repoName}/${source.path}` : repoName;
  const readmeLabel = source.path ? `${source.path}/README.md` : 'README.md';

  return {
    id,
    title,
    category,
    language,
    description,
    tags,
    estimatedTime,
    verified: true,
    icon,
    badge,
    services,
    source: cookbookSource,
    risk,
    parameters: [
      {
        name: 'repo',
        required: true,
        example: source.repo,
        description: '旧版 Cookbook 对应的 GitHub 仓库。',
      },
      {
        name: 'path',
        required: Boolean(source.path),
        example: source.path || '/',
        description: '仓库内的 Cookbook 子目录；为空表示仓库根目录。',
      },
      {
        name: 'branch',
        required: false,
        example: source.branch || 'main',
        description: '默认分支，执行前建议确认 README 与示例文件来自同一分支。',
      },
    ],
    relatedDocs,
    files: [{ label: readmeLabel, href: cookbookSource.readmeHref }],
    prerequisites: [
      '已阅读关联 README，确认目标集群、地域、账号权限和资源配额。',
      '已准备测试环境，避免直接在生产集群执行未验证步骤。',
      '已确认该外部 Cookbook 的分支、路径和依赖版本仍然可用。',
    ],
    commands: [
      `git clone https://github.com/${source.repo}.git`,
      `cd ${workdir}`,
      '阅读 README.md，并根据示例准备配置文件或环境变量。',
      '按 README 的 Quick Start / Usage 步骤在测试环境执行。',
    ],
    verification: [
      '确认 README 中定义的验证命令或检查项全部通过。',
      '记录创建的 Kubernetes 对象、云资源和外部依赖。',
      '如涉及集群变更，确认业务流量和系统组件状态恢复正常。',
    ],
    cleanup: [
      '按 README 的 Cleanup / Delete 步骤删除测试资源。',
      '检查集群内 Deployment、Service、Pod、CRD、Secret、PVC 等资源是否残留。',
      '检查云负载均衡、CVM、GPU、弹性节点、存储卷等计费资源是否释放。',
    ],
    prompt,
  };
}

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
    icon: '🚀',
    services: [
      { label: 'Python SDK', icon: '🐍' },
      { label: 'TKE API', icon: '☁️' },
      { label: 'K8s 集群', icon: '🚢' },
    ],
    source: buildSource({
      repo: 'tke-workshop/tke-workshop.github.io',
      path: 'cookbook/cluster',
    }),
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
    files: [
      'cookbook/cluster/create_cluster.py',
      'cookbook/common/auth.py',
      'cookbook/config.example.yaml',
    ],
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
    icon: '🌐',
    services: [
      { label: 'kubectl', icon: '⚙️' },
      { label: 'Deployment', icon: '📦' },
      { label: 'LoadBalancer', icon: '🔀' },
    ],
    source: buildSource({
      repo: 'tke-workshop/tke-workshop.github.io',
      path: 'cookbook/workload',
    }),
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
    icon: '🎮',
    services: [
      { label: 'SuperNode', icon: '🚀' },
      { label: 'GPU Pod', icon: '🎮' },
      { label: 'AI Training', icon: '🤖' },
    ],
    source: buildSource({
      repo: 'tke-workshop/tke-workshop.github.io',
      path: 'cookbook/supernode',
    }),
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
  communityCookbook({
    id: 'tke-ai-playbook',
    title: 'TKE AI Playbook',
    category: 'gpu',
    language: 'YAML',
    description: 'TKE AI 场景 Playbook，覆盖 GPU 集群上的训练、推理和 AI 工作负载实践。',
    tags: ['AI/ML', 'GPU', 'Training'],
    estimatedTime: '30 分钟',
    source: { repo: 'tkestack/tke-ai-playbook' },
    risk: {
      level: '高',
      cost: '可能创建 GPU 工作负载并占用昂贵算力资源。',
      resourceImpact: '部署 AI/GPU 相关 Kubernetes 资源',
      notice: '执行前确认 GPU 配额、镜像可用性和测试集群隔离策略。',
    },
    relatedDocs: [
      { label: 'AI on TKE', href: '/ai-ml/' },
      { label: 'Training on TKE', href: '/ai-ml/training/' },
    ],
    prompt:
      '请基于 TKE AI Playbook，在测试 TKE 集群中选择一个 GPU/AI 场景执行。先阅读 README，列出资源影响，再按步骤部署、验证和清理。',
    badge: 'HOT',
    icon: '🤖',
    services: [
      { label: 'AI Workload', icon: '🤖' },
      { label: 'TKE', icon: '☁️' },
      { label: 'GPU Cluster', icon: '⚡' },
    ],
  }),
  communityCookbook({
    id: 'tke-chaos-playbook',
    title: 'TKE Chaos Engineering',
    category: 'testing',
    language: 'YAML',
    description: '面向 TKE 的混沌工程 Playbook，用于故障注入、韧性验证和恢复流程演练。',
    tags: ['Chaos', 'Fault Injection', 'Resilience'],
    estimatedTime: '25 分钟',
    source: { repo: 'tkestack/tke-chaos-playbook' },
    risk: {
      level: '高',
      cost: '通常不会直接创建高额云资源，但会主动制造故障并影响服务可用性。',
      resourceImpact: '注入故障并修改测试集群运行状态',
      notice: '只能在测试集群执行，必须提前准备回滚方案和观测指标。',
    },
    relatedDocs: [
      { label: '可靠性最佳实践', href: '/best-practices/reliability/' },
      { label: '可观测性', href: '/best-practices/observability/' },
    ],
    prompt:
      '请基于 TKE Chaos Engineering Cookbook，在测试集群选择一个低风险故障注入实验，执行前说明影响面，执行后验证恢复并清理实验资源。',
    icon: '⚙️',
    services: [
      { label: 'ChaosMesh', icon: '⚙️' },
      { label: 'Fault Injection', icon: '💥' },
      { label: 'Testing', icon: '🧪' },
    ],
  }),
  communityCookbook({
    id: 'tke-direct-upgrade',
    title: 'TKE 直接升级',
    category: 'cluster',
    language: 'Bash',
    description: 'TKE 集群直接升级 Playbook，帮助规划升级路径、执行版本变更并验证集群状态。',
    tags: ['Upgrade', 'Migration', 'Version'],
    estimatedTime: '20 分钟',
    source: { repo: 'tkestack/tke-playbook', path: 'tke-direct-upgrade' },
    risk: {
      level: '高',
      cost: '升级过程本身不一定新增资源，但可能影响控制面和业务可用性。',
      resourceImpact: '变更集群版本和系统组件状态',
      notice: '执行前必须备份关键配置、确认兼容性，并在维护窗口操作。',
    },
    relatedDocs: [
      { label: '升级 TKE 集群', href: '/best-practices/control-plane/upgrade/' },
      { label: '控制面升级最佳实践', href: '/best-practices/upgrade/control-plane-upgrade/' },
    ],
    prompt:
      '请基于 TKE 直接升级 Playbook，为测试集群制定升级检查清单，确认兼容性、备份、执行步骤、验证指标和回滚策略。',
    icon: '🔄',
    services: [
      { label: 'TKE v1.x', icon: '📦' },
      { label: 'Upgrade', icon: '🔄' },
      { label: 'TKE v2.x', icon: '🚀' },
    ],
  }),
  communityCookbook({
    id: 'tke-get-client-ip',
    title: 'TKE 获取客户端 IP',
    category: 'networking',
    language: 'YAML',
    description: '演示在 TKE Service 和 LoadBalancer 场景下保留或获取真实客户端 IP。',
    tags: ['Network', 'Client IP', 'LoadBalancer'],
    estimatedTime: '15 分钟',
    source: { repo: 'tkestack/tke-playbook', path: 'tke-get-client-ip' },
    risk: {
      level: '中',
      cost: '可能创建 LoadBalancer Service 并产生负载均衡或公网流量费用。',
      resourceImpact: '创建 Service、负载均衡和测试工作负载',
      notice: '执行后请删除测试 Service，避免负载均衡资源持续计费。',
    },
    relatedDocs: [
      { label: '网络最佳实践', href: '/best-practices/networking/' },
      { label: '如何创建 Kubernetes Service', href: '/basics/service/01-create-service/' },
    ],
    prompt:
      '请基于 TKE 获取客户端 IP Cookbook，在测试集群部署示例 Service，验证客户端 IP 获取方式，并在验证后清理负载均衡资源。',
    icon: '🌐',
    services: [
      { label: 'Client', icon: '👤' },
      { label: 'LoadBalancer', icon: '🔀' },
      { label: 'Service', icon: '🌐' },
    ],
  }),
  communityCookbook({
    id: 'tke-hybrid-node-architecture',
    title: 'TKE 混合节点架构',
    category: 'cluster',
    language: 'YAML',
    description: 'TKE 混合节点架构 Playbook，用于验证 x86、ARM 等多类型节点协同运行场景。',
    tags: ['Hybrid', 'Node', 'Multi-Arch'],
    estimatedTime: '25 分钟',
    source: { repo: 'tkestack/tke-playbook', path: 'tke-hybrid-node-architecture' },
    risk: {
      level: '中',
      cost: '可能需要不同规格节点或节点池，按节点资源产生费用。',
      resourceImpact: '创建或调度到多架构节点资源',
      notice: '执行前确认镜像架构兼容性和节点池标签，避免 Pod 调度失败。',
    },
    relatedDocs: [
      { label: '节点管理', href: '/basics/node/01-add-node/' },
      { label: '创建节点池', href: '/basics/node-pool/01-create-node-pool/' },
    ],
    prompt:
      '请基于 TKE 混合节点架构 Cookbook，在测试集群验证多架构节点调度。执行前检查节点标签、镜像架构和回滚清理步骤。',
    badge: 'NEW',
    icon: '🔗',
    services: [
      { label: 'x86 Node', icon: '💻' },
      { label: 'ARM Node', icon: '📱' },
      { label: 'Hybrid Cluster', icon: '🔗' },
    ],
  }),
  communityCookbook({
    id: 'tke-karpenter',
    title: 'TKE Karpenter 弹性伸缩',
    category: 'cluster',
    language: 'YAML',
    description: '在 TKE 上使用 Karpenter 进行节点自动供给和工作负载弹性伸缩。',
    tags: ['Karpenter', 'Autoscaling', 'Node'],
    estimatedTime: '30 分钟',
    source: { repo: 'tkestack/tke-playbook', path: 'tke-karpenter' },
    risk: {
      level: '高',
      cost: '自动扩容可能创建新的计算节点并产生费用。',
      resourceImpact: '安装弹性组件并创建节点资源',
      notice: '执行前设置资源上限和预算边界，验证后关闭自动扩容或删除测试配置。',
    },
    relatedDocs: [
      { label: '资源动态伸缩', href: '/best-practices/cost-optimization/dynamic-scaling/' },
      { label: '工作负载扩展', href: '/best-practices/scalability/workload-scaling/' },
    ],
    prompt:
      '请基于 TKE Karpenter Cookbook，在测试集群配置一个受控的弹性伸缩实验。先设置扩容上限，再部署测试负载、观察节点变化并清理。',
    badge: 'HOT',
    icon: '⚡',
    services: [
      { label: 'Karpenter', icon: '⚡' },
      { label: 'Auto Scaling', icon: '📈' },
      { label: 'Node Pool', icon: '🌊' },
    ],
  }),
  communityCookbook({
    id: 'tke-terraform-examples',
    title: 'TKE Terraform IaC 示例',
    category: 'cluster',
    language: 'Terraform',
    description: '使用 Terraform 以 IaC 方式创建和管理 TKE 相关基础设施。',
    tags: ['Terraform', 'IaC', 'Automation'],
    estimatedTime: '20 分钟',
    source: { repo: 'tkestack/tke-playbook', path: 'tke-terraform-examples' },
    risk: {
      level: '高',
      cost: 'Terraform apply 可能创建集群、节点、网络和存储等计费资源。',
      resourceImpact: '通过 IaC 创建或修改云资源',
      notice: '执行前必须 review plan，限定 workspace，并在验证后 terraform destroy。',
    },
    relatedDocs: [
      { label: '创建 TKE 集群', href: '/basics/cluster/01-create-cluster/' },
      { label: '成本优化', href: '/best-practices/cost-optimization/' },
    ],
    prompt:
      '请基于 TKE Terraform IaC 示例，在隔离 workspace 中执行 plan，解释将创建的资源和费用影响，经确认后再 apply，并准备 destroy 清理步骤。',
    icon: '🏗️',
    services: [
      { label: 'Terraform', icon: '🏗️' },
      { label: 'TKE API', icon: '☁️' },
      { label: 'Infrastructure', icon: '🌐' },
    ],
  }),
  communityCookbook({
    id: 'tke-to-community-ingress',
    title: 'TKE 迁移到社区 Ingress',
    category: 'networking',
    language: 'YAML',
    description: '将 TKE Ingress 场景迁移到社区 Ingress Controller 的实践 Playbook。',
    tags: ['Ingress', 'Migration', 'Community'],
    estimatedTime: '25 分钟',
    source: { repo: 'tkestack/tke-playbook', path: 'tke-to-community-ingress' },
    risk: {
      level: '高',
      cost: '可能创建新的 Ingress Controller、LoadBalancer 和公网流量。',
      resourceImpact: '迁移入口流量和负载均衡配置',
      notice: '执行前必须准备灰度和回滚方案，避免生产入口流量中断。',
    },
    relatedDocs: [
      { label: 'Ingress 实践', href: '/best-practices/networking/ingress/' },
      { label: '网络最佳实践', href: '/best-practices/networking/' },
    ],
    prompt:
      '请基于 TKE 迁移到社区 Ingress Cookbook，先生成迁移风险清单和回滚方案，再在测试集群执行入口迁移验证。',
    icon: '🔄',
    services: [
      { label: 'TKE Ingress', icon: '🚪' },
      { label: 'Migration', icon: '🔄' },
      { label: 'Nginx Ingress', icon: '🌐' },
    ],
  }),
  communityCookbook({
    id: 'ags-browser-agent',
    title: 'Browser Agent - 浏览器自动化代理',
    category: 'agent',
    language: 'Python',
    description: 'Agent Sandbox 浏览器自动化示例，用于网页操作、浏览器任务编排和自动化验证。',
    tags: ['Agent', 'Browser', 'Automation'],
    estimatedTime: '20 分钟',
    source: { repo: 'TencentCloudAgentRuntime/ags-cookbook', path: 'examples/browser-agent' },
    risk: {
      level: '中',
      cost: '通常不创建云资源，但可能调用外部网页或浏览器会话。',
      resourceImpact: '运行本地或沙箱 Agent 示例',
      notice: '执行前确认不会提交敏感表单或访问未授权站点。',
    },
    relatedDocs: [
      { label: 'AI on TKE', href: '/ai-ml/' },
      { label: 'TKE Skill', href: '/ai-ml/ai-copilot/tke-skill/' },
    ],
    prompt:
      '请基于 Browser Agent Cookbook，在本地沙箱运行浏览器自动化示例。执行前说明访问目标和数据边界，执行后总结结果。',
    badge: 'NEW',
    icon: '🌐',
    services: [
      { label: 'Browser', icon: '🌐' },
      { label: 'Agent', icon: '🤖' },
      { label: 'Automation', icon: '⚡' },
    ],
  }),
  communityCookbook({
    id: 'ags-data-analysis',
    title: 'Data Analysis - 数据分析代理',
    category: 'agent',
    language: 'Python',
    description: 'Agent Sandbox 数据分析示例，用于读取数据、执行分析和生成结果摘要。',
    tags: ['Agent', 'Data Analysis', 'AI'],
    estimatedTime: '25 分钟',
    source: { repo: 'TencentCloudAgentRuntime/ags-cookbook', path: 'examples/data-analysis' },
    risk: {
      level: '中',
      cost: '通常不创建云资源，但可能处理本地数据文件或调用模型服务。',
      resourceImpact: '运行数据分析 Agent 示例',
      notice: '执行前确认数据脱敏和输出位置，避免泄露敏感数据。',
    },
    relatedDocs: [
      { label: 'Data on TKE', href: '/data/' },
      { label: 'AI on TKE', href: '/ai-ml/' },
    ],
    prompt:
      '请基于 Data Analysis Cookbook，选择示例数据运行分析代理，先说明输入数据和隐私边界，再输出分析结果和复现步骤。',
    badge: 'NEW',
    icon: '📊',
    services: [
      { label: 'Data', icon: '📊' },
      { label: 'Analysis', icon: '🔍' },
      { label: 'Agent', icon: '🤖' },
    ],
  }),
  communityCookbook({
    id: 'ags-html-processing',
    title: 'HTML Processing - HTML 处理代理',
    category: 'agent',
    language: 'Python',
    description: 'Agent Sandbox HTML 处理示例，用于网页内容解析、清洗和结构化提取。',
    tags: ['Agent', 'HTML', 'Web Scraping'],
    estimatedTime: '15 分钟',
    source: { repo: 'TencentCloudAgentRuntime/ags-cookbook', path: 'examples/html-processing' },
    risk: {
      level: '低',
      cost: '通常只运行本地解析逻辑，不创建云资源。',
      resourceImpact: '处理 HTML 输入并生成结构化结果',
      notice: '执行前确认 HTML 来源和抓取合规性。',
    },
    relatedDocs: [
      { label: 'AI on TKE', href: '/ai-ml/' },
      { label: 'Data on TKE', href: '/data/data-processing/' },
    ],
    prompt:
      '请基于 HTML Processing Cookbook，读取示例 HTML 并抽取结构化数据，说明解析规则、输出字段和异常处理。',
    badge: 'NEW',
    icon: '📄',
    services: [
      { label: 'HTML', icon: '📄' },
      { label: 'Processing', icon: '⚙️' },
      { label: 'Agent', icon: '🤖' },
    ],
  }),
  communityCookbook({
    id: 'ags-mini-rl',
    title: 'Mini RL - 强化学习代理',
    category: 'agent',
    language: 'Python',
    description: 'Agent Sandbox Mini RL 示例，用于快速理解强化学习任务循环和训练流程。',
    tags: ['Agent', 'Reinforcement Learning', 'AI'],
    estimatedTime: '30 分钟',
    source: { repo: 'TencentCloudAgentRuntime/ags-cookbook', path: 'examples/mini-rl' },
    risk: {
      level: '中',
      cost: '可能消耗本地或远程算力，长时间训练会增加资源使用。',
      resourceImpact: '运行强化学习训练示例',
      notice: '执行前设置训练轮次和资源上限，避免长时间占用计算资源。',
    },
    relatedDocs: [
      { label: 'Training on TKE', href: '/ai-ml/training/' },
      { label: 'AI on TKE', href: '/ai-ml/' },
    ],
    prompt:
      '请基于 Mini RL Cookbook，在受控参数下运行强化学习示例，解释训练配置、观察指标和停止条件。',
    badge: 'HOT',
    icon: '🎯',
    services: [
      { label: 'RL', icon: '🎯' },
      { label: 'Training', icon: '🏋️' },
      { label: 'Agent', icon: '🤖' },
    ],
  }),
  communityCookbook({
    id: 'ags-mobile-use',
    title: 'Mobile Use - 移动端自动化代理',
    category: 'agent',
    language: 'Python',
    description: 'Agent Sandbox 移动端自动化示例，用于移动应用或移动页面的任务执行。',
    tags: ['Agent', 'Mobile', 'Automation'],
    estimatedTime: '25 分钟',
    source: { repo: 'TencentCloudAgentRuntime/ags-cookbook', path: 'examples/mobile-use' },
    risk: {
      level: '中',
      cost: '通常不创建云资源，但可能操作移动端会话或测试设备。',
      resourceImpact: '运行移动端自动化 Agent 示例',
      notice: '执行前确认测试账号、设备权限和不提交敏感操作。',
    },
    relatedDocs: [
      { label: 'AI on TKE', href: '/ai-ml/' },
      { label: 'TKE Skill 使用场景', href: '/ai-ml/ai-copilot/user-stories/' },
    ],
    prompt:
      '请基于 Mobile Use Cookbook，在测试账号和测试设备中运行移动自动化示例，说明操作边界、验证结果和清理方式。',
    badge: 'NEW',
    icon: '📱',
    services: [
      { label: 'Mobile', icon: '📱' },
      { label: 'Automation', icon: '⚡' },
      { label: 'Agent', icon: '🤖' },
    ],
  }),
  communityCookbook({
    id: 'ags-shop-assistant',
    title: 'Shop Assistant - 智能购物助手',
    category: 'agent',
    language: 'Python',
    description: 'Agent Sandbox 智能购物助手示例，用于理解任务规划、检索和交互式助手流程。',
    tags: ['Agent', 'E-commerce', 'Assistant'],
    estimatedTime: '20 分钟',
    source: { repo: 'TencentCloudAgentRuntime/ags-cookbook', path: 'examples/shop-assistant' },
    risk: {
      level: '中',
      cost: '通常不创建云资源，但可能访问外部电商页面或模拟购买流程。',
      resourceImpact: '运行购物助手 Agent 示例',
      notice: '只能使用测试账号和测试数据，不得提交真实订单或支付。',
    },
    relatedDocs: [
      { label: 'AI Copilot', href: '/ai-ml/ai-copilot/' },
      { label: 'TKE Skill 使用场景', href: '/ai-ml/ai-copilot/user-stories/' },
    ],
    prompt:
      '请基于 Shop Assistant Cookbook，使用测试数据运行购物助手示例。执行前说明不会提交真实订单，执行后输出任务轨迹和结果。',
    badge: 'NEW',
    icon: '🛒',
    services: [
      { label: 'Shopping', icon: '🛒' },
      { label: 'Assistant', icon: '💁' },
      { label: 'Agent', icon: '🤖' },
    ],
  }),
];

export function getCookbook(id) {
  return cookbooks.find((cookbook) => cookbook.id === id);
}
