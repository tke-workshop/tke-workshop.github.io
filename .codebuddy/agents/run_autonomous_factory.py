"""主执行脚本 - 自主内容工厂"""

import os
import sys
from datetime import datetime

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from agents.topic_picker import TopicPicker
from agents.researcher import Researcher
from agents.writer import Writer
from agents.reviewer import Reviewer
from utils.github import GitHubClient
from utils.logger import logger
from utils.markdown import MarkdownProcessor
from utils.sidebar_updater import SidebarUpdater


class AutonomousContentFactory:
    """自主内容工厂"""
    
    def __init__(self, github_token: str = None, repo: str = None):
        """
        初始化内容工厂
        
        Args:
            github_token: GitHub Personal Access Token
            repo: 仓库格式: "owner/repo"
        """
        self.workspace = os.path.dirname(os.path.dirname(__file__))
        self.md_processor = MarkdownProcessor()
        self.sidebar_updater = SidebarUpdater()
        
        # 初始化 GitHub 客户端
        if github_token and repo:
            self.github = GitHubClient(github_token, repo)
        else:
            self.github = None
            logger.log_warning("GitHub client not initialized, PR creation will be skipped")
        
        # 初始化 Agents
        self.topic_picker = TopicPicker()
        self.researcher = Researcher()
        self.writer = Writer()
        self.reviewer = Reviewer()
    
    def daily_run(self) -> dict:
        """每日执行"""
        
        try:
            logger.log_info("=" * 60)
            logger.log_info("Autonomous Content Factory Started")
            logger.log_info("=" * 60)
            
            # 1. 选题
            logger.log_info("Step 1: Picking topic...")
            topic = self.topic_picker.pick_topic()
            
            # 2. 调研
            logger.log_info("Step 2: Conducting research...")
            research_report = self.researcher.research(topic)
            
            # 3. 创作
            logger.log_info("Step 3: Writing article...")
            article = self.writer.write(topic, research_report)
            
            # 4. 审核
            logger.log_info("Step 4: Reviewing article...")
            review_result = self.reviewer.review(article)
            
            if not review_result["approved"]:
                # 自动修复可修复的问题
                logger.log_info("Auto-fixing issues...")
                article = self.reviewer.auto_fix(article)
                
                # 重新审核
                review_result = self.reviewer.review(article)
            
            # 5. 提交（如果有 GitHub 客户端）
            if self.github:
                logger.log_info("Step 5: Creating PR...")
                pr_url = self.create_pr(topic, research_report, article, review_result)
            else:
                logger.log_warning("Skipping PR creation (GitHub client not initialized)")
                pr_url = None
            
            # 6. 生成总结报告
            summary = self._generate_summary(topic, research_report, article, review_result, pr_url)
            
            logger.log_info("=" * 60)
            logger.log_info("Autonomous Content Factory Completed Successfully")
            logger.log_info("=" * 60)
            
            return {
                "success": True,
                "topic": topic,
                "article": article,
                "review_result": review_result,
                "pr_url": pr_url,
                "summary": summary
            }
            
        except Exception as e:
            logger.log_error(e, "Daily run")
            logger.log_info("=" * 60)
            logger.log_info("Autonomous Content Factory Failed")
            logger.log_info("=" * 60)
            
            return {
                "success": False,
                "error": str(e)
            }
    
    def create_pr(
        self,
        topic: dict,
        research_report: dict,
        article: dict,
        review_result: dict
    ) -> str:
        """创建 GitHub PR"""
        
        try:
            # 1. 创建新分支
            branch_name = f"content/{datetime.now().strftime('%Y-%m-%d')}-{topic['slug']}"
            
            # 检查分支是否已存在
            existing_branches = self.github.list_branches()
            if branch_name in existing_branches:
                logger.log_warning(f"Branch {branch_name} already exists, skipping PR creation")
                return None
            
            if not self.github.create_branch(branch_name):
                logger.log_error(Exception("Failed to create branch"), "Create PR")
                return None
            
            # 2. 保存调研报告
            research_markdown = self.researcher.generate_report_markdown(research_report)
            research_path = f"tmp/research/{datetime.now().strftime('%Y-%m-%d')}-{topic['slug']}.md"
            
            if not self.github.commit_file(
                research_path,
                research_markdown,
                f"Add research report for {topic['title']}",
                branch_name
            ):
                logger.log_error(Exception("Failed to commit research report"), "Create PR")
                return None
            
            # 3. 保存文章
            article_path = f"docs/posts/{topic['date'][:4]}/{topic['slug']}.md"
            
            if not self.github.commit_file(
                article_path,
                article['content'],
                f"Add article: {topic['title']}",
                branch_name
            ):
                logger.log_error(Exception("Failed to commit article"), "Create PR")
                return None
            
            # 4. 更新索引
            index_path = "docs/posts/index.md"
            index_content = self.github.get_file_content(index_path, "main")
            
            if index_content is None:
                # 索引文件不存在，创建新的
                index_content = """# Blog Posts Index

## 📚 Latest Posts

"""
            
            # 添加新文章到索引
            new_entry = f"- [{article['title']}]({article_path}) - {topic['date']}\n"
            
            # 在 "Latest Posts" 后添加
            insert_pos = index_content.find("## 📚 Latest Posts")
            if insert_pos != -1:
                insert_pos += len("## 📚 Latest Posts\n")
                index_content = (
                    index_content[:insert_pos] +
                    new_entry +
                    index_content[insert_pos:]
                )
            
            if not self.github.commit_file(
                index_path,
                index_content,
                f"Update index for {topic['title']}",
                branch_name
            ):
                logger.log_error(Exception("Failed to update index"), "Create PR")
                return None
            
            # 5. 更新侧边栏
            logger.log_info("Updating sidebar...")
            sidebar_path = "docs/.vitepress/config.ts"
            sidebar_content = self.github.get_file_content(sidebar_path, "main")
            
            # 先初始化 files 列表
            files = [
                research_path,
                article_path,
                index_path
            ]

            if sidebar_content:
                # 更新侧边栏
                if self.sidebar_updater.update_sidebar(
                    topic['date'][:4],  # 年份
                    article['title'],   # 标题
                    topic['slug']      # slug
                ):
                    # 读取更新后的配置
                    with open(self.sidebar_updater.config_path, 'r', encoding='utf-8') as f:
                        updated_sidebar_content = f.read()
                    
                    # 提交更新后的侧边栏配置
                    if not self.github.commit_file(
                        sidebar_path,
                        updated_sidebar_content,
                        f"Update sidebar for {topic['title']}",
                        branch_name
                    ):
                        logger.log_error(Exception("Failed to update sidebar"), "Create PR")
                        return None
                    
                    files.append(sidebar_path)
                    logger.log_info("Sidebar updated successfully")
                else:
                    logger.log_warning("Sidebar update failed, but continuing...")
            
            pr_description = self.md_processor.create_pr_description(
                article,
                research_report,
                files
            )
            
            pr_title = f"✨ Article: {article['title']}"
            pr_url = self.github.create_pull_request(
                branch_name,
                "main",
                pr_title,
                pr_description
            )
            
            return pr_url
            
        except Exception as e:
            logger.log_error(e, "Create PR")
            return None
    
    def _generate_summary(
        self,
        topic: dict,
        research_report: dict,
        article: dict,
        review_result: dict,
        pr_url: str
    ) -> str:
        """生成总结报告"""
        
        summary = f"""
## 📝 内容生成总结

### 选题信息
- **标题**: {topic.get('title')}
- **类型**: {topic.get('type')}
- **优先级**: {topic.get('priority')}
- **日期**: {topic.get('date')}

### 调研信息
- **调研时间**: {research_report.get('date')}
- **竞品数量**: {len(research_report.get('competitors', []))}
- **用户类型**: {len(research_report.get('user_needs', {}).get('personas', {}))}

### 文章信息
- **字数**: {article.get('word_count')}
- **预估阅读时间**: {article.get('reading_time')} 分钟
- **标签**: {', '.join(article.get('tags', []))}

### 审核结果
- **是否通过**: {'✅ 通过' if review_result.get('approved') else '❌ 未通过'}

### PR 信息
- **PR URL**: {pr_url if pr_url else 'N/A'}

---
**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**生成方式**: 自主内容工厂 Agent 系统
"""
        return summary


def main():
    """主函数"""
    
    # 获取环境变量
    github_token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPO", "virgilliang/tke-workshop.github.io")
    
    # 创建内容工厂
    factory = AutonomousContentFactory(github_token, repo)
    
    # 执行每日流程
    result = factory.daily_run()
    
    # 输出总结
    if result.get("success"):
        print("\n" + "=" * 60)
        print(result.get("summary"))
        print("=" * 60)
    else:
        print(f"\nError: {result.get('error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
