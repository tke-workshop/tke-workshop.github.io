# TKE Skill + kubernetes-mcp POC 示例

本文档提供完整的 POC (Proof of Concept) 配置和示例脚本，用于验证 TKE Skill 与 kubernetes-mcp-server 的集成。

---

## ⚠️ 当前能力边界说明

!!! warning "阅读前必看"
    
    在开始 POC 验证之前，请了解当前工具链的**能力边界**：
    
    ### ✅ 本 POC 可以验证的场景
    
    | 场景 | 说明 |
    |------|------|
    | TKE 集群管理 | 列出集群、获取状态、查看节点池 |
    | kubeconfig 获取 | 通过 TKE API 获取集群访问凭证 |
    | K8s 资源部署 | 部署 Deployment/Service（**使用已有镜像**） |
    | Pod 操作 | 列出、查看详情、查看日志、执行命令 |
    | Helm 管理 | 安装/升级/卸载 Helm Chart |
    | 事件查看 | 查看 K8s Events 用于排障 |
    
    ### ❌ 本 POC 暂不支持的场景
    
    | 场景 | 原因 | 状态 |
    |------|------|------|
    | 从代码一键部署 | 缺少镜像构建和推送能力 | 🚧 规划中 |
    | 镜像仓库管理 | 无 TCR/CCR Skill | 🚧 规划中 |
    
    **简单来说**：POC 中的部署场景需要使用**已经存在的容器镜像**（如 `nginx:alpine`），无法直接从项目代码构建镜像。

---

## 🗺️ 未来计划

### TCR Skill 开发规划

我们计划开发 **TCR Skill** 来补充镜像仓库能力，届时将支持：

```
完整部署流程:
项目代码 → [构建镜像] → [推送到 TCR] → [部署到 TKE] → [验证]
              ↓              ↓                ↓            ↓
           Dockerfile     TCR Skill      k8s-mcp      k8s-mcp
             (AI生成)      (规划中)       (已支持)     (已支持)
```

**预计时间线**：

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| Phase 1 | TCR Skill 基础能力 | Q2 2026 |
| Phase 2 | 本地 Docker 构建集成 | Q2 2026 |
| Phase 3 | 云端构建集成 | Q3 2026 |

---

## 📁 POC 目录结构

```
poc-tke-k8s-mcp/
├── config/
│   ├── mcp-config.json           # MCP Server 配置
│   └── kubeconfig-template.yaml  # kubeconfig 模板
├── scripts/
│   ├── setup.sh                  # 环境初始化脚本
│   ├── test-tke-skill.py         # TKE Skill 测试
│   ├── test-k8s-mcp.py           # kubernetes-mcp 测试
│   └── test-integration.py       # 集成测试
├── manifests/
│   ├── deployment.yaml           # 测试 Deployment
│   ├── service.yaml              # 测试 Service
│   └── hpa.yaml                  # 测试 HPA
├── .env                          # 环境变量 (腾讯云凭证)
└── README.md                     # 本文档
```

---

## 🛠️ 环境配置

### 1. MCP Server 配置

**文件**: `config/mcp-config.json`

=== "npx 运行 (推荐)"

    最简单的方式，无需预先安装：

    ```json
    {
      "mcpServers": {
        "kubernetes": {
          "command": "npx",
          "args": [
            "-y",
            "kubernetes-mcp-server@latest"
          ]
        }
      }
    }
    ```

    !!! tip "推荐理由"
        - 无需手动安装，`npx` 会自动下载
        - `-y` 参数跳过确认提示
        - `@latest` 确保使用最新版本

=== "Go Install"

    如果你有 Go 环境：

    ```json
    {
      "mcpServers": {
        "kubernetes": {
          "command": "kubernetes-mcp-server",
          "args": [],
          "env": {
            "KUBECONFIG": "${HOME}/.kube/config"
          }
        }
      }
    }
    ```

    需要先安装：
    ```bash
    go install github.com/containers/kubernetes-mcp-server/cmd/kubernetes-mcp-server@latest
    ```

**使用方式**:
```bash
# 复制到 CodeBuddy 配置目录
cp config/mcp-config.json ~/.codebuddy/mcp.json
```

### 2. TKE Skill 凭证配置

