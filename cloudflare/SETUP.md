# 小狐狸聊天：Cloudflare 免费版连接说明

## 当前连接状态

2026 年 10 月 6 日已完成账号授权、免费 Worker 部署和真实 AI 接口测试。后台地址是 `https://blair-portfolio-chat.suxun70.workers.dev/api/chat`，本地网页已配置为使用这个地址。公开网站仍需按现有 GitHub Pages 流程发布这次网页配置。

免费套餐已通过账号页面的每日 100,000 次请求额度确认。没有启用付费套餐。首次部署后，新地址的 HTTPS 需要短暂等待生效。

## 更换账号时的注册步骤

1. 打开 [Cloudflare 注册页面](https://dash.cloudflare.com/sign-up)，用自己的邮箱创建账号。
2. 到邮箱里打开验证邮件，完成验证，然后登录 Cloudflare。
3. 保持免费方案。这个聊天功能不需要转移作品集域名，也不需要升级付费方案或填写信用卡。
4. 注册完成后回到 Codex，告诉我「注册好了」。我会打开官方授权页面，你在浏览器中登录并确认授权即可。

不需要把密码、验证码或 API Token 发给我。若注册后看到添加域名的引导，可以先跳过；我们使用的是 Workers 服务。

## 连接后的效果

访客仍然点击原来的小狐狸聊天。后台用 Cloudflare 的免费 AI 回答作品集问题，外观和尾巴动画保持现状。若免费额度用完或 AI 暂时连不上，会显示带有 **Portfolio FAQ** 标记的预设作品集资料，不会自动转用付费服务。预设资料只能回答已整理的常见问题。

已连接的网页会优先请求真实 AI，失败时才显示预设问答。自动化测试使用模拟响应；首次上线另外验证了真实中英文 AI 回复。

## 授权后的操作记录

以下操作由 Codex 在项目中完成，无需你复制命令：

- 确认账号为 **Workers Free**，通过官方浏览器流程授权 Wrangler。
- 部署 `cloudflare/worker.js`，获得专属 `workers.dev` 地址。
- 用一个公开的作品集问题验证真实 AI 回复，再把验证过的地址填入网页配置。
- 在本地预览检查后，通过作品集现有发布流程更新网站。

网站继续由 GitHub Pages 提供，不需要改 DNS。Cloudflare 的 AI binding 在后台调用模型，不需要把任何密钥放进网页。

## 免费范围

根据 [Workers AI 官方说明](https://developers.cloudflare.com/workers-ai/platform/pricing/)，免费方案目前每天有 10,000 neurons 的 AI 使用额度；不同问题消耗不同，所以不能保证固定对话次数。另有 [Workers 免费请求额度](https://developers.cloudflare.com/workers/platform/pricing/)。保持 Workers Free，超出额度时请求会失败并触发预设问答；不要启用付费方案。

程序另外限制每次回复长度，并设定每个 IP 在每个 Cloudflare 接入地区每分钟最多 6 次请求。这用于减少滥用，不是全站费用上限。聊天内容、近期对话和选中的公开页面资料会在连接 AI 时交给 Cloudflare 处理；网页信息按钮中已说明。
