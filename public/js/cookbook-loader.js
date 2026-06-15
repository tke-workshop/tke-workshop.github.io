/**
 * TKE Cookbook Loader
 * 核心功能:
 * 1. 从 GitHub 获取 README 内容
 * 2. 解析 Markdown 提取描述、架构、步骤
 * 3. 多级缓存机制 (LocalStorage + Static JSON)
 * 4. 自动批量加载和更新
 */

class CookbookLoader {
    constructor() {
        this.GITHUB_API_BASE = 'https://api.github.com';
        this.GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';
        this.CACHE_DURATION = 60 * 60 * 1000; // 1小时缓存
        this.CACHE_KEY = 'tke-cookbook-cache-v2';
        
        // 内存缓存
        this.memoryCache = new Map();
        
        // 加载状态
        this.loadingState = new Map();
    }

    /**
     * 批量加载所有 Cookbooks
     * @param {Array} cookbooks - Cookbook 配置数组
     * @returns {Promise<Array>} - 加载后的 Cookbook 数组
     */
    async loadAll(cookbooks) {
        console.log(`[CookbookLoader] 开始加载 ${cookbooks.length} 个 Cookbooks`);
        
        // 尝试从 LocalStorage 加载缓存
        const cached = this.loadFromLocalStorage();
        if (cached && cached.length === cookbooks.length) {
            console.log('[CookbookLoader] 使用缓存数据');
            return this.mergeCachedData(cookbooks, cached);
        }

        // 并行加载所有 README
        const promises = cookbooks.map(cookbook => this.loadOne(cookbook));
        const results = await Promise.all(promises);
        
        // 保存到 LocalStorage
        this.saveToLocalStorage(results);
        
        console.log(`[CookbookLoader] 加载完成: ${results.filter(c => c.loaded).length}/${results.length} 成功`);
        return results;
    }

    /**
     * 加载单个 Cookbook
     * @param {Object} cookbook - Cookbook 配置
     * @returns {Promise<Object>} - 加载后的 Cookbook
     */
    async loadOne(cookbook) {
        const cacheKey = this.getCacheKey(cookbook);
        
        // 检查内存缓存
        if (this.memoryCache.has(cacheKey)) {
            const cached = this.memoryCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
                console.log(`[CookbookLoader] 使用内存缓存: ${cookbook.id}`);
                const url = this.buildGitHubUrl(cookbook.github);
                return { ...cookbook, ...cached.data, url, loaded: true };
            }
        }

        // 检查是否正在加载
        if (this.loadingState.has(cacheKey)) {
            return this.loadingState.get(cacheKey);
        }

        // 开始加载
        const loadPromise = this.fetchFromGitHub(cookbook);
        this.loadingState.set(cacheKey, loadPromise);

