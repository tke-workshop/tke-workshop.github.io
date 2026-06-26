import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://tke-workshop.github.io',
  integrations: [
    starlight({
      title: 'TKE Workshop',
      description: '面向 TKE 云原生实践的学习路径、操作指南和可执行 Cookbook。',
      defaultLocale: 'root',
      locales: {
        root: {
          label: '简体中文',
          lang: 'zh-CN',
        },
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/tke-workshop/tke-workshop.github.io',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/tke-workshop/tke-workshop.github.io/edit/main/',
      },
      components: {
        Header: './src/components/WorkshopHeader.astro',
        Sidebar: './src/components/WorkshopSidebar.astro',
      },
      customCss: ['./src/styles/workshop.css'],
      sidebar: [
        {
          label: 'Start',
          collapsed: true,
          items: [
            { label: 'Workshop 概览', slug: 'start' },
            { label: '环境准备', slug: 'start/environment' },
          ],
        },
        {
          label: '基础操作',
          collapsed: true,
          items: [
            { label: '基础操作概览', slug: 'basics' },
            {
              label: '集群管理',
              collapsed: true,
              items: [
                { label: '创建 TKE 集群', slug: 'basics/cluster/01-create-cluster' },
                { label: '删除 TKE 集群', slug: 'basics/cluster/02-delete-cluster' },
                { label: '查询 TKE 集群列表', slug: 'basics/cluster/04-describe-clusters' },
              ],
            },
            {
              label: '节点管理',
              collapsed: true,
              items: [
                {
                  label: '节点',
                  collapsed: true,
                  items: [
                    { label: '添加节点', slug: 'basics/node/01-add-node' },
                    { label: '删除节点', slug: 'basics/node/02-delete-node' },
                    { label: '维护节点', slug: 'basics/node/03-maintain-node' },
                    { label: '查询节点列表', slug: 'basics/node/04-describe-nodes' },
                  ],
                },
                {
                  label: '节点池',
                  collapsed: true,
                  items: [
                    { label: '节点池概览', slug: 'basics/node-pool' },
                    { label: '创建节点池', slug: 'basics/node-pool/01-create-node-pool' },
                    { label: '扩缩节点池', slug: 'basics/node-pool/02-scale-node-pool' },
                    { label: '查询节点池', slug: 'basics/node-pool/03-describe-node-pool' },
                    { label: '删除节点池', slug: 'basics/node-pool/04-delete-node-pool' },
                  ],
                },
                {
                  label: '原生节点',
                  collapsed: true,
                  items: [
                    { label: '原生节点概览', slug: 'basics/native-node' },
                    { label: '创建原生节点池', slug: 'basics/native-node/01-create-native-node-pool' },
                    { label: '扩缩原生节点池', slug: 'basics/native-node/02-scale-native-node-pool' },
                    { label: '管理原生节点', slug: 'basics/native-node/03-manage-native-node' },
                  ],
                },
                {
                  label: '超级节点',
                  collapsed: true,
                  items: [
                    { label: '创建超级节点池', slug: 'basics/supernode/01-create-supernode-pool' },
                    { label: '创建按量超级节点', slug: 'basics/supernode/02-create-supernode' },
                    { label: '删除超级节点', slug: 'basics/supernode/03-delete-supernode' },
                  ],
                },
              ],
            },
            {
              label: 'Kubernetes 对象操作',
              collapsed: true,
              items: [
                { label: '对象操作概览', slug: 'basics/kubernetes' },
                { label: '连接集群', slug: 'basics/kubernetes/01-connect-cluster' },
                { label: '常用 kubectl 命令操作', slug: 'basics/kubernetes/02-kubectl-common-operations' },
              ],
            },
            {
              label: '网络',
              collapsed: true,
              items: [
                { label: '网络概览', slug: 'networking' },
                {
                  label: 'Service',
                  collapsed: true,
                  items: [
                    { label: 'Service 概览', slug: 'networking/service' },
                    { label: 'Service 类型', slug: 'networking/service/01-service-types' },
                    { label: 'LoadBalancer Service', slug: 'networking/service/02-loadbalancer-service' },
                  ],
                },
                {
                  label: 'Ingress',
                  collapsed: true,
                  items: [
                    { label: 'Ingress 概览', slug: 'networking/ingress' },
                    { label: 'CLB Ingress', slug: 'networking/ingress/01-clb-ingress' },
                  ],
                },
                {
                  label: 'NetworkPolicy',
                  collapsed: true,
                  items: [
                    { label: 'NetworkPolicy 概览', slug: 'networking/network-policy' },
                    { label: '命名空间隔离', slug: 'networking/network-policy/01-namespace-isolation' },
                  ],
                },
                { label: 'VPC-CNI', slug: 'networking/vpc-cni' },
                {
                  label: '网络排障',
                  collapsed: true,
                  items: [
                    { label: '网络排障概览', slug: 'networking/troubleshooting' },
                    { label: 'Service 连通性排障', slug: 'networking/troubleshooting/01-service-connectivity' },
                  ],
                },
              ],
            },
            {
              label: '存储',
              collapsed: true,
              items: [
                { label: '存储概览', slug: 'storage' },
                { label: '存储基础概念', slug: 'storage/01-storage-concepts' },
                {
                  label: 'CBS 云硬盘',
                  collapsed: true,
                  items: [
                    { label: 'CBS 概览', slug: 'storage/cbs' },
                    { label: '动态创建 CBS PVC', slug: 'storage/cbs/01-dynamic-cbs-pvc' },
                    { label: '使用已有 CBS', slug: 'storage/cbs/02-static-cbs-pv' },
                    { label: '扩容 CBS PVC', slug: 'storage/cbs/03-expand-cbs-volume' },
                  ],
                },
                {
                  label: 'CFS 文件存储',
                  collapsed: true,
                  items: [
                    { label: 'CFS 概览', slug: 'storage/cfs' },
                    { label: '使用 CFS PVC', slug: 'storage/cfs/01-cfs-pvc' },
                    { label: 'CFS 共享卷', slug: 'storage/cfs/02-cfs-shared-volume' },
                  ],
                },
                {
                  label: 'COS 对象存储',
                  collapsed: true,
                  items: [
                    { label: 'COS 概览', slug: 'storage/cos' },
                    { label: '挂载 COS', slug: 'storage/cos/01-mount-cos' },
                    { label: 'COS Secret 与权限', slug: 'storage/cos/02-cos-secret-and-permission' },
                  ],
                },
                {
                  label: '存储排障',
                  collapsed: true,
                  items: [
                    { label: '存储排障概览', slug: 'storage/troubleshooting' },
                    { label: 'PVC Pending', slug: 'storage/troubleshooting/01-pvc-pending' },
                    { label: 'VolumeMount 失败', slug: 'storage/troubleshooting/02-volume-mount-failed' },
                    { label: '存储性能问题', slug: 'storage/troubleshooting/03-storage-performance' },
                  ],
                },
              ],
            },
            {
              label: '运维监控',
              collapsed: true,
              items: [
                { label: '运维监控概览', slug: 'observability' },
                { label: '集群监控', slug: 'observability/01-cluster-monitoring' },
                { label: '工作负载监控', slug: 'observability/02-workload-monitoring' },
                { label: '日志采集', slug: 'observability/03-log-collection' },
                { label: '事件与审计', slug: 'observability/04-event-and-audit' },
                { label: '告警配置', slug: 'observability/05-alerting' },
                { label: '故障看板', slug: 'observability/06-troubleshooting-dashboard' },
              ],
            },
          ],
        },
        {
          label: '最佳实践',
          collapsed: true,
          items: [{ autogenerate: { directory: 'best-practices', collapsed: true } }],
        },
        {
          label: 'AI on TKE',
          collapsed: true,
          items: [
            { label: 'AI on TKE 概览', slug: 'ai-ml' },
            {
              label: 'Training on TKE',
              collapsed: true,
              items: [
                { label: '训练概览', slug: 'ai-ml/training' },
                { label: 'GPU 调度', slug: 'ai-ml/training/gpu-scheduling' },
                { label: '超级节点 GPU', slug: 'ai-ml/training/supernode-gpu' },
                { label: '分布式训练', slug: 'ai-ml/training/distributed-training' },
                { label: 'Training Operator', slug: 'ai-ml/training/training-operator' },
                { label: '存储优化', slug: 'ai-ml/training/storage-optimization' },
                { label: '监控调优', slug: 'ai-ml/training/monitoring' },
              ],
            },
            {
              label: 'Inference on TKE',
              collapsed: true,
              items: [
                { label: '推理概览', slug: 'ai-ml/inference' },
                { label: '推理框架', slug: 'ai-ml/inference/inference-frameworks' },
                { label: '服务部署', slug: 'ai-ml/inference/service-deployment' },
                { label: 'LLM 推理', slug: 'ai-ml/inference/llm-inference' },
                { label: '自动扩缩容', slug: 'ai-ml/inference/autoscaling' },
                { label: '性能优化', slug: 'ai-ml/inference/performance' },
                { label: '模型管理', slug: 'ai-ml/inference/model-management' },
              ],
            },
            {
              label: 'OpenClaw on TKE',
              collapsed: true,
              items: [
                { label: 'OpenClaw 概览', slug: 'ai-ml/openclaw' },
                { label: '架构设计', slug: 'ai-ml/openclaw/architecture' },
                { label: '快速开始', slug: 'ai-ml/openclaw/quickstart' },
                { label: '弹性伸缩', slug: 'ai-ml/openclaw/elasticity' },
                { label: '网络方案', slug: 'ai-ml/openclaw/networking' },
                { label: '生产部署', slug: 'ai-ml/openclaw/production' },
                { label: '安全隔离', slug: 'ai-ml/openclaw/security' },
                { label: '存储方案', slug: 'ai-ml/openclaw/storage' },
              ],
            },
            {
              label: 'OPEA on TKE',
              collapsed: true,
              items: [
                { label: 'OPEA 概览', slug: 'ai-ml/opea' },
                { label: '快速开始', slug: 'ai-ml/opea/quickstart' },
                { label: 'ChatQnA 部署', slug: 'ai-ml/opea/chatqna-deployment' },
              ],
            },
            {
              label: 'KitOps on TKE',
              collapsed: true,
              items: [
                { label: 'KitOps 概览', slug: 'ai-ml/kitops' },
                { label: '快速开始', slug: 'ai-ml/kitops/quickstart' },
                { label: 'Kitfile 指南', slug: 'ai-ml/kitops/kitfile-guide' },
                { label: 'TCR 集成', slug: 'ai-ml/kitops/tcr-integration' },
                { label: 'TKE 部署', slug: 'ai-ml/kitops/tke-deployment' },
                { label: 'CI/CD 集成', slug: 'ai-ml/kitops/cicd-integration' },
                { label: '最佳实践', slug: 'ai-ml/kitops/best-practices' },
              ],
            },
            {
              label: 'TKE with AI Copilot',
              collapsed: true,
              items: [
                { label: 'AI Copilot 概览', slug: 'ai-ml/ai-copilot' },
                { label: 'TKE Skill', slug: 'ai-ml/ai-copilot/tke-skill' },
                { label: '使用场景指南', slug: 'ai-ml/ai-copilot/user-stories' },
              ],
            },
            {
              label: 'Cube Agent Sandbox',
              collapsed: true,
              items: [
                { label: 'TKE Cube Agent Sandbox', slug: 'ai-ml/cube' },
                { label: '产品介绍', slug: 'ai-ml/cube/01-overview' },
                { label: '快速开始', slug: 'ai-ml/cube/02-quick-start' },
                { label: '生命周期管理', slug: 'ai-ml/cube/03-lifecycle-management' },
                { label: '存储配置', slug: 'ai-ml/cube/04-storage' },
                { label: '网络配置', slug: 'ai-ml/cube/05-network' },
                { label: '可观测性', slug: 'ai-ml/cube/06-observability' },
                { label: '生产配置建议', slug: 'ai-ml/cube/07-best-practices' },
                { label: 'FAQ', slug: 'ai-ml/cube/08-faq' },
                {
                  label: '场景实践',
                  collapsed: true,
                  items: [
                    { label: '构建 AI Coding 执行环境', slug: 'ai-ml/cube/scenarios/01-ai-coding-sandbox' },
                    { label: '构建常驻型 Cloud Agent 工作空间', slug: 'ai-ml/cube/scenarios/02-cloud-agent-workspace' },
                    {
                      label: '在自有 TKE 集群中交付 Agent Platform 执行面',
                      slug: 'ai-ml/cube/scenarios/03-agent-platform-byoc',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Data on TKE',
          collapsed: true,
          items: [{ autogenerate: { directory: 'data', collapsed: true } }],
        },
        {
          label: 'Workshop Paths',
          collapsed: true,
          items: [
            { label: '基础操作路径', slug: 'operate' },
            { label: '生产实践路径', slug: 'practice' },
            { label: 'AI 工作负载路径', slug: 'ai-on-tke' },
          ],
        },
        {
          label: 'Contribute',
          collapsed: true,
          items: [{ label: '贡献与 Agent-First 规范', slug: 'contribute' }],
        },
      ],
    }),
  ],
});