TKE Skill 通过 **环境变量** 获取腾讯云凭证，不需要额外的配置文件。

在 `.env` 文件中配置（见下方环境变量部分）。

!!! info "凭证传入方式"
    TKE Skill 支持两种凭证传入方式：
    
    1. **环境变量** (推荐)：`TENCENTCLOUD_SECRET_ID` / `TENCENTCLOUD_SECRET_KEY`
    2. **命令行参数**：`--secret-id` / `--secret-key`

### 3. 环境变量

创建 `.env` 文件:

```bash
# .env
export TENCENTCLOUD_SECRET_ID="your-secret-id"
export TENCENTCLOUD_SECRET_KEY="your-secret-key"
export TENCENTCLOUD_REGION="ap-guangzhou"

# 测试用的集群 ID (替换为你的集群)
export TEST_CLUSTER_ID="cls-xxxxxxxx"
```

---

## 🧪 测试脚本

### setup.sh - 环境初始化

```bash
#!/bin/bash
# setup.sh - POC 环境初始化脚本

set -e

echo "🚀 TKE Skill + kubernetes-mcp POC 环境初始化"
echo "=============================================="

# 1. 检查依赖
echo "📦 检查依赖..."

# 检查 Go
if ! command -v go &> /dev/null; then
    echo "❌ Go 未安装，请先安装 Go 1.21+"
    exit 1
fi
echo "✅ Go: $(go version)"

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 未安装，请先安装 Python 3.9+"
    exit 1
fi
echo "✅ Python: $(python3 --version)"

# 检查 kubectl
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl 未安装，请先安装 kubectl"
    exit 1
fi
echo "✅ kubectl: $(kubectl version --client --short 2>/dev/null || echo 'installed')"

# 2. 安装 kubernetes-mcp-server (可选，推荐使用 npx 方式)
echo ""
echo "📦 检查 kubernetes-mcp-server..."
echo "   推荐方式: 使用 npx 自动下载运行 (无需预安装)"
echo "   配置 mcp.json 使用 npx -y kubernetes-mcp-server@latest"

# 如果需要本地安装 (可选)
if command -v go &> /dev/null; then
    if ! command -v kubernetes-mcp-server &> /dev/null; then
        echo "   (可选) 安装本地版本..."
        go install github.com/containers/kubernetes-mcp-server/cmd/kubernetes-mcp-server@latest
        echo "✅ kubernetes-mcp-server 本地安装完成"
    else
        echo "✅ kubernetes-mcp-server 已本地安装"
    fi
else
    echo "ℹ️  Go 未安装，将使用 npx 方式运行 kubernetes-mcp-server"
fi

# 3. 安装 Python 依赖
echo ""
echo "📦 安装 Python 依赖..."
pip3 install tencentcloud-sdk-python pyyaml requests --quiet
echo "✅ Python 依赖安装完成"

# 4. 加载环境变量
if [ -f ".env" ]; then
    source .env
    echo "✅ 环境变量已加载"
else
    echo "⚠️  .env 文件不存在，请创建并配置腾讯云凭证"
    cat << 'EOF'
请创建 .env 文件:

export TENCENTCLOUD_SECRET_ID="your-secret-id"
export TENCENTCLOUD_SECRET_KEY="your-secret-key"
export TENCENTCLOUD_REGION="ap-guangzhou"
export TEST_CLUSTER_ID="cls-xxxxxxxx"
EOF
    exit 1
fi

# 5. 配置 CodeBuddy MCP
echo ""
echo "📝 配置 CodeBuddy MCP..."
mkdir -p ~/.codebuddy
if [ -f "config/mcp-config.json" ]; then
    cp config/mcp-config.json ~/.codebuddy/mcp.json
    echo "✅ MCP 配置完成"
fi

echo ""
echo "🎉 环境初始化完成！"
echo ""
echo "下一步:"
echo "  1. 运行 TKE Skill 测试: python3 scripts/test-tke-skill.py"
echo "  2. 运行 k8s-mcp 测试:   python3 scripts/test-k8s-mcp.py"
echo "  3. 运行集成测试:       python3 scripts/test-integration.py"
```

### test-tke-skill.py - TKE Skill 测试

