// ==================== 配置区（替换为你自己的 Supabase 信息） ====================
const SUPABASE_URL = 'https://sfyvfogcrgeirgvagxlp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_D6GCgwBE5lWJknLprmfLLQ_IG1q4oUW';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== 应用状态 ====================
let currentMode = '理性';
let budgetContext = '';
let baziContext = '';
let tarotContext = '';
let mbtiContext = '';
let zodiacContext = '';
let recipientType = '';

const activeTags = { budget: false, bazi: false, tarot: false, mbti: false, zodiac: false };
let isBudgetAsked = false;

// ==================== 登录逻辑 ====================
document.getElementById('login-btn').addEventListener('click', async () => {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) { alert('登录失败，请重试'); return; }
  document.getElementById('auth-status').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  setTimeout(() => greetAndAskBudget(), 500);
});

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    document.getElementById('auth-status').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    setTimeout(() => greetAndAskBudget(), 500);
  }
});

// ==================== AI 主动询问预算 ====================
async function greetAndAskBudget() {
  if (isBudgetAsked) return;
  isBudgetAsked = true;
  appendMessage('系统', '你好！我是礼物顾问🎁 在开始之前，请告诉我你大概的预算范围？（例如：100-300元、500以内、不限）');
}

// ==================== 送礼对象选择 ====================
document.getElementById('recipient-select').addEventListener('change', function() {
  recipientType = this.value;
  if (recipientType) {
    appendMessage('系统', `已设置送礼对象：${recipientType}`);
    updateTags();
  }
});

// ==================== 标签显示管理 ====================
function updateTags() {
  const container = document.getElementById('active-tags');
  container.innerHTML = '';
  const tags = [];
  if (recipientType) tags.push({ key: 'recipient', label: `🎯 ${recipientType}`, clear: () => { recipientType = ''; document.getElementById('recipient-select').value = ''; } });
  if (activeTags.budget && budgetContext) tags.push({ key: 'budget', label: `💰 ${budgetContext}`, clear: () => { budgetContext = ''; activeTags.budget = false; } });
  if (activeTags.bazi && baziContext) tags.push({ key: 'bazi', label: `📅 生辰`, clear: () => { baziContext = ''; activeTags.bazi = false; } });
  if (activeTags.tarot && tarotContext) tags.push({ key: 'tarot', label: `✨ 塔罗`, clear: () => { tarotContext = ''; activeTags.tarot = false; } });
  if (activeTags.mbti && mbtiContext) tags.push({ key: 'mbti', label: `🧩 ${mbtiContext}`, clear: () => { mbtiContext = ''; activeTags.mbti = false; } });
  if (activeTags.zodiac && zodiacContext) tags.push({ key: 'zodiac', label: `♈ ${zodiacContext}`, clear: () => { zodiacContext = ''; activeTags.zodiac = false; } });

  tags.forEach(tag => {
    const el = document.createElement('span');
    el.className = 'tag';
    el.innerHTML = `${tag.label} <button>✕</button>`;
    el.querySelector('button').addEventListener('click', () => { tag.clear(); updateTags(); });
    container.appendChild(el);
  });
}

// ==================== 调用 AI 接口 ====================
async function askAI(userMessage) {
  let fullMessage = userMessage;
  if (recipientType) fullMessage = `【送礼对象】${recipientType} ` + fullMessage;
  if (activeTags.budget && budgetContext) fullMessage = `【预算范围】${budgetContext} ` + fullMessage;
  if (activeTags.bazi && baziContext) fullMessage = `【生辰喜用神参考】${baziContext} ` + fullMessage;
  if (activeTags.tarot && tarotContext) fullMessage = `【塔罗启示】${tarotContext} ` + fullMessage;
  if (activeTags.mbti && mbtiContext) fullMessage = `【MBTI类型】${mbtiContext} ` + fullMessage;
  if (activeTags.zodiac && zodiacContext) fullMessage = `【星座】${zodiacContext} ` + fullMessage;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ask-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ message: fullMessage, mode: currentMode })
    });
    if (!response.ok) throw new Error('AI 服务不可用');
    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error(error);
    return '抱歉，礼物顾问暂时走神了，请稍后再试。';
  }
}

