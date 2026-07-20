const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.site-nav');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    nav.classList.toggle('is-open', !isOpen);
  });
}

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const intakeForm = document.querySelector('#intake-form');
const intakeResult = document.querySelector('#intake-result');

if (intakeForm && intakeResult) {
  const requestedPlan = new URLSearchParams(window.location.search).get('plan');
  const planMap = {
    audit: '快速上线体检',
    fix: '安全体检＋关键修复',
    rescue: '上线救援包',
    monthly: '月度安全维护',
  };
  if (planMap[requestedPlan]) intakeForm.elements.plan.value = planMap[requestedPlan];

  intakeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(intakeForm);
    const summary = [
      'Vibe Security 项目咨询',
      `项目名称：${values.get('project')}`,
      `项目网址：${values.get('url') || '未提供'}`,
      `技术栈：${values.get('stack')}`,
      `AI 编程工具：${values.get('aiTool') || '未提供'}`,
      `期望套餐：${values.get('plan')}`,
      `计划上线时间：${values.get('deadline') || '未确定'}`,
      `重点问题：${values.get('concerns') || '未填写'}`,
    ].join('\n');
    intakeResult.querySelector('pre').textContent = summary;
    const emailLink = intakeResult.querySelector('[data-email-summary]');
    emailLink.href = `mailto:huangheteng555@gmail.com?subject=${encodeURIComponent(`Vibe Security 项目咨询：${values.get('project')}`)}&body=${encodeURIComponent(summary)}`;
    intakeResult.hidden = false;
    intakeResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  intakeResult.querySelector('[data-copy-summary]').addEventListener('click', async (event) => {
    const text = intakeResult.querySelector('pre').textContent;
    try {
      await navigator.clipboard.writeText(text);
      event.currentTarget.textContent = '已复制';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(intakeResult.querySelector('pre'));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      event.currentTarget.textContent = '请手动复制选中内容';
    }
  });
}