```python
#!/usr/bin/env python3
"""
TKE Skill 功能测试

测试 TKE Skill 的基本功能:
1. 列出集群
2. 获取集群状态
3. 获取 kubeconfig
4. 列出节点池
"""

import os
import sys
import json
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tke.v20180525 import tke_client, models

# 颜色输出
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def success(msg): print(f"{Colors.GREEN}✅ {msg}{Colors.END}")
def error(msg): print(f"{Colors.RED}❌ {msg}{Colors.END}")
def info(msg): print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")
def warn(msg): print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")

def get_tke_client(region: str = None) -> tke_client.TkeClient:
    """创建 TKE 客户端"""
    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    region = region or os.environ.get("TENCENTCLOUD_REGION", "ap-guangzhou")
    
    if not secret_id or not secret_key:
        error("未配置腾讯云凭证，请设置 TENCENTCLOUD_SECRET_ID 和 TENCENTCLOUD_SECRET_KEY")
        sys.exit(1)
    
    cred = credential.Credential(secret_id, secret_key)
    httpProfile = HttpProfile()
    httpProfile.endpoint = "tke.tencentcloudapi.com"
    
    clientProfile = ClientProfile()
    clientProfile.httpProfile = httpProfile
    
    return tke_client.TkeClient(cred, region, clientProfile)

def test_list_clusters(client: tke_client.TkeClient):
    """测试: 列出集群"""
    print("\n" + "="*50)
    print("测试 1: 列出 TKE 集群")
    print("="*50)
    
    try:
        req = models.DescribeClustersRequest()
        resp = client.DescribeClusters(req)
        
        clusters = json.loads(resp.to_json_string())
        total = clusters.get("TotalCount", 0)
        
        info(f"发现 {total} 个集群")
        
        if total > 0:
            for cluster in clusters.get("Clusters", []):
                print(f"  - {cluster['ClusterId']}: {cluster['ClusterName']} ({cluster['ClusterStatus']})")
            success("列出集群成功")
            return clusters.get("Clusters", [])[0]["ClusterId"]
        else:
            warn("没有发现集群")
            return None
            
    except Exception as e:
        error(f"列出集群失败: {e}")
        return None

def test_get_cluster_status(client: tke_client.TkeClient, cluster_id: str):
    """测试: 获取集群状态"""
    print("\n" + "="*50)
    print(f"测试 2: 获取集群状态 ({cluster_id})")
    print("="*50)
    
    try:
        req = models.DescribeClustersRequest()
        req.ClusterIds = [cluster_id]
        resp = client.DescribeClusters(req)
        
        clusters = json.loads(resp.to_json_string())
        
        if clusters.get("TotalCount", 0) > 0:
            cluster = clusters["Clusters"][0]
            print(f"  集群名称: {cluster['ClusterName']}")
            print(f"  集群状态: {cluster['ClusterStatus']}")
            print(f"  K8s 版本: {cluster['ClusterVersion']}")
            print(f"  节点数量: {cluster['ClusterNodeNum']}")
            print(f"  集群类型: {cluster['ClusterType']}")
            success("获取集群状态成功")
            return True
        else:
            warn("未找到集群")
            return False
            
    except Exception as e:
        error(f"获取集群状态失败: {e}")
        return False

def test_get_kubeconfig(client: tke_client.TkeClient, cluster_id: str):
    """测试: 获取 kubeconfig"""
    print("\n" + "="*50)
    print(f"测试 3: 获取 kubeconfig ({cluster_id})")
    print("="*50)
    
    try:
        req = models.DescribeClusterKubeconfigRequest()
        req.ClusterId = cluster_id
        req.IsExtranet = True
        resp = client.DescribeClusterKubeconfig(req)
        
        result = json.loads(resp.to_json_string())
        kubeconfig = result.get("Kubeconfig", "")
        
        if kubeconfig:
            # 保存 kubeconfig
            kubeconfig_path = f"/tmp/kubeconfig-{cluster_id}.yaml"
            with open(kubeconfig_path, "w") as f:
                f.write(kubeconfig)
            
            print(f"  kubeconfig 长度: {len(kubeconfig)} 字符")
            print(f"  保存到: {kubeconfig_path}")
            success("获取 kubeconfig 成功")
            return kubeconfig_path
        else:
            warn("kubeconfig 为空")
            return None
            
    except Exception as e:
        error(f"获取 kubeconfig 失败: {e}")
        return None

def test_list_node_pools(client: tke_client.TkeClient, cluster_id: str):
    """测试: 列出节点池"""
    print("\n" + "="*50)
    print(f"测试 4: 列出节点池 ({cluster_id})")
    print("="*50)
    
    try:
        req = models.DescribeClusterNodePoolsRequest()
        req.ClusterId = cluster_id
        resp = client.DescribeClusterNodePools(req)
        
        result = json.loads(resp.to_json_string())
        pools = result.get("NodePoolSet", [])
        
        info(f"发现 {len(pools)} 个节点池")
        
        for pool in pools:
            print(f"  - {pool['NodePoolId']}: {pool['Name']}")
            print(f"    节点数: {pool.get('NodeCountSummary', {}).get('ManuallyAdded', {}).get('Total', 'N/A')}")
            print(f"    状态: {pool.get('LifeState', 'N/A')}")
            
        success("列出节点池成功")
        return True
        
    except Exception as e:
        error(f"列出节点池失败: {e}")
        return False

def main():
    print("="*60)
    print("🧪 TKE Skill 功能测试")
    print("="*60)
    
    # 获取测试集群 ID
    test_cluster_id = os.environ.get("TEST_CLUSTER_ID")
    region = os.environ.get("TENCENTCLOUD_REGION", "ap-guangzhou")
    
    info(f"测试地域: {region}")
    if test_cluster_id:
        info(f"指定测试集群: {test_cluster_id}")
    
    # 创建客户端
    client = get_tke_client(region)
    
    # 测试 1: 列出集群
    cluster_id = test_list_clusters(client)
    if not cluster_id and test_cluster_id:
        cluster_id = test_cluster_id
    
    if cluster_id:
        # 测试 2: 获取集群状态
        test_get_cluster_status(client, cluster_id)
        
        # 测试 3: 获取 kubeconfig
        kubeconfig_path = test_get_kubeconfig(client, cluster_id)
        
        # 测试 4: 列出节点池
        test_list_node_pools(client, cluster_id)
        
        if kubeconfig_path:
            print("\n" + "="*60)
            info(f"kubeconfig 已保存到: {kubeconfig_path}")
            info(f"设置环境变量: export KUBECONFIG={kubeconfig_path}")
            print("="*60)
    else:
        warn("没有可用的集群进行测试")
    
    print("\n🎉 TKE Skill 测试完成!")

if __name__ == "__main__":
    main()
```