// ==================== UI 辅助函数 ====================
function appendMessage(role, text) {
  const chatBox = document.getElementById('chat-box');
  const div = document.createElement('div');
  let cls = 'system-message';
  if (role === '你') cls = 'user-message';
  else if (role === 'AI') cls = 'ai-message';
  div.className = `message ${cls}`;
  div.innerHTML = `<strong>${role}：</strong> ${text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==================== 发送消息（含预算自动识别） ====================
document.getElementById('send-btn').addEventListener('click', async () => {
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  if (!message) return;

  if (!activeTags.budget && isBudgetAsked) {
    budgetContext = message;
    activeTags.budget = true;
    appendMessage('系统', `已设置预算：${message}`);
    updateTags();
    input.value = '';
    return;
  }

  appendMessage('你', message);
  input.value = '';

  appendMessage('AI', '思考中...');
  const thinkingEl = document.getElementById('chat-box').lastChild;

  const reply = await askAI(message);
  if (thinkingEl) thinkingEl.remove();
  appendMessage('AI', reply);
  saveRecommendation(reply);
  updateTags();
});

document.getElementById('user-input').addEventListener('keypress', e => {
  if (e.key === 'Enter') document.getElementById('send-btn').click();
});

// ==================== 模式切换 ====================
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentMode = this.dataset.mode;
    appendMessage('系统', `已切换到「${currentMode}」推荐模式`);
  });
});

// ==================== 可折叠维度面板交互 ====================
const toggleBtn = document.getElementById('toggle-dimension-btn');
const toggleIcon = document.getElementById('toggle-icon');
const dimensionOptions = document.getElementById('dimension-options');
let panelExpanded = false;

toggleBtn.addEventListener('click', () => {
  panelExpanded = !panelExpanded;
  if (panelExpanded) {
    dimensionOptions.style.display = 'flex';
    toggleIcon.classList.add('open');
  } else {
    dimensionOptions.style.display = 'none';
    toggleIcon.classList.remove('open');
  }
});

document.querySelectorAll('.dim-option-inline').forEach(btn => {
  btn.addEventListener('click', () => {
    const dim = btn.dataset.dim;
    if (dim === 'zodiac') pickZodiac();
    else if (dim === 'mbti') pickMBTI();
    else if (dim === 'bazi') pickBazi();
    else if (dim === 'tarot') pickTarot();
  });
});

// ---- 星座 ----
const zodiacSigns = ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'];
function pickZodiac() {
  const sign = prompt(`请输入朋友的星座（${zodiacSigns.join('、')}）`);
  if (!sign) return;
  const match = zodiacSigns.find(s => s === sign.trim());
  if (match) {
    zodiacContext = match;
    activeTags.zodiac = true;
    appendMessage('系统', `已设置星座：${match}`);
    updateTags();
  } else alert('请输入正确的星座名称');
}

// ---- MBTI ----
function pickMBTI() {
  const mbti = prompt('请输入朋友的MBTI类型（如：INTJ、ENFP）');
  if (!mbti) return;
  const cleaned = mbti.trim().toUpperCase();
  if (/^[IE][NS][TF][JP]$/.test(cleaned)) {
    mbtiContext = cleaned;
    activeTags.mbti = true;
    appendMessage('系统', `已设置MBTI类型：${cleaned}`);
    updateTags();
  } else alert('MBTI格式错误，请输入4个字母（如INTJ）');
}

// ---- 生辰喜用神 ----
function analyzeBazi(month) {
  if (month >= 2 && month <= 4) return '春生木旺，建议金属性礼物（白/金）';
  if (month >= 5 && month <= 7) return '夏火炎炎，建议水属性礼物（蓝/黑）';
  if (month >= 8 && month <= 10) return '秋金肃杀，建议火属性礼物（红/紫）';
  return '冬水寒凉，建议土属性礼物（黄/棕）';
}
async function getBaziAdvice(y, m, d, h) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-bazi-advice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ year: y, month: m, day: d, hour: h })
    });
    if (!res.ok) throw new Error('生辰服务失败');
    const data = await res.json();
    return data.advice;
  } catch (err) { console.error(err); return null; }
}
async function pickBazi() {
  const yr = prompt('出生年份（如1995）'); if (!yr) return;
  const mo = prompt('出生月份（1-12）'); if (!mo) return;
  const dy = prompt('出生日期（1-31）'); if (!dy) return;
  const hr = prompt('出生时辰（0-23），默认12'); if (hr === null) return;
  const y = parseInt(yr), m = parseInt(mo), d = parseInt(dy), h = parseInt(hr || '12');
  appendMessage('系统', '正在计算生辰八字与喜用神...');
  const advice = await getBaziAdvice(y, m, d, h);
  if (advice) {
    baziContext = advice;
    activeTags.bazi = true;
    appendMessage('系统', `生辰喜用神：${advice}`);
  } else {
    baziContext = analyzeBazi(m);
    activeTags.bazi = true;
    appendMessage('系统', `生辰分析（本地）：${baziContext}`);
  }
  updateTags();
}

// ==================== 塔罗抽牌（完整交互版） ====================
const tarotCards = [
  { name: '愚者', meaning: '新的开始、冒险精神，适合旅行用品或新领域的入门装备' },
  { name: '魔术师', meaning: '创造力、技能与自信，适合DIY工具或学习课程' },
  { name: '女祭司', meaning: '直觉与内在智慧，适合书籍、日记本、冥想用品' },
  { name: '皇后', meaning: '丰饶、温暖与母性，适合美食礼盒、香薰蜡烛、柔软织物' },
  { name: '皇帝', meaning: '权威与结构，适合商务钢笔、经典腕表、办公桌摆件' },
  { name: '教皇', meaning: '传统与精神指引，适合经典文学、手写书法作品、文化藏品' },
  { name: '恋人', meaning: '爱与重要选择，适合情侣对饰、纪念相册、双人体验券' },
  { name: '战车', meaning: '行动力与胜利，适合运动装备、登山鞋、旅行背包' },
  { name: '力量', meaning: '勇气与耐心，适合健身器材、励志传记、手工锻造刀具' },
  { name: '隐士', meaning: '内省与独处，适合茶具套装、香炉、一盏温暖的台灯' },
  { name: '命运之轮', meaning: '转折与机遇，适合日历、计划本、指南针、星座摆件' },
  { name: '正义', meaning: '公正与真相，适合法律类书籍、天平摆件、定制印章' },
  { name: '倒吊人', meaning: '换个角度看世界，适合倒置油画、创意镜子、倒立装置艺术' },
  { name: '死神', meaning: '结束与新生，适合断舍离收纳箱、新阶段纪念品、凤凰图腾' },
  { name: '节制', meaning: '平衡与调和，适合调酒套装、香氛混合礼盒、瑜伽垫' },
  { name: '恶魔', meaning: '欲望与束缚，适合黑巧克力、精酿啤酒、皮质手环' },
  { name: '高塔', meaning: '颠覆与重建，适合积木模型、拼图、解构风格装饰品' },
  { name: '星星', meaning: '希望与灵感，适合天文望远镜、星空投影灯、许愿瓶' },
  { name: '月亮', meaning: '梦境与潜意识，适合睡眠眼罩、梦境记录本、月光石饰品' },
  { name: '太阳', meaning: '喜悦与生命力，适合向日葵花束、亮色运动鞋、户外野餐套装' },
  { name: '审判', meaning: '觉醒与召唤，适合音乐盒、复古黑胶唱片、定制铃声' },
  { name: '世界', meaning: '圆满与完成，适合世界地图、环球旅行画册、地球仪' }
];

let drawnCards = [];
let allCardsShuffled = [];
const TOTAL_DRAW = 3;

function openTarotModal() {
  drawnCards = [];
  allCardsShuffled = shuffleArray([...tarotCards]);
  document.getElementById('tarot-instruction').textContent = '请点击牌背，抽取你的第一张牌';
  document.getElementById('tarot-progress').textContent = '已抽取：0 / 3';
  document.getElementById('tarot-confirm-btn').disabled = true;
  document.getElementById('tarot-result-area').style.display = 'none';
  document.getElementById('tarot-drawn-cards').innerHTML = '';
  document.getElementById('tarot-interpretation').innerHTML = '';
  document.getElementById('tarot-interpretation').style.display = 'none';
  renderTarotGrid();
  document.getElementById('tarot-modal').style.display = 'flex';
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderTarotGrid() {
  const grid = document.getElementById('tarot-grid');
  grid.innerHTML = '';
  allCardsShuffled.forEach((card, index) => {
    const cardBack = document.createElement('div');
    cardBack.className = 'tarot-card-back';
    cardBack.dataset.index = index;
    cardBack.textContent = '✦';
    cardBack.addEventListener('click', () => drawCard(index, cardBack));
    grid.appendChild(cardBack);
  });
}

function drawCard(index, cardElement) {
  if (drawnCards.length >= TOTAL_DRAW) return;
  if (cardElement.classList.contains('drawn')) return;
  cardElement.classList.add('drawn');
  const card = allCardsShuffled[index];
  drawnCards.push(card);
  document.getElementById('tarot-progress').textContent = `已抽取：${drawnCards.length} / ${TOTAL_DRAW}`;
  if (drawnCards.length === 1) document.getElementById('tarot-instruction').textContent = '请点击牌背，抽取你的第二张牌';
  else if (drawnCards.length === 2) document.getElementById('tarot-instruction').textContent = '最后一张！请抽取你的第三张牌';
  updateDrawnCardsDisplay();
  if (drawnCards.length === TOTAL_DRAW) {
    document.getElementById('tarot-instruction').textContent = '三张牌已抽取完毕！';
    generateInterpretation();
    document.getElementById('tarot-confirm-btn').disabled = false;
    document.getElementById('tarot-result-area').style.display = 'block';
  }
}

function updateDrawnCardsDisplay() {
  const container = document.getElementById('tarot-drawn-cards');
  container.innerHTML = '';
  drawnCards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = 'tarot-drawn-card';
    cardEl.innerHTML = `<div class="card-name">${card.name}</div><div class="card-meaning">${card.meaning}</div>`;
    container.appendChild(cardEl);
  });
}

function generateInterpretation() {
  const interpretationDiv = document.getElementById('tarot-interpretation');
  interpretationDiv.style.display = 'block';
  const cardNames = drawnCards.map(c => c.name).join('、');
  const allMeanings = drawnCards.map(c => c.meaning).join('；');
  const giftKeywords = drawnCards.map(c => c.meaning.split('，')[0].replace('适合', '')).join('、');
  interpretationDiv.innerHTML = `
    <h4>🔮 三牌综合解析</h4>
    <p>你抽取的三张牌分别是：<strong>${cardNames}</strong>。</p>
    <p>这三张牌组合在一起，揭示收礼人当前的能量状态和深层需求：</p>
    <p>${allMeanings}</p>
    <p><strong>🎁 礼物方向建议：</strong>综合三张牌的启示，礼物的核心应围绕「${giftKeywords}」这几个主题展开。</p>
    <p style="color: #c9a9ff; margin-top: 10px;">✨ 请点击下方按钮，将这份塔罗启示传递给礼物顾问，获取更具体的礼物推荐。</p>
  `;
}

function confirmTarotResult() {
  if (drawnCards.length !== TOTAL_DRAW) return;
  const cardNames = drawnCards.map(c => c.name).join('、');
  const allMeanings = drawnCards.map(c => `「${c.name}」：${c.meaning}`).join('；');
  tarotContext = `塔罗三牌启示：${cardNames}。综合含义：${allMeanings}`;
  activeTags.tarot = true;
  appendMessage('系统', `✨ 塔罗三牌抽取完成！\n你抽到了：${cardNames}\n\n综合解析：${allMeanings}\n\n这份启示已传递给礼物顾问，你可以继续提问获取具体礼物推荐。`);
  closeTarotModal();
  updateTags();
}

function closeTarotModal() {
  document.getElementById('tarot-modal').style.display = 'none';
}

document.getElementById('tarot-confirm-btn').addEventListener('click', confirmTarotResult);
document.getElementById('tarot-cancel-btn').addEventListener('click', () => {
  if (drawnCards.length > 0 && drawnCards.length < TOTAL_DRAW) {
    if (!confirm(`你已经抽取了${drawnCards.length}张牌，还没有完成3张抽取。确定离开吗？`)) return;
  }
  closeTarotModal();
});

function pickTarot() {
  openTarotModal();
}

// ==================== 保存推荐到 Supabase ====================
async function saveRecommendation(result) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('reccomendations').insert([{ user_id: user.id, gift_result: result }]);
}

// ==================== 注册 Service Worker ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.error('SW failed', err));
  });
}