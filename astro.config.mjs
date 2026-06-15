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
        baseUrl: 'https://github.com/tke-workshop/tke-workshop.github.io/edit/main/src/content/docs/',
      },
      customCss: ['./src/styles/workshop.css'],
      sidebar: [
        {
          label: 'Start',
          items: [
            { label: 'Workshop 概览', slug: 'start' },
            { label: '环境准备', slug: 'start/environment' },
          ],
        },
        {
          label: 'Operate',
          items: [{ label: '基础操作路径', slug: 'operate' }],
        },
        {
          label: 'Practice',
          items: [{ label: '生产实践路径', slug: 'practice' }],
        },
        {
          label: 'AI on TKE',
          items: [{ label: 'AI 工作负载路径', slug: 'ai-on-tke' }],
        },
        {
          label: 'Contribute',
          items: [{ label: '贡献与 Agent-First 规范', slug: 'contribute' }],
        },
      ],
    }),
  ],
});