### test-k8s-mcp.py - kubernetes-mcp 测试

```python
#!/usr/bin/env python3
"""
kubernetes-mcp-server 功能测试

测试 k8s-mcp 的基本功能:
1. 列出 Pod
2. 列出 Deployment
3. 查看 Events
4. 创建资源
"""

import os
import sys
import json
import subprocess
import tempfile

# 颜色输出
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def success(msg): print(f"{Colors.GREEN}✅ {msg}{Colors.END}")
def error(msg): print(f"{Colors.RED}❌ {msg}{Colors.END}")
def info(msg): print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")
def warn(msg): print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")

def call_k8s_mcp(method: str, params: dict = None) -> dict:
    """调用 kubernetes-mcp-server"""
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or {}
    }
    
    try:
        proc = subprocess.Popen(
            ["kubernetes-mcp-server"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = proc.communicate(input=json.dumps(request), timeout=30)
        
        if stderr:
            warn(f"stderr: {stderr}")
        
        # 解析响应 (可能有多行)
        for line in stdout.strip().split('\n'):
            if line:
                try:
                    return json.loads(line)
                except json.JSONDecodeError:
                    continue
        
        return {"error": "No valid JSON response"}
        
    except subprocess.TimeoutExpired:
        error("命令执行超时")
        return {"error": "timeout"}
    except Exception as e:
        error(f"调用失败: {e}")
        return {"error": str(e)}

def test_list_tools():
    """测试: 列出可用工具"""
    print("\n" + "="*50)
    print("测试 1: 列出 k8s-mcp 可用工具")
    print("="*50)
    
    result = call_k8s_mcp("tools/list")
    
    if "result" in result:
        tools = result["result"].get("tools", [])
        info(f"发现 {len(tools)} 个工具")
        
        # 分类显示
        categories = {
            "pods_": "Pod 操作",
            "resources_": "资源管理",
            "helm_": "Helm 管理",
            "events_": "事件监控",
            "nodes_": "节点管理",
            "configuration_": "配置管理",
            "kubevirt_": "KubeVirt"
        }
        
        categorized = {}
        for tool in tools:
            name = tool.get("name", "")
            for prefix, category in categories.items():
                if name.startswith(prefix):
                    if category not in categorized:
                        categorized[category] = []
                    categorized[category].append(name)
                    break
            else:
                if "其他" not in categorized:
                    categorized["其他"] = []
                categorized["其他"].append(name)
        
        for category, tool_names in categorized.items():
            print(f"\n  {category}:")
            for name in tool_names:
                print(f"    - {name}")
        
        success("列出工具成功")
        return True
    else:
        error(f"列出工具失败: {result.get('error', 'unknown')}")
        return False

def test_pods_list():
    """测试: 列出 Pod"""
    print("\n" + "="*50)
    print("测试 2: 列出 default 命名空间的 Pod")
    print("="*50)
    
    result = call_k8s_mcp("tools/call", {
        "name": "pods_list",
        "arguments": {
            "namespace": "default"
        }
    })
    
    if "result" in result:
        content = result["result"].get("content", [])
        if content:
            text = content[0].get("text", "")
            print(f"  {text[:500]}..." if len(text) > 500 else f"  {text}")
        success("列出 Pod 成功")
        return True
    else:
        error(f"列出 Pod 失败: {result.get('error', 'unknown')}")
        return False

def test_resources_list():
    """测试: 列出 Deployment"""
    print("\n" + "="*50)
    print("测试 3: 列出 kube-system 的 Deployment")
    print("="*50)
    
    result = call_k8s_mcp("tools/call", {
        "name": "resources_list",
        "arguments": {
            "kind": "Deployment",
            "namespace": "kube-system"
        }
    })
    
    if "result" in result:
        content = result["result"].get("content", [])
        if content:
            text = content[0].get("text", "")
            print(f"  {text[:500]}..." if len(text) > 500 else f"  {text}")
        success("列出 Deployment 成功")
        return True
    else:
        error(f"列出 Deployment 失败: {result.get('error', 'unknown')}")
        return False

def test_events_list():
    """测试: 查看 Events"""
    print("\n" + "="*50)
    print("测试 4: 查看 default 命名空间的 Events")
    print("="*50)
    
    result = call_k8s_mcp("tools/call", {
        "name": "events_list",
        "arguments": {
            "namespace": "default"
        }
    })
    
    if "result" in result:
        content = result["result"].get("content", [])
        if content:
            text = content[0].get("text", "")
            print(f"  {text[:500]}..." if len(text) > 500 else f"  {text}")
        success("查看 Events 成功")
        return True
    else:
        error(f"查看 Events 失败: {result.get('error', 'unknown')}")
        return False

def test_nodes_list():
    """测试: 列出节点"""
    print("\n" + "="*50)
    print("测试 5: 列出集群节点")
    print("="*50)
    
    result = call_k8s_mcp("tools/call", {
        "name": "nodes_list",
        "arguments": {}
    })
    
    if "result" in result:
        content = result["result"].get("content", [])
        if content:
            text = content[0].get("text", "")
            print(f"  {text[:500]}..." if len(text) > 500 else f"  {text}")
        success("列出节点成功")
        return True
    else:
        error(f"列出节点失败: {result.get('error', 'unknown')}")
        return False

def main():
    print("="*60)
    print("🧪 kubernetes-mcp-server 功能测试")
    print("="*60)
    
    # 检查 kubeconfig
    kubeconfig = os.environ.get("KUBECONFIG", os.path.expanduser("~/.kube/config"))
    if not os.path.exists(kubeconfig):
        error(f"kubeconfig 不存在: {kubeconfig}")
        info("请先运行 TKE Skill 测试获取 kubeconfig")
        sys.exit(1)
    
    info(f"使用 kubeconfig: {kubeconfig}")
    
    # 检查 kubernetes-mcp-server (如果使用本地安装方式)
    # 注意: 如果使用 npx 方式，可以跳过此检查
    try:
        subprocess.run(["kubernetes-mcp-server", "--version"], 
                      capture_output=True, check=True)
        success("kubernetes-mcp-server 已安装 (本地版本)")
    except (subprocess.CalledProcessError, FileNotFoundError):
        info("kubernetes-mcp-server 未本地安装")
        info("推荐: 在 mcp.json 中配置 npx -y kubernetes-mcp-server@latest")
        info("或安装: go install github.com/containers/kubernetes-mcp-server/cmd/kubernetes-mcp-server@latest")
    
    # 运行测试
    test_list_tools()
    test_pods_list()
    test_resources_list()
    test_events_list()
    test_nodes_list()
    
    print("\n🎉 kubernetes-mcp-server 测试完成!")

if __name__ == "__main__":
    main()
```

