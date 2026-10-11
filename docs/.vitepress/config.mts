import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'MossyMC',
  description: 'MossyMC 玩法文档',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,
  // 自定义域名 www.mossymc.top，base 设为 '/'
  base: '/',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: '运维', link: '/ops/' },
      { text: '规则', link: '/rules' },
      { text: 'FAQ', link: '/faq' },
      { text: '功能合集', link: '/tools.html' },
      { text: '经典版', link: '/site/index.html' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '新手入门', link: '/guide/getting-started' },
            { text: '核心玩法', link: '/guide/gameplay' },
            { text: '数据包新内容', link: '/guide/datapacks' },
            { text: '世界生成跑图', link: '/guide/datapacks-worldgen' },
            { text: '常用命令', link: '/guide/commands' }
          ]
        }
      ],
      '/ops/': [
        {
          text: '运维文档',
          items: [
            { text: '总览', link: '/ops/' },
            { text: '服务器概况', link: '/ops/01-服务器概况' },
            { text: '启动与 JVM', link: '/ops/02-启动与JVM' },
            { text: '更新日志', link: '/ops/03-更新日志' },
            { text: '配置系统', link: '/ops/04-配置系统' },
            { text: '世界与多世界', link: '/ops/05-世界与多世界' },
            { text: '数据包手册', link: '/ops/06-数据包手册' },
            { text: '插件手册', link: '/ops/07-插件手册' },
            { text: '备份与恢复', link: '/ops/08-备份与恢复' },
            { text: '性能优化记录', link: '/ops/09-性能优化记录' },
            { text: '故障排查', link: '/ops/10-故障排查与已知问题' },
            { text: '运维操作规程', link: '/ops/11-运维操作规程' }
          ]
        }
      ],
      '/rules': [
        {
          text: '参考',
          items: [
            { text: '服务器规则', link: '/rules' },
            { text: '常见问题', link: '/faq' }
          ]
        }
      ]
    },

    footer: {
      message: '© 2026 MossyMC',
      copyright: '苔生方块，致敬无限创造'
    },

    outline: { label: '本页目录' },
    lastUpdated: { text: '最后更新' },
    docFooter: { prev: '上一页', next: '下一页' },
    darkModeSwitchLabel: '主题',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    langMenuLabel: '语言',

    socialLinks: [
      { icon: 'github', link: 'https://github.com/' }
    ]
  }
})
