/**
 * TKE Cookbook Collection - 数据配置文件
 * 所有 Cookbook 都从 GitHub 仓库获取内容
 * 
 * 配置说明:
 * - id: 唯一标识符 (必须)
 * - title: 显示标题
 * - category: 分类 (cluster, workload, gpu, networking, storage, testing)
 * - language: 编程语言
 * - tags: 标签数组
 * - github: GitHub 仓库配置 (必须)
 *   - repo: 仓库路径 'owner/repo-name'
 *   - path: 子目录路径 (可选)
 *   - branch: 分支名 (默认 main)
 * - services: 架构图服务节点 (用于详情页展示)
 * - estimatedTime: 预计完成时间
 * - verified: 是否经过官方验证
 * - badge: 状态徽章 (NEW, HOT, UPDATED)
 */

const cookbookConfig = [
    // ========== TKE Workshop 官方 Cookbooks ==========
    {
        id: 'create-cluster',
        title: '创建 TKE 托管集群',
        category: 'cluster',
        language: 'Python',
        tags: ['TKE API', 'VPC', 'Managed'],
        github: {
            repo: 'tke-workshop/tke-workshop.github.io',
            path: 'cookbook/cluster',
            branch: 'main'
        },
        services: [
            { label: 'Python SDK', icon: '🐍' },
            { label: 'TKE API', icon: '☁️' },
            { label: 'K8s 集群', icon: '🚢' }
        ],
        estimatedTime: '15 分钟',
        verified: true,
        icon: '🚀'
    },
    {
        id: 'deploy-nginx',
        title: '部署 Nginx 应用',
        category: 'workload',
        language: 'Python',
        tags: ['K8s', 'LB', 'Health Check'],
        github: {
            repo: 'tke-workshop/tke-workshop.github.io',
            path: 'cookbook/workload',
            branch: 'main'
        },
        services: [
            { label: 'kubectl', icon: '⚙️' },
            { label: 'Deployment', icon: '📦' },
            { label: 'LoadBalancer', icon: '🔀' }
        ],
        estimatedTime: '10 分钟',
        verified: true,
        icon: '🌐'
    },
    {
        id: 'deploy-gpu-pod',
        title: '部署 GPU 工作负载',
        category: 'gpu',
        language: 'Python',
        tags: ['GPU', 'AI/ML', 'SuperNode'],
        github: {
            repo: 'tke-workshop/tke-workshop.github.io',
            path: 'cookbook/supernode',
            branch: 'main'
        },
        services: [
            { label: 'SuperNode', icon: '🚀' },
            { label: 'GPU Pod', icon: '🎮' },
            { label: 'AI Training', icon: '🤖' }
        ],
        estimatedTime: '20 分钟',
        verified: true,
        icon: '🎮'
    },

    // ========== TKEStack Playbook 社区 Cookbooks ==========
    {
        id: 'tke-ai-playbook',
        title: 'TKE AI Playbook',
        category: 'gpu',
        language: 'YAML',
        tags: ['AI/ML', 'GPU', 'Training'],
        github: {
            repo: 'tkestack/tke-ai-playbook',
            branch: 'main'
        },
        services: [
            { label: 'AI Workload', icon: '🤖' },
            { label: 'TKE', icon: '☁️' },
            { label: 'GPU Cluster', icon: '⚡' }
        ],
        estimatedTime: '30 分钟',
        verified: true,
        icon: '🤖',
        badge: 'HOT'
    },
    {
        id: 'tke-chaos-playbook',
        title: 'TKE Chaos Engineering',
        category: 'testing',
        language: 'YAML',
        tags: ['Chaos', 'Fault Injection', 'Resilience'],
        github: {
            repo: 'tkestack/tke-chaos-playbook',
            branch: 'main'
        },
        services: [
            { label: 'ChaosMesh', icon: '⚙️' },
            { label: 'Fault Injection', icon: '💥' },
            { label: 'Testing', icon: '🧪' }
        ],
        estimatedTime: '25 分钟',
        verified: true,
        icon: '⚙️'
    },
    {
        id: 'tke-direct-upgrade',
        title: 'TKE 直接升级',
        category: 'cluster',
        language: 'Bash',
        tags: ['Upgrade', 'Migration', 'Version'],
        github: {
            repo: 'tkestack/tke-playbook',
            path: 'tke-direct-upgrade',
            branch: 'main'
        },
        services: [
            { label: 'TKE v1.x', icon: '📦' },
            { label: 'Upgrade', icon: '🔄' },
            { label: 'TKE v2.x', icon: '🚀' }
        ],
        estimatedTime: '20 分钟',
        verified: true,
        icon: '🔄'
    },
    {
        id: 'tke-get-client-ip',
        title: 'TKE 获取客户端 IP',
        category: 'networking',
        language: 'YAML',
        tags: ['Network', 'Client IP', 'LoadBalancer'],
        github: {
            repo: 'tkestack/tke-playbook',
            path: 'tke-get-client-ip',
            branch: 'main'
        },
        services: [
            { label: 'Client', icon: '👤' },
            { label: 'LoadBalancer', icon: '🔀' },
            { label: 'Service', icon: '🌐' }
        ],
        estimatedTime: '15 分钟',
        verified: true,
        icon: '🌐'
    },
    {
        id: 'tke-hybrid-node-architecture',
        title: 'TKE 混合节点架构',
        category: 'cluster',
        language: 'YAML',
        tags: ['Hybrid', 'Node', 'Multi-Arch'],
        github: {
            repo: 'tkestack/tke-playbook',
            path: 'tke-hybrid-node-architecture',
            branch: 'main'
        },
        services: [
            { label: 'x86 Node', icon: '💻' },
            { label: 'ARM Node', icon: '📱' },
            { label: 'Hybrid Cluster', icon: '🔗' }
        ],
        estimatedTime: '25 分钟',
        verified: true,
        icon: '🔗',
        badge: 'NEW'
    },
    {
        id: 'tke-karpenter',
        title: 'TKE Karpenter 弹性伸缩',
        category: 'cluster',
        language: 'YAML',
        tags: ['Karpenter', 'Autoscaling', 'Node'],
        github: {
            repo: 'tkestack/tke-playbook',
            path: 'tke-karpenter',
            branch: 'main'
        },
        services: [
            { label: 'Karpenter', icon: '⚡' },
            { label: 'Auto Scaling', icon: '📈' },
            { label: 'Node Pool', icon: '🌊' }
        ],
        estimatedTime: '30 分钟',
        verified: true,
        icon: '⚡',
        badge: 'HOT'
    },
    {
        id: 'tke-terraform-examples',
        title: 'TKE Terraform IaC 示例',
        category: 'cluster',
        language: 'Terraform',
        tags: ['Terraform', 'IaC', 'Automation'],
        github: {
            repo: 'tkestack/tke-playbook',
            path: 'tke-terraform-examples',
            branch: 'main'
        },
        services: [
            { label: 'Terraform', icon: '🏗️' },
            { label: 'TKE API', icon: '☁️' },
            { label: 'Infrastructure', icon: '🌐' }
        ],
        estimatedTime: '20 分钟',
        verified: true,
        icon: '🏗️'
    },
    {
        id: 'tke-to-community-ingress',
        title: 'TKE 迁移到社区 Ingress',
        category: 'networking',
        language: 'YAML',
        tags: ['Ingress', 'Migration', 'Community'],
        github: {
            repo: 'tkestack/tke-playbook',
            path: 'tke-to-community-ingress',
            branch: 'main'
        },
        services: [
            { label: 'TKE Ingress', icon: '🚪' },
            { label: 'Migration', icon: '🔄' },
            { label: 'Nginx Ingress', icon: '🌐' }
        ],
        estimatedTime: '25 分钟',
        verified: true,
        icon: '🔄'
    }
];

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = cookbookConfig;
}