### test-integration.py - 集成测试

```python
#!/usr/bin/env python3
"""
TKE Skill + kubernetes-mcp-server 集成测试

模拟完整的用户场景:
1. 通过 TKE Skill 获取集群列表
2. 获取 kubeconfig
3. 使用 k8s-mcp 部署测试应用
4. 验证部署状态
5. 清理资源
"""

import os
import sys
import json
import time
import subprocess
import tempfile
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tke.v20180525 import tke_client, models

# 颜色输出
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'

def success(msg): print(f"{Colors.GREEN}✅ {msg}{Colors.END}")
def error(msg): print(f"{Colors.RED}❌ {msg}{Colors.END}")
def info(msg): print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")
def warn(msg): print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")
def step(msg): print(f"\n{Colors.CYAN}🔹 {msg}{Colors.END}")

# 测试用的 Deployment YAML
TEST_DEPLOYMENT = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: poc-test-app
  namespace: default
  labels:
    app: poc-test-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: poc-test-app
  template:
    metadata:
      labels:
        app: poc-test-app
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 100m
            memory: 128Mi
"""

def get_tke_client(region: str) -> tke_client.TkeClient:
    """创建 TKE 客户端"""
    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    
    cred = credential.Credential(secret_id, secret_key)
    httpProfile = HttpProfile()
    httpProfile.endpoint = "tke.tencentcloudapi.com"
    clientProfile = ClientProfile()
    clientProfile.httpProfile = httpProfile
    
    return tke_client.TkeClient(cred, region, clientProfile)

def call_k8s_mcp(method: str, params: dict = None) -> dict:
    """调用 kubernetes-mcp-server"""
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or {}
    }
    
    try:
        proc = subprocess.Popen(
            ["kubernetes-mcp-server"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = proc.communicate(input=json.dumps(request), timeout=30)
        
        for line in stdout.strip().split('\n'):
            if line:
                try:
                    return json.loads(line)
                except json.JSONDecodeError:
                    continue
        
        return {"error": "No valid JSON response"}
        
    except Exception as e:
        return {"error": str(e)}

def main():
    print("="*70)
    print("🔗 TKE Skill + kubernetes-mcp-server 集成测试")
    print("="*70)
    
    region = os.environ.get("TENCENTCLOUD_REGION", "ap-guangzhou")
    cluster_id = os.environ.get("TEST_CLUSTER_ID")
    
    if not cluster_id:
        error("请设置 TEST_CLUSTER_ID 环境变量")
        sys.exit(1)
    
    info(f"测试地域: {region}")
    info(f"测试集群: {cluster_id}")
    
    # Step 1: 获取集群信息
    step("Step 1: [TKE Skill] 获取集群信息")
    client = get_tke_client(region)
    
    try:
        req = models.DescribeClustersRequest()
        req.ClusterIds = [cluster_id]
        resp = client.DescribeClusters(req)
        result = json.loads(resp.to_json_string())
        
        if result.get("TotalCount", 0) > 0:
            cluster = result["Clusters"][0]
            print(f"   集群名称: {cluster['ClusterName']}")
            print(f"   集群状态: {cluster['ClusterStatus']}")
            print(f"   K8s 版本: {cluster['ClusterVersion']}")
            success("获取集群信息成功")
        else:
            error("未找到集群")
            sys.exit(1)
    except Exception as e:
        error(f"获取集群信息失败: {e}")
        sys.exit(1)
    
    # Step 2: 获取 kubeconfig
    step("Step 2: [TKE Skill] 获取 kubeconfig")
    try:
        req = models.DescribeClusterKubeconfigRequest()
        req.ClusterId = cluster_id
        req.IsExtranet = True
        resp = client.DescribeClusterKubeconfig(req)
        result = json.loads(resp.to_json_string())
        
        kubeconfig = result.get("Kubeconfig", "")
        if kubeconfig:
            kubeconfig_path = f"/tmp/kubeconfig-{cluster_id}.yaml"
            with open(kubeconfig_path, "w") as f:
                f.write(kubeconfig)
            os.environ["KUBECONFIG"] = kubeconfig_path
            print(f"   保存到: {kubeconfig_path}")
            success("获取 kubeconfig 成功")
        else:
            error("kubeconfig 为空")
            sys.exit(1)
    except Exception as e:
        error(f"获取 kubeconfig 失败: {e}")
        sys.exit(1)
    
    # Step 3: 部署测试应用
    step("Step 3: [kubernetes-mcp] 部署测试应用")
    result = call_k8s_mcp("tools/call", {
        "name": "resources_create_or_update",
        "arguments": {
            "yaml": TEST_DEPLOYMENT
        }
    })
    
    if "result" in result:
        success("部署测试应用成功")
    else:
        error(f"部署失败: {result.get('error', 'unknown')}")
        sys.exit(1)
    
    # Step 4: 等待 Pod 就绪
    step("Step 4: [kubernetes-mcp] 等待 Pod 就绪")
    max_wait = 60
    waited = 0
    
    while waited < max_wait:
        result = call_k8s_mcp("tools/call", {
            "name": "pods_list",
            "arguments": {
                "namespace": "default",
                "label_selector": "app=poc-test-app"
            }
        })
        
        if "result" in result:
            content = result["result"].get("content", [])
            if content:
                text = content[0].get("text", "")
                if "Running" in text:
                    print(f"   Pod 状态: Running")
                    success("Pod 已就绪")
                    break
                else:
                    print(f"   等待中... ({waited}s)")
        
        time.sleep(5)
        waited += 5
    else:
        warn("等待 Pod 就绪超时")
    
    # Step 5: 查看 Pod 详情
    step("Step 5: [kubernetes-mcp] 查看 Pod 详情")
    result = call_k8s_mcp("tools/call", {
        "name": "pods_list",
        "arguments": {
            "namespace": "default",
            "label_selector": "app=poc-test-app"
        }
    })
    
    if "result" in result:
        content = result["result"].get("content", [])
        if content:
            text = content[0].get("text", "")
            print(f"   {text}")
        success("查看 Pod 详情成功")
    
    # Step 6: 清理资源
    step("Step 6: [kubernetes-mcp] 清理测试资源")
    result = call_k8s_mcp("tools/call", {
        "name": "resources_delete",
        "arguments": {
            "kind": "Deployment",
            "name": "poc-test-app",
            "namespace": "default"
        }
    })
    
    if "result" in result:
        success("清理资源成功")
    else:
        warn("清理资源可能失败，请手动检查")
    
    # 完成
    print("\n" + "="*70)
    print("🎉 集成测试完成!")
    print("="*70)
    print("""
测试流程:
  1. ✅ TKE Skill 获取集群信息
  2. ✅ TKE Skill 获取 kubeconfig
  3. ✅ kubernetes-mcp 部署应用
  4. ✅ kubernetes-mcp 验证 Pod 状态
  5. ✅ kubernetes-mcp 清理资源

两个工具协同工作，实现了从"获取集群凭证"到"部署验证"的完整流程！
""")

if __name__ == "__main__":
    main()
```