        try {
            const result = await loadPromise;
            this.loadingState.delete(cacheKey);
            
            // 保存到内存缓存
            this.memoryCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            // 生成 GitHub URL
            const url = this.buildGitHubUrl(cookbook.github);
            
            return { ...cookbook, ...result, url, loaded: true };
        } catch (error) {
            this.loadingState.delete(cacheKey);
            console.error(`[CookbookLoader] 加载失败: ${cookbook.id}`, error);
            
            // 即使加载失败也生成 URL
            const url = this.buildGitHubUrl(cookbook.github);
            
            return {
                ...cookbook,
                description: '⚠️ 无法加载描述信息',
                readme: '',
                url,
                loaded: false,
                error: error.message
            };
        }
    }

    /**
     * 从 GitHub 获取 README
     * @param {Object} cookbook - Cookbook 配置
     * @returns {Promise<Object>} - 解析后的数据
     */
    async fetchFromGitHub(cookbook) {
        if (!cookbook.github) {
            throw new Error('Missing GitHub configuration');
        }

        const { repo, path, branch = 'main' } = cookbook.github;
        const readmePath = path ? `${path}/README.md` : 'README.md';
        const readmeUrl = `${this.GITHUB_RAW_BASE}/${repo}/${branch}/${readmePath}`;

        console.log(`[CookbookLoader] 获取 README: ${cookbook.id} - ${readmeUrl}`);

        const response = await fetch(readmeUrl);
        
        if (!response.ok) {
            // 尝试其他文件名
            const alternatives = ['readme.md', 'Readme.md', 'README.MD'];
            for (const alt of alternatives) {
                const altPath = path ? `${path}/${alt}` : alt;
                const altUrl = `${this.GITHUB_RAW_BASE}/${repo}/${branch}/${altPath}`;
                const altResponse = await fetch(altUrl);
                if (altResponse.ok) {
                    const markdown = await altResponse.text();
                    return this.parseMarkdown(markdown, cookbook);
                }
            }
            throw new Error(`README not found: ${readmeUrl}`);
        }

        const markdown = await response.text();
        return this.parseMarkdown(markdown, cookbook);
    }

    /**
     * 解析 Markdown 内容
     * @param {string} markdown - Markdown 原始文本
     * @param {Object} cookbook - Cookbook 配置
     * @returns {Object} - 解析结果
     */
    parseMarkdown(markdown, cookbook) {
        return {
            description: this.extractDescription(markdown),
            readme: markdown,
            steps: this.extractSteps(markdown),
            metadata: this.extractMetadata(markdown, cookbook)
        };
    }

    /**
     * 提取描述信息
     * @param {string} markdown - Markdown 文本
     * @returns {string} - 描述文本
     */
    extractDescription(markdown) {
        // 移除 YAML front matter
        let content = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');
        
        // 移除标题
        content = content.replace(/^#+\s+.*$/gm, '');
        
        // 移除代码块
        content = content.replace(/```[\s\S]*?```/g, '');
        
        // 移除行内代码
        content = content.replace(/`[^`]+`/g, '');
        
        // 移除 Markdown 链接，保留文本
        content = content.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        
        // 移除图片
        content = content.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
        
        // 移除 HTML 标签
        content = content.replace(/<[^>]+>/g, '');
        
        // 移除多余空行
        content = content.replace(/\n{3,}/g, '\n\n').trim();
        
        // 提取有效行
        const lines = content.split('\n').filter(line => line.trim().length > 20);
        let description = '';
        
        for (const line of lines) {
            description += line.trim() + ' ';
            if (description.length > 200) break;
        }
        
        description = description.substring(0, 200).trim();
        if (description.length === 200) {
            description += '...';
        }
        
        return description || '暂无描述信息';
    }

    /**
     * 提取分步指南
     * @param {string} markdown - Markdown 文本
     * @returns {Object} - 步骤对象 { setup, deploy, test, cleanup }
     */
    extractSteps(markdown) {
        const sections = {
            setup: [],
            deploy: [],
            test: [],
            cleanup: []
        };

        // 提取各个章节
        const patterns = {
            setup: /##\s*(Setup|安装|环境准备|Prerequisites|前置要求)([\s\S]*?)(?=##|$)/i,
            deploy: /##\s*(Deploy|部署|Usage|使用|Quick Start|快速开始)([\s\S]*?)(?=##|$)/i,
            test: /##\s*(Test|测试|Verify|验证|Validation)([\s\S]*?)(?=##|$)/i,
            cleanup: /##\s*(Cleanup|清理|Delete|删除|Clean Up)([\s\S]*?)(?=##|$)/i
        };

        Object.entries(patterns).forEach(([key, pattern]) => {
            const match = markdown.match(pattern);
            if (match) {
                sections[key] = this.parseStepSection(match[2]);
            }
        });

        return sections;
    }

    /**
     * 解析步骤章节
     * @param {string} sectionText - 章节文本
     * @returns {Array} - 步骤数组
     */
    parseStepSection(sectionText) {
        const steps = [];
        const codeBlocks = [];
        const regex = /```(?:bash|sh|python|yaml|go|javascript|json)?\n([\s\S]*?)```/g;
        let match;

        // 提取所有代码块
        while ((match = regex.exec(sectionText)) !== null) {
            codeBlocks.push({
                command: match[1].trim(),
                startIndex: match.index
            });
        }

        // 分割文本部分
        const textParts = sectionText.split(/```[\s\S]*?```/);

        codeBlocks.forEach((block, index) => {
            const description = textParts[index]?.trim() || '';
            
            // 提取标题
            const titleMatch = description.match(/###\s*(.*?)(?:\n|$)/) || 
                             description.match(/^(\d+[\.\)].*?)(?:\n|$)/) ||
                             description.match(/^\*\*([^*]+)\*\*/) ||
                             description.match(/^- \*\*([^*]+)\*\*/);
            
            const title = titleMatch ? titleMatch[1].trim() : `步骤 ${index + 1}`;
            const desc = description
                .replace(/###\s*.*?\n/, '')
                .replace(/^\d+[\.\)].*?\n/, '')
                .replace(/^\*\*[^*]+\*\*/, '')
                .replace(/^- \*\*[^*]+\*\*/, '')
                .trim()
                .substring(0, 200);

            steps.push({
                title: title.replace(/^\d+[\.\)]\s*/, ''),
                description: desc,
                command: block.command
            });
        });

        return steps;
    }

    /**
     * 提取元数据
     * @param {string} markdown - Markdown 文本
     * @param {Object} cookbook - Cookbook 配置
     * @returns {Object} - 元数据对象
     */
    extractMetadata(markdown, cookbook) {
        const metadata = {
            stars: null,
            lastUpdate: null,
            contributors: null
        };

        // 可以在这里添加更多元数据提取逻辑
        // 例如: 通过 GitHub API 获取星标数、更新时间等

        return metadata;
    }

    /**
     * 从 LocalStorage 加载缓存
     * @returns {Array|null} - 缓存的 Cookbooks 或 null
     */
    loadFromLocalStorage() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;

            const data = JSON.parse(cached);
            if (!data.timestamp || Date.now() - data.timestamp > this.CACHE_DURATION) {
                console.log('[CookbookLoader] LocalStorage 缓存已过期');
                localStorage.removeItem(this.CACHE_KEY);
                return null;
            }

            return data.cookbooks;
        } catch (error) {
            console.error('[CookbookLoader] 读取 LocalStorage 失败:', error);
            return null;
        }
    }

    /**
     * 保存到 LocalStorage
     * @param {Array} cookbooks - Cookbooks 数组
     */
    saveToLocalStorage(cookbooks) {
        try {
            const data = {
                timestamp: Date.now(),
                cookbooks: cookbooks
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
            console.log('[CookbookLoader] 已保存到 LocalStorage');
        } catch (error) {
            console.error('[CookbookLoader] 保存 LocalStorage 失败:', error);
        }
    }

    /**
     * 合并缓存数据
     * @param {Array} cookbooks - 原始配置
     * @param {Array} cached - 缓存数据
     * @returns {Array} - 合并后的数据
     */
    mergeCachedData(cookbooks, cached) {
        const cachedMap = new Map(cached.map(c => [c.id, c]));
        
        return cookbooks.map(cookbook => {
            const cachedData = cachedMap.get(cookbook.id);
            if (cachedData) {
                return { ...cookbook, ...cachedData, loaded: true };
            }
            return { ...cookbook, loaded: false };
        });
    }

    /**
     * 清除所有缓存
     */
    clearCache() {
        this.memoryCache.clear();
        localStorage.removeItem(this.CACHE_KEY);
        console.log('[CookbookLoader] 缓存已清除');
    }

    /**
     * 获取缓存键
     * @param {Object} cookbook - Cookbook 配置
     * @returns {string} - 缓存键
     */
    getCacheKey(cookbook) {
        const { repo, path, branch = 'main' } = cookbook.github;
        return `${repo}/${path || ''}/${branch}`;
    }

    /**
     * 构建 GitHub URL
     * @param {Object} github - GitHub 配置对象
     * @returns {string} - GitHub 仓库 URL
     */
    buildGitHubUrl(github) {
        const { repo, path, branch = 'main' } = github;
        const baseUrl = `https://github.com/${repo}`;
        
        if (path) {
            return `${baseUrl}/tree/${branch}/${path}`;
        }
        return baseUrl;
    }

    /**
     * 获取 GitHub 项目元数据 (通过 API)
     * @param {string} repo - 仓库路径
     * @returns {Promise<Object>} - 元数据
     */
    async fetchGitHubMetadata(repo) {
        try {
            const apiUrl = `${this.GITHUB_API_BASE}/repos/${repo}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const data = await response.json();
            return {
                stars: data.stargazers_count,
                lastUpdate: data.updated_at,
                description: data.description,
                language: data.language
            };
        } catch (error) {
            console.error(`[CookbookLoader] 获取元数据失败: ${repo}`, error);
            return null;
        }
    }
}

// 导出为全局变量
if (typeof window !== 'undefined') {
    window.CookbookLoader = CookbookLoader;
}

// Node.js 环境导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CookbookLoader;
}
