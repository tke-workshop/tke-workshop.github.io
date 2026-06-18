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
          items: [{ autogenerate: { directory: 'ai-ml', collapsed: true } }],
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