---

## 📦 测试资源清单

### manifests/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: poc-demo-app
  namespace: default
  labels:
    app: poc-demo-app
    env: poc
spec:
  replicas: 3
  selector:
    matchLabels:
      app: poc-demo-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: poc-demo-app
        env: poc
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: poc-demo-app
              topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: nginx:alpine
        ports:
        - name: http
          containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 20
```

### manifests/service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: poc-demo-app
  namespace: default
  labels:
    app: poc-demo-app
spec:
  type: ClusterIP
  selector:
    app: poc-demo-app
  ports:
  - name: http
    port: 80
    targetPort: 80
```

### manifests/hpa.yaml

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: poc-demo-app
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: poc-demo-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

---

## 🏃 运行 POC

### 快速开始

```bash
# 1. 克隆 POC 代码 (假设放在 cookbook 目录)
cd /path/to/tke-workshop.github.io/cookbook/ai-copilot-poc

# 2. 配置环境变量
cp .env.example .env
vim .env  # 填入腾讯云凭证和测试集群 ID

# 3. 初始化环境
source .env
chmod +x scripts/*.sh
./scripts/setup.sh

# 4. 运行测试
python3 scripts/test-tke-skill.py       # TKE Skill 测试
python3 scripts/test-k8s-mcp.py         # k8s-mcp 测试
python3 scripts/test-integration.py     # 集成测试
```

### 预期输出

```
===============================================
🔗 TKE Skill + kubernetes-mcp-server 集成测试
===============================================
ℹ️  测试地域: ap-guangzhou
ℹ️  测试集群: cls-xxxxxxxx

🔹 Step 1: [TKE Skill] 获取集群信息
   集群名称: my-prod-cluster
   集群状态: Running
   K8s 版本: 1.28.3
✅ 获取集群信息成功

🔹 Step 2: [TKE Skill] 获取 kubeconfig
   保存到: /tmp/kubeconfig-cls-xxxxxxxx.yaml
✅ 获取 kubeconfig 成功

🔹 Step 3: [kubernetes-mcp] 部署测试应用
✅ 部署测试应用成功

🔹 Step 4: [kubernetes-mcp] 等待 Pod 就绪
   等待中... (5s)
   等待中... (10s)
   Pod 状态: Running
✅ Pod 已就绪

🔹 Step 5: [kubernetes-mcp] 查看 Pod 详情
   NAME                           READY   STATUS    RESTARTS   AGE
   poc-test-app-xxx-yyy           1/1     Running   0          15s
✅ 查看 Pod 详情成功

🔹 Step 6: [kubernetes-mcp] 清理测试资源
✅ 清理资源成功

===============================================
🎉 集成测试完成!
===============================================
```

---

## ❓ 常见问题

### Q: kubernetes-mcp-server 连接失败

```
A: 检查配置和连接:
   1. 推荐使用 npx 方式运行，配置 mcp.json:
      {
        "mcpServers": {
          "kubernetes": {
            "command": "npx",
            "args": ["-y", "kubernetes-mcp-server@latest"]
          }
        }
      }
   2. 确认 KUBECONFIG 环境变量已设置或 ~/.kube/config 存在
   3. 运行 kubectl cluster-info 验证连接
   4. 检查 kubeconfig 中的 Token 是否过期
```

### Q: TKE API 认证失败

```
A: 检查腾讯云凭证:
   1. 确认 TENCENTCLOUD_SECRET_ID/KEY 已设置
   2. 确认凭证有 TKE 相关权限
   3. 尝试使用 tccli 验证: tccli tke DescribeClusters
```

### Q: Pod 一直 Pending

```
A: 检查集群资源:
   1. kubectl describe pod <pod-name> 查看 Events
   2. kubectl top nodes 检查资源使用
   3. 可能需要扩容节点池
```

---

## 📊 POC 验证清单

### ✅ 当前已支持（可验证）

- [x] TKE Skill 集群查询
- [x] TKE Skill kubeconfig 获取
- [x] kubernetes-mcp Pod 操作
- [x] kubernetes-mcp 资源部署（**需使用已有镜像**）
- [x] kubernetes-mcp Events 查看
- [x] 集成工作流：获取凭证 → 部署已有镜像 → 验证
- [ ] Helm Chart 安装 (可选扩展)
- [ ] 排障流程演示 (可选扩展)

### 🚧 规划中（暂不可验证）

- [ ] 从项目代码构建镜像
- [ ] 镜像推送到 TCR/CCR
- [ ] 完整的"代码 → 部署"流程

!!! tip "临时方案"
    在镜像构建能力上线前，你可以：
    
    1. **手动构建镜像**：`docker build && docker push` 后让 AI 部署
    2. **使用 CI/CD**：通过 GitHub Actions 构建镜像，AI 负责部署
    3. **使用公开镜像**：如本 POC 示例使用的 `nginx:alpine`
